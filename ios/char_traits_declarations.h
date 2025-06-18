#ifndef CHAR_TRAITS_DECLARATIONS_H
#define CHAR_TRAITS_DECLARATIONS_H

#ifdef __cplusplus
#include <string>
#include <string_view>

// Forward declarations for char_traits to avoid conflicts
namespace std {
  template<class CharT>
  struct char_traits;
  
  template<>
  struct char_traits<char>;
  
  template<>
  struct char_traits<wchar_t>;
  
  template<>
  struct char_traits<char16_t>;
  
  template<>
  struct char_traits<char32_t>;
}
#endif // __cplusplus

#endif // CHAR_TRAITS_DECLARATIONS_H 