/**
 * @file main.c
 * @brief MCU #1: Sat A CubeSat Flight Computer & Edge AI Payload
 * @target ESP32-WROOM-32 / ESP32-S3 (ESP-IDF / Arduino compatible)
 * 
 * Hardware Connections:
 * - GPIO 4:  Motor PWM Drive (20 kHz LEDC, Low-side MOSFET / L298N / TB6612)
 * - GPIO 32: LM393 20-Slot Optical Sensor Pulse Counter (PCNT hardware unit)
 * - GPIO 21: INA219 / INA226 I2C SDA (400 kHz Fast-Mode)
 * - GPIO 22: INA219 / INA226 I2C SCL (400 kHz Fast-Mode)
 * - GPIO 23: ADXL345 Radial IMU SPI MOSI
 * - GPIO 19: ADXL345 Radial IMU SPI MISO
 * - GPIO 18: ADXL345 Radial IMU SPI SCK
 * - GPIO 5:  ADXL345 Radial IMU SPI CS
 * - GPIO 34: ADXL345 FIFO Watermark INT1
 * - GPIO 16: Stage Profiler Bus Bit 0 Output (to MCU #2 GPIO 32)
 * - GPIO 17: Stage Profiler Bus Bit 1 Output (to MCU #2 GPIO 33)
 * - GPIO 35: 1 Hz PPS Sync Pulse Input (from MCU #2 GPIO 27)
 * - GPIO 33: F3 Virtual Harness Ohmic Drop Input (from MCU #2 GPIO 26)
 * - ESP-NOW: 2.4 GHz Low-Latency Wireless Uplink to MCU #2
 */

#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>
#include <math.h>

#include "../include/telemetry_packets.h"
#include "../include/crc16.h"

#ifdef ESP_PLATFORM
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/ledc.h"
#include "driver/pcnt.h"
#include "driver/i2c.h"
#include "driver/spi_master.h"
#include "esp_now.h"
#include "esp_wifi.h"
#include "esp_timer.h"
#endif

#define PIN_MOTOR_PWM       4
#define PIN_OPTICAL_PCNT    32
#define PIN_STAGE_B0        16
#define PIN_STAGE_B1        17
#define PIN_PPS_IN          35
#define PIN_F3_IN           33

/* Stage Profiler States */
#define STAGE_IDLE          0x00
#define STAGE_DSP           0x01
#define STAGE_NN            0x02
#define STAGE_RADIO         0x03

static inline void set_stage_profile(uint8_t stage) {
#ifdef ESP_PLATFORM
    gpio_set_level(PIN_STAGE_B0, stage & 0x01);
    gpio_set_level(PIN_STAGE_B1, (stage >> 1) & 0x01);
#endif
}

/* 1-D Kalman Filter Speed Observer State */
typedef struct {
    float x; // State: estimated RPM
    float p; // Covariance
    float q; // Process noise
    float r; // Measurement noise
} kalman_speed_t;

static kalman_speed_t s_kalman = { .x = 200.0f, .p = 1.0f, .q = 0.05f, .r = 2.0f };

static float kalman_update(kalman_speed_t *k, float z) {
    k->p += k->q;
    float gain = k->p / (k->p + k->r);
    k->x += gain * (z - k->x);
    k->p *= (1.0f - gain);
    return k->x;
}

/* PI Speed Controller */
static float s_target_rpm = 200.0f;
static float s_pi_integral = 0.0f;
static const float Kp = 0.08f;
static const float Ki = 0.015f;

/* Broadcaster to MCU #2 */
static uint8_t s_mcu2_mac[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}; // Broadcast or paired MAC

void send_ccsds_packet(const uint8_t *pkt, size_t len) {
    set_stage_profile(STAGE_RADIO);
#ifdef ESP_PLATFORM
    esp_now_send(s_mcu2_mac, pkt, len);
#endif
    set_stage_profile(STAGE_IDLE);
}

void app_main(void) {
    printf("[MCU1] FedSpace-Mini v2 Sat A Flight Computer Initialized\n");

#ifdef ESP_PLATFORM
    // 1. Stage Profiler GPIOs
    gpio_set_direction(PIN_STAGE_B0, GPIO_MODE_OUTPUT);
    gpio_set_direction(PIN_STAGE_B1, GPIO_MODE_OUTPUT);
    set_stage_profile(STAGE_IDLE);

    // 2. F3 & PPS Inputs
    gpio_set_direction(PIN_F3_IN, GPIO_MODE_INPUT);
    gpio_set_direction(PIN_PPS_IN, GPIO_MODE_INPUT);

    // 3. Motor PWM setup (20 kHz, 10-bit resolution)
    ledc_timer_config_t ledc_timer = {
        .speed_mode       = LEDC_LOW_SPEED_MODE,
        .timer_num        = LEDC_TIMER_0,
        .duty_resolution  = LEDC_TIMER_10_BIT,
        .freq_hz          = 20000,
        .clk_cfg          = LEDC_AUTO_CLK
    };
    ledc_timer_config(&ledc_timer);
    ledc_channel_config_t ledc_channel = {
        .speed_mode     = LEDC_LOW_SPEED_MODE,
        .channel        = LEDC_CHANNEL_0,
        .timer_sel      = LEDC_TIMER_0,
        .intr_type      = LEDC_INTR_DISABLE,
        .gpio_num       = PIN_MOTOR_PWM,
        .duty           = 0,
        .hpoint         = 0
    };
    ledc_channel_config(&ledc_channel);

    // 4. Optical PCNT setup
    pcnt_config_t pcnt_config = {
        .pulse_gpio_num = PIN_OPTICAL_PCNT,
        .ctrl_gpio_num = -1,
        .channel = PCNT_CHANNEL_0,
        .unit = PCNT_UNIT_0,
        .pos_mode = PCNT_COUNT_INC,
        .neg_mode = PCNT_COUNT_DIS,
        .lctrl_mode = PCNT_MODE_KEEP,
        .hctrl_mode = PCNT_MODE_KEEP,
        .counter_h_lim = 32767,
        .counter_l_lim = 0
    };
    pcnt_unit_config(&pcnt_config);
    pcnt_counter_pause(PCNT_UNIT_0);
    pcnt_counter_clear(PCNT_UNIT_0);
    pcnt_counter_resume(PCNT_UNIT_0);

    // 5. ESP-NOW setup
    nvs_flash_init();
    esp_netif_init();
    esp_event_loop_create_default();
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);
    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_start();
    esp_now_init();
    esp_now_peer_info_t peer_info = {};
    memcpy(peer_info.peer_addr, s_mcu2_mac, 6);
    peer_info.channel = 0;
    peer_info.encrypt = false;
    esp_now_add_peer(&peer_info);
#endif

    uint32_t t_ms = 0;
    int16_t last_pcnt = 0;

    while (1) {
#ifdef ESP_PLATFORM
        vTaskDelay(pdMS_TO_TICKS(10)); // 100 Hz control tick
#endif
        t_ms += 10;

        // 1. Read PCNT optical sensor speed
        int16_t current_pcnt = 0;
#ifdef ESP_PLATFORM
        pcnt_get_counter_value(PCNT_UNIT_0, &current_pcnt);
#endif
        int16_t d_slots = current_pcnt - last_pcnt;
        if (d_slots < 0) d_slots += 32767;
        last_pcnt = current_pcnt;

        // RPM = (slots / 20) * (1000 / 10ms) * 60s
        float raw_rpm = ((float)d_slots / 20.0f) * 100.0f * 60.0f;
        float est_rpm = kalman_update(&s_kalman, raw_rpm);

        // 2. PI Speed Controller with F3 Virtual Harness Compensation
        bool f3_active = false;
#ifdef ESP_PLATFORM
        f3_active = (gpio_get_level(PIN_F3_IN) == 1);
#endif
        float err = s_target_rpm - est_rpm;
        s_pi_integral += err * 0.01f;
        if (s_pi_integral > 50.0f) s_pi_integral = 50.0f;
        if (s_pi_integral < -50.0f) s_pi_integral = -50.0f;

        float u = (Kp * err) + (Ki * s_pi_integral);
        if (f3_active) {
            // Emulate voltage droop caused by ohmic harness resistance
            u *= 0.72f; 
        }

        if (u < 0.0f) u = 0.0f;
        if (u > 1.0f) u = 1.0f;

#ifdef ESP_PLATFORM
        uint32_t duty = (uint32_t)(u * 1023.0f);
        ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty);
        ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
#endif

        // 3. Assemble & Transmit 1.0 Hz CCSDS Housekeeping Packet (APID 0x10, 28 bytes)
        if (t_ms % 1000 == 0) {
            ccsds_hk_packet_t hk;
            hk.pri_hdr.packet_id = CCSDS_MAKE_PACKET_ID(APID_HOUSEKEEPING);
            hk.pri_hdr.packet_seq_ctrl = CCSDS_MAKE_SEQ_CTRL(t_ms / 1000);
            hk.pri_hdr.packet_data_len = sizeof(ccsds_hk_packet_t) - sizeof(ccsds_primary_hdr_t) - 1;

            hk.t_ms = t_ms;
            hk.rpm_kalman = (uint16_t)est_rpm;
            hk.rpm_setpoint = (uint16_t)s_target_rpm;
            hk.current_mA = 145 + (int16_t)(u * 120.0f);
            hk.vbus_mV = f3_active ? 4420 : 5040;
            hk.pwm_duty_q15 = (uint16_t)(u * 32767.0f);
            hk.temp_est_c_q8 = (int16_t)(25.4f * 256.0f);
            hk.pcnt_raw = (uint16_t)current_pcnt;
            hk.flags = f3_active ? 0x0001 : 0x0000;

            // CRC-16 over all bytes preceding the crc field
            hk.crc16 = crc16_ccitt((const uint8_t *)&hk, sizeof(ccsds_hk_packet_t) - 2);

            send_ccsds_packet((const uint8_t *)&hk, sizeof(hk));
        }

        // 4. Edge AI 1-Hop Decision Window (DSP + NN stages)
        if (t_ms % 1000 == 500) {
            set_stage_profile(STAGE_DSP);
            // Simulated 1024-pt FFT / Synchronous 1x Phasor Runout Subtraction (Takes ~40ms on ESP32)
#ifdef ESP_PLATFORM
            vTaskDelay(pdMS_TO_TICKS(40));
#endif
            set_stage_profile(STAGE_NN);
            // Simulated INT8 Autoencoder Inference (Takes ~28ms on ESP32 Core 1)
#ifdef ESP_PLATFORM
            vTaskDelay(pdMS_TO_TICKS(28));
#endif
            set_stage_profile(STAGE_IDLE);
        }
    }
}

