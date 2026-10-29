/**
 * @file main.c
 * @brief MCU #2: EGSE Controller, Stage Profiler & ISL Relay Firmware
 * @target ESP32-WROOM-32 / ESP32-S3 (ESP-IDF / Arduino compatible)
 * 
 * Hardware Connections:
 * - USB-UART: UART0 @ 921,600 Baud (Direct connection to Ground Station PC)
 * - GPIO 27: 1 Hz PPS Pulse Generator Output (to MCU #1 GPIO 35)
 * - GPIO 32: Stage Profiler Bit 0 Input (from MCU #1 GPIO 16, Interrupt on Edge)
 * - GPIO 33: Stage Profiler Bit 1 Input (from MCU #1 GPIO 17, Interrupt on Edge)
 * - GPIO 25: SG90 Servo PWM Output (50 Hz, 1000us - 2000us for Friction L0-L3)
 * - GPIO 26: F3 Virtual Harness Trigger Output (to MCU #1 GPIO 33)
 * - ESP-NOW: 2.4 GHz Low-Latency Wireless Link (Receives CCSDS Packets from MCU #1)
 */

#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>

#include "../include/telemetry_packets.h"
#include "../include/cobs.h"
#include "../include/crc16.h"

/* In ESP-IDF environment, these headers are standard */
#ifdef ESP_PLATFORM
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "driver/gpio.h"
#include "driver/uart.h"
#include "driver/ledc.h"
#include "esp_now.h"
#include "esp_wifi.h"
#include "esp_timer.h"
#endif

#define UART_BAUD_RATE      921600
#define PIN_PPS_OUT         27
#define PIN_STAGE_B0        32
#define PIN_STAGE_B1        33
#define PIN_SERVO_PWM       25
#define PIN_F3_TRIGGER      26

/* Profiler State Durations in Microseconds */
static volatile uint32_t s_last_edge_us = 0;
static volatile uint8_t  s_current_stage = 0;
static volatile uint32_t s_stage_durations_us[4] = {0, 0, 0, 0}; // 0: Idle, 1: DSP, 2: NN, 3: Radio

/* EGSE Active State */
static uint8_t  s_active_fault_id = 0;
static uint8_t  s_active_severity = 0;
static uint16_t s_servo_pwm_us    = 1000;
static uint8_t  s_f3_pin_state    = 0;
static uint32_t s_hop_counter     = 0;

/* Transmit Buffer for COBS Framing */
static uint8_t s_raw_frame_buf[512];
static uint8_t s_cobs_wire_buf[550];

/**
 * @brief Helper to write COBS frame to UART0 with 0x00 delimiter
 */
void uart_write_cobs_frame(uint8_t stream_id, const uint8_t *payload, size_t payload_len) {
    s_raw_frame_buf[0] = stream_id;
    memcpy(&s_raw_frame_buf[1], payload, payload_len);

    size_t cobs_len = cobs_encode(s_cobs_wire_buf, s_raw_frame_buf, payload_len + 1);
    s_cobs_wire_buf[cobs_len] = 0x00; // Zero byte delimiter

#ifdef ESP_PLATFORM
    uart_write_bytes(UART_NUM_0, (const char *)s_cobs_wire_buf, cobs_len + 1);
#else
    // Simulation / Native fallback
    fwrite(s_cobs_wire_buf, 1, cobs_len + 1, stdout);
    fflush(stdout);
#endif
}

/**
 * @brief 1us Stage Profiler GPIO ISR Handler
 */
#ifdef ESP_PLATFORM
static void IRAM_ATTR stage_pin_isr_handler(void* arg) {
    uint32_t now_us = (uint32_t)esp_timer_get_time();
    uint32_t dt = now_us - s_last_edge_us;
    s_last_edge_us = now_us;

    if (s_current_stage < 4) {
        s_stage_durations_us[s_current_stage] += dt;
    }

    uint8_t b0 = gpio_get_level(PIN_STAGE_B0);
    uint8_t b1 = gpio_get_level(PIN_STAGE_B1);
    s_current_stage = (b1 << 1) | b0;
}
#endif

/**
 * @brief ESP-NOW Callback: Handles incoming wireless CCSDS packets from Sat A
 */
#ifdef ESP_PLATFORM
static void on_esp_now_recv(const esp_now_recv_info_t *recv_info, const uint8_t *data, int len) {
    if (len > 0 && len <= sizeof(s_raw_frame_buf) - 2) {
        // Forward as Stream 0x01
        uart_write_cobs_frame(STREAM_ID_CCSDS_FORWARD, data, (size_t)len);
    }
}
#endif

/**
 * @brief EGSE Actuation Functions
 */
void egse_set_friction_level(uint8_t level) {
    s_active_severity = level;
    s_active_fault_id = (level > 0) ? 2 : 0; // F2 Friction Fault

    switch (level) {
        case 1: s_servo_pwm_us = 1350; break; // Light touch
        case 2: s_servo_pwm_us = 1550; break; // Medium contact
        case 3: s_servo_pwm_us = 1800; break; // Heavy stall pressure
        default: s_servo_pwm_us = 1000; break; // Retracted / Disengaged
    }

#ifdef ESP_PLATFORM
    uint32_t duty = (s_servo_pwm_us * 8192) / 20000;
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
#endif
}

void egse_set_virtual_harness(uint8_t enable) {
    s_f3_pin_state = enable ? 1 : 0;
    if (enable) s_active_fault_id = 3; // F3 Ohmic Drop
    else if (s_active_fault_id == 3) s_active_fault_id = 0;

#ifdef ESP_PLATFORM
    gpio_set_level(PIN_F3_TRIGGER, s_f3_pin_state);
#endif
}

/**
 * @brief Main Periodic Task (1 Hz PPS, Profiler Emit, Ground Truth)
 */
void app_main(void) {
    printf("[MCU2] FedSpace-Mini v2 EGSE & ISL Relay Node Initialized @ %d Baud\n", UART_BAUD_RATE);

#ifdef ESP_PLATFORM
    // 1. Configure UART0
    uart_config_t uart_config = {
        .baud_rate = UART_BAUD_RATE,
        .data_bits = UART_DATA_8_BITS,
        .parity    = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE
    };
    uart_param_config(UART_NUM_0, &uart_config);
    uart_driver_install(UART_NUM_0, 2048, 2048, 0, NULL, 0);

    // 2. Configure Stage Profiler GPIOs with ISR
    gpio_config_t io_conf = {
        .intr_type = GPIO_INTR_ANYEDGE,
        .mode = GPIO_MODE_INPUT,
        .pin_bit_mask = (1ULL << PIN_STAGE_B0) | (1ULL << PIN_STAGE_B1),
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .pull_up_en = GPIO_PULLUP_DISABLE
    };
    gpio_config(&io_conf);
    gpio_install_isr_service(0);
    gpio_isr_handler_add(PIN_STAGE_B0, stage_pin_isr_handler, NULL);
    gpio_isr_handler_add(PIN_STAGE_B1, stage_pin_isr_handler, NULL);

    // 3. Configure PPS & F3 Outputs
    gpio_set_direction(PIN_PPS_OUT, GPIO_MODE_OUTPUT);
    gpio_set_direction(PIN_F3_TRIGGER, GPIO_MODE_OUTPUT);
    gpio_set_level(PIN_PPS_OUT, 0);
    gpio_set_level(PIN_F3_TRIGGER, 0);

    // 4. Configure SG90 Servo PWM (50 Hz)
    ledc_timer_config_t ledc_timer = {
        .speed_mode       = LEDC_LOW_SPEED_MODE,
        .timer_num        = LEDC_TIMER_0,
        .duty_resolution  = LEDC_TIMER_13_BIT,
        .freq_hz          = 50,
        .clk_cfg          = LEDC_AUTO_CLK
    };
    ledc_timer_config(&ledc_timer);
    ledc_channel_config_t ledc_channel = {
        .speed_mode     = LEDC_LOW_SPEED_MODE,
        .channel        = LEDC_CHANNEL_0,
        .timer_sel      = LEDC_TIMER_0,
        .intr_type      = LEDC_INTR_DISABLE,
        .gpio_num       = PIN_SERVO_PWM,
        .duty           = (1000 * 8192) / 20000,
        .hpoint         = 0
    };
    ledc_channel_config(&ledc_channel);

    // 5. Initialize Wi-Fi & ESP-NOW
    nvs_flash_init();
    esp_netif_init();
    esp_event_loop_create_default();
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);
    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_start();
    esp_now_init();
    esp_now_register_recv_cb(on_esp_now_recv);
#endif

    uint32_t loop_ms = 0;
    while (1) {
#ifdef ESP_PLATFORM
        vTaskDelay(pdMS_TO_TICKS(10));
#endif
        loop_ms += 10;

        // 1. Generate 1 Hz PPS Pulse (50ms high)
        if (loop_ms % 1000 == 0) {
#ifdef ESP_PLATFORM
            gpio_set_level(PIN_PPS_OUT, 1);
#endif
            // Emit Stage Profiler Packet (Stream 0x02)
            cobs_stage_profiler_packet_t prof;
            prof.hop_id = ++s_hop_counter;
            prof.dt_idle_us = s_stage_durations_us[0];
            prof.dt_dsp_us = s_stage_durations_us[1];
            prof.dt_nn_us = s_stage_durations_us[2];
            prof.dt_radio_us = s_stage_durations_us[3];
            prof.ina_mean_mW = 380; // Calibrated ESP32 average power

            uart_write_cobs_frame(STREAM_ID_STAGE_PROFILER, (const uint8_t *)&prof, sizeof(prof));

            // Reset stage accumulators
            s_stage_durations_us[0] = 0;
            s_stage_durations_us[1] = 0;
            s_stage_durations_us[2] = 0;
            s_stage_durations_us[3] = 0;

            // Emit EGSE Ground Truth Packet (Stream 0x03)
            cobs_egse_ground_truth_packet_t egse;
            egse.pps_ms = loop_ms;
            egse.active_fault_id = s_active_fault_id;
            egse.severity_lvl = s_active_severity;
            egse.servo_pwm_us = s_servo_pwm_us;
            egse.f3_pin_state = s_f3_pin_state;

            uart_write_cobs_frame(STREAM_ID_EGSE_LABELS, (const uint8_t *)&egse, sizeof(egse));
        }

        if (loop_ms % 1000 == 50) {
#ifdef ESP_PLATFORM
            gpio_set_level(PIN_PPS_OUT, 0); // End PPS pulse
#endif
        }

        // 2. Poll Host Commands from UART0 (Stream 0x80)
#ifdef ESP_PLATFORM
        uint8_t rx_byte;
        if (uart_read_bytes(UART_NUM_0, &rx_byte, 1, 0) > 0) {
            // Host command processor
            if (rx_byte == 0x81) egse_set_friction_level(1);
            else if (rx_byte == 0x82) egse_set_friction_level(2);
            else if (rx_byte == 0x83) egse_set_friction_level(3);
            else if (rx_byte == 0x80) egse_set_friction_level(0);
            else if (rx_byte == 0x91) egse_set_virtual_harness(1);
            else if (rx_byte == 0x90) egse_set_virtual_harness(0);
        }
#endif
    }
}

