import { openBrowserAsync } from 'expo-web-browser';
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

type Props = {
  href: string;
  children: React.ReactNode;
  style?: any;
};

export function ExternalLink({ href, children, style, ...rest }: Props) {
  const handlePress = async () => {
    await openBrowserAsync(href);
  };

  return (
    <Pressable onPress={handlePress} style={[styles.link, style]} {...rest}>
      {typeof children === 'string' ? (
        <Text style={styles.linkText}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    // Add any default link styles here
  },
  linkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
