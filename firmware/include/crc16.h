/**
 * @file crc16.h
 * @brief CRC-16-CCITT Header (Polynomial 0x1021, Initial 0xFFFF)
 */

#ifndef CRC16_H
#define CRC16_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Computes 16-bit CRC-CCITT over a buffer.
 * 
 * @param data Pointer to input byte array.
 * @param length Number of bytes to compute CRC over.
 * @return uint16_t Calculated 16-bit CRC.
 */
uint16_t crc16_ccitt(const uint8_t *data, size_t length);

#ifdef __cplusplus
}
#endif

#endif /* CRC16_H */

