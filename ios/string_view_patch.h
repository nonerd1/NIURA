#ifndef STRING_VIEW_PATCH_H
#define STRING_VIEW_PATCH_H

// Helper functions for React Native
namespace facebook {
namespace react {

// It's generally safer to use reinterpret_cast for pointer type conversions
// when you are certain about the underlying data representation.

template<typename To, typename From>
inline const To* safeCast(const From* ptr) {
  return reinterpret_cast<const To*>(ptr);
}

inline std::string_view makeStringView(const unsigned char* data, size_t length) {
  return std::string_view(safeCast<char>(data), length);
}

} // namespace react
} // namespace facebook

#endif // STRING_VIEW_PATCH_H 