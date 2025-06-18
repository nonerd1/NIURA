#ifndef JSON_POINTER_PATCH_H
#define JSON_POINTER_PATCH_H

#include <folly/json_pointer.h>
#include <folly/String.h> // For folly::StringPiece

// It's generally safer to use reinterpret_cast for pointer type conversions
// when you are certain about the underlying data representation.

namespace folly {

// Helper function to handle unsigned char* in json_pointer
inline Expected<json_pointer, json_pointer::parse_error> try_parse_unsigned(
    const unsigned char* str,
    size_t length) {
    return json_pointer::try_parse(
        StringPiece(reinterpret_cast<const char*>(str), length));
}

// Helper function to handle unsigned char* in json_pointer
inline json_pointer parse_unsigned(const unsigned char* str, size_t length) {
    return json_pointer::parse(
        StringPiece(reinterpret_cast<const char*>(str), length));
}

} // namespace folly

#endif // JSON_POINTER_PATCH_H 