/**
 * @file cobs.c
 * @brief Zero-overhead COBS Encoder / Decoder implementation
 */

#include "cobs.h"

size_t cobs_encode(uint8_t *dst, const uint8_t *src, size_t src_len) {
    size_t read_idx = 0;
    size_t write_idx = 1;
    size_t code_idx = 0;
    uint8_t code = 1;

    while (read_idx < src_len) {
        if (src[read_idx] == 0) {
            dst[code_idx] = code;
            code_idx = write_idx++;
            code = 1;
            read_idx++;
        } else {
            dst[write_idx++] = src[read_idx++];
            code++;
            if (code == 0xFF) {
                dst[code_idx] = code;
                code_idx = write_idx++;
                code = 1;
            }
        }
    }

    dst[code_idx] = code;
    return write_idx;
}

size_t cobs_decode(uint8_t *dst, const uint8_t *src, size_t src_len) {
    size_t read_idx = 0;
    size_t write_idx = 0;
    uint8_t code = 0xFF;

    while (read_idx < src_len) {
        code = src[read_idx++];
        if (code == 0) {
            return 0; // Malformed packet
        }

        for (uint8_t i = 1; i < code; i++) {
            if (read_idx >= src_len) {
                break;
            }
            dst[write_idx++] = src[read_idx++];
        }

        if (code < 0xFF && read_idx < src_len) {
            dst[write_idx++] = 0;
        }
    }

    return write_idx;
}

