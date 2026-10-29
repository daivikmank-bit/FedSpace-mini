/**
 * @file telemetry_packets.h
 * @brief FedSpace-Mini v2 CCSDS & COBS Multiplexed Packet Structures
 * @version 2.0.0
 * 
 * Complies with FedSpace-Mini PRD Interface Control Document (ICD).
 * All structs are strictly packed (byte-aligned) for direct binary serialization.
 */

#ifndef TELEMETRY_PACKETS_H
#define TELEMETRY_PACKETS_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#pragma pack(push, 1)

/* ========================================================================= */
/* 1. CCSDS Telemetry Header (6 Bytes Primary + 4 Bytes Secondary Timestamp) */
/* ========================================================================= */

/**
 * @brief CCSDS-style 6-byte Primary Packet Header
 */
typedef struct {
    uint16_t packet_id;        /**< [15:13] Version=0, [12] Type=0 (TM), [11] SecHdr=1, [10:0] APID */
    uint16_t packet_seq_ctrl;  /**< [15:14] SeqFlags=3 (Unsegmented), [13:0] Sequence Count */
    uint16_t packet_data_len;  /**< Packet data length = (Total secondary header + payload length) - 1 */
} ccsds_primary_hdr_t;

/* CCSDS Helper Macros */
#define CCSDS_MAKE_PACKET_ID(apid)      ((uint16_t)(0x0800 | ((apid) & 0x07FF)))
#define CCSDS_GET_APID(packet_id)       ((uint16_t)((packet_id) & 0x07FF))
#define CCSDS_MAKE_SEQ_CTRL(seq)        ((uint16_t)(0xC000 | ((seq) & 0x3FFF)))

/* APID Definitions */
#define APID_HOUSEKEEPING   0x10  /**< APID 0x10: 1.0 Hz Housekeeping Telemetry */
#define APID_HEALTH_DIGEST  0x11  /**< APID 0x11: 1/60 Hz Low-Rate Orbit Digest */
#define APID_FDIR_EVENT     0x12  /**< APID 0x12: Asynchronous Fault Detection & Recovery Event */
#define APID_RAW_VIB_BURST  0x13  /**< APID 0x13: 1.6 kHz Raw IMU Vibration Burst (P0 Policy) */

/* ========================================================================= */
/* 2. CCSDS Telemetry Packets (Sat A -> MCU #2 -> Laptop)                    */
/* ========================================================================= */

/**
 * @brief APID 0x10: Housekeeping Packet (Total: 28 Bytes)
 * Transmitted at 1.0 Hz under Policy P1 (or 10.0 Hz under testing)
 */
typedef struct {
    ccsds_primary_hdr_t pri_hdr;   /**< 6 bytes CCSDS Primary Header (APID 0x10) */
    uint32_t t_ms;                 /**< 4 bytes PPS-aligned millisecond timestamp */
    uint16_t rpm_kalman;           /**< 2 bytes 1-D Kalman filter speed estimate [RPM] */
    uint16_t rpm_setpoint;         /**< 2 bytes Target PI speed setpoint [RPM] */
    int16_t  current_mA;           /**< 2 bytes Motor DC current [mA] */
    uint16_t vbus_mV;              /**< 2 bytes Bus voltage [mV] */
    uint16_t pwm_duty_q15;         /**< 2 bytes LEDC Motor PWM duty in Q15 format [0..32767] */
    int16_t  temp_est_c_q8;        /**< 2 bytes Lumped thermal observer temperature in Q8 [°C * 256] */
    uint16_t pcnt_raw;             /**< 2 bytes LM393 optical slot counter accumulator */
    uint16_t flags;                /**< 2 bytes Bitmask: [0]=FDIR Alert, [1]=L0 Trip, [2]=PPS Synced */
    uint16_t crc16;                /**< 2 bytes CRC-16-CCITT (computed over preceding 26 bytes) */
} ccsds_hk_packet_t;

/**
 * @brief APID 0x11: Health Digest Packet (Total: 40 Bytes)
 * Transmitted at 1/60 Hz under Policy P2 during out-of-pass orbits
 */
typedef struct {
    ccsds_primary_hdr_t pri_hdr;   /**< 6 bytes CCSDS Primary Header (APID 0x11) */
    uint32_t t_ms;                 /**< 4 bytes Timestamp */
    uint16_t rpm_min, rpm_mean, rpm_max;       /**< 6 bytes RPM window summary */
    int16_t  curr_min, curr_mean, curr_max;    /**< 6 bytes Current window summary [mA] */
    uint16_t pwm_min, pwm_mean, pwm_max;       /**< 6 bytes PWM duty summary */
    uint16_t max_score_q8;         /**< 2 bytes Max whitened anomaly score S_t in Q8 */
    uint16_t e1x_mean_q8;          /**< 2 bytes Mean synchronous 1x residual in Q8 */
    uint32_t hop_count;            /**< 4 bytes Total Edge AI inference hops elapsed */
    uint16_t fdir_state;           /**< 2 bytes Current FDIR state machine enumeration */
    uint16_t crc16;                /**< 2 bytes CRC-16-CCITT */
} ccsds_digest_packet_t;

/**
 * @brief APID 0x12: FDIR Fault Event Packet (Total: 26 Bytes)
 * Emitted immediately upon persistent alarm (3-of-5 consecutive hops) or recovery
 */
typedef struct {
    ccsds_primary_hdr_t pri_hdr;   /**< 6 bytes CCSDS Primary Header (APID 0x12) */
    uint32_t t_ms;                 /**< 4 bytes Fault onset timestamp */
    uint8_t  event_kind;           /**< 1 byte: 1=Alarm Raised, 2=Alarm Cleared, 3=L0 Trip */
    uint8_t  fault_class_iso;      /**< 1 byte: 0=Nominal, 1=F1 (Mass), 2=F2 (Friction), 3=F3 (Harness) */
    uint16_t score_q8;             /**< 2 bytes Whitened anomaly score S_t in Q8 */
    uint16_t rpm;                  /**< 2 bytes RPM at moment of detection */
    uint8_t  top_idx[4];           /**< 4 bytes Top-4 feature indices driving anomaly */
    int8_t   top_res[4];           /**< 4 bytes Top-4 normalized residual contributions */
    uint16_t crc16;                /**< 2 bytes CRC-16-CCITT */
} ccsds_fdir_event_packet_t;

/**
 * @brief APID 0x13: Raw High-Rate IMU Vibration Burst Packet (Total: Up to 250 Bytes)
 */
typedef struct {
    ccsds_primary_hdr_t pri_hdr;   /**< 6 bytes CCSDS Primary Header (APID 0x13) */
    uint32_t t_ms;                 /**< 4 bytes Burst start timestamp */
    uint16_t chunk_seq;            /**< 2 bytes Sequence counter */
    uint16_t sample_rate;          /**< 2 bytes IMU sample rate (nominal: 1600 Hz) */
    int16_t  ax_ay_samples[56];    /**< 112 bytes Interleaved ADXL345 ax, ay samples */
    uint16_t crc16;                /**< 2 bytes CRC-16-CCITT */
} ccsds_raw_vib_packet_t;

/* ========================================================================= */
/* 3. COBS Multiplexed USB Stream Formats (MCU #2 -> Laptop Ground Station)  */
/* ========================================================================= */

/* Stream ID Prefixes */
#define STREAM_ID_CCSDS_FORWARD     0x01  /**< Forwarded Sat A CCSDS Telemetry */
#define STREAM_ID_STAGE_PROFILER    0x02  /**< MCU #2 Microsecond Stage Durations */
#define STREAM_ID_EGSE_LABELS       0x03  /**< MCU #2 EGSE Ground Truth Status */
#define STREAM_ID_HOST_COMMAND      0x80  /**< Laptop -> EGSE Command Packet */

/**
 * @brief Stream 0x02: MCU #2 Stage Profiler Packet (Total: 22 Bytes Payload)
 * Measured via hardware edge-capture ISRs on GPIO 32/33
 */
typedef struct {
    uint32_t hop_id;               /**< 4 bytes Monotonic 1.0s hop identifier */
    uint32_t dt_idle_us;           /**< 4 bytes Duration in IDLE state [microseconds] */
    uint32_t dt_dsp_us;            /**< 4 bytes Duration in DSP / FFT state [microseconds] */
    uint32_t dt_nn_us;             /**< 4 bytes Duration in Neural Network inference [microseconds] */
    uint32_t dt_radio_us;          /**< 4 bytes Duration in ESP-NOW / Radio transmission [microseconds] */
    uint16_t ina_mean_mW;          /**< 2 bytes Calibrated mean board power consumption [mW] */
} cobs_stage_profiler_packet_t;

/**
 * @brief Stream 0x03: MCU #2 EGSE Ground-Truth Label Packet (Total: 9 Bytes Payload)
 */
typedef struct {
    uint32_t pps_ms;               /**< 4 bytes 1Hz PPS-aligned millisecond time */
    uint8_t  active_fault_id;      /**< 1 byte: 0=Nominal, 1=F1 (Clip), 2=F2 (Friction), 3=F3 (Harness) */
    uint8_t  severity_lvl;         /**< 1 byte: Severity level 0..3 */
    uint16_t servo_pwm_us;         /**< 2 bytes SG90 servo pulse width [microseconds] */
    uint8_t  f3_pin_state;         /**< 1 byte: GPIO 26 state (0=Open, 1=Virtual Ohmic drop active) */
} cobs_egse_ground_truth_packet_t;

/**
 * @brief Stream 0x80: Laptop Host-to-EGSE Command Packet (Total: 8 Bytes Payload)
 */
typedef struct {
    uint8_t  cmd_type;             /**< 1 byte: 1=Set Friction, 2=Toggle F3, 3=Pass Open/Close, 4=Set Target RPM */
    uint8_t  param_u8;             /**< 1 byte generic parameter */
    uint16_t param_u16;            /**< 2 bytes generic parameter (e.g., servo angle or target RPM) */
    uint32_t timestamp_ms;         /**< 4 bytes Command issue timestamp */
} cobs_host_command_packet_t;

#pragma pack(pop)

#ifdef __cplusplus
}
#endif

#endif /* TELEMETRY_PACKETS_H */

