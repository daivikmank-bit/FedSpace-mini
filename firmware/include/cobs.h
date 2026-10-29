/**
 * @file cobs.h
 * @brief Consistent Overhead Byte Stuffing (COBS) C Implementation
 * 
 * Provides fast, zero-allocation packet framing without 0x00 bytes.
 * Frames are delimited with a single 0x00 character on the wire.
 */

#ifndef COBS_H
#define COBS_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Encodes a byte array into COBS format.
 * 
 * @param dst Output buffer. Must be at least src_len + (src_len / 254) + 1 bytes.
 * @param src Input unencoded byte buffer.
 * @param src_len Number of bytes in src.
 * @return size_t Number of bytes written to dst.
 */
size_t cobs_encode(uint8_t *dst, const uint8_t *src, size_t src_len);

/**
 * @brief Decodes a COBS-encoded byte array.
 * 
 * @param dst Output buffer. Must be at least src_len bytes.
 * @param src Input COBS-encoded byte buffer (excluding trailing 0x00 delimiter).
 * @param src_len Number of bytes in src.
 * @return size_t Number of bytes written to dst (or 0 if corrupt).
 */
size_t cobs_decode(uint8_t *dst, const uint8_t *src, size_t src_len);

#ifdef __cplusplus
}
#endif

#endif /* COBS_H */

