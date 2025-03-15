import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import theme from '../theme/theme';

type CardVariant = 'filled' | 'outlined' | 'elevated';
type CardSize = 'small' | 'medium' | 'large';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  size?: CardSize;
  children: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const Card: React.FC<CardProps> = ({
  variant = 'filled',
  size = 'medium',
  children,
  fullWidth = false,
  style,
  ...rest
}) => {
  const getCardStyles = (): ViewStyle => {
    const sizeStyles: Record<CardSize, ViewStyle> = {
      small: {
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
      },
      medium: {
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
      },
      large: {
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
      },
    };

    const variantStyles: Record<CardVariant, ViewStyle> = {
      filled: {
        backgroundColor: colors.background.card,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.common.border,
      },
      elevated: {
        backgroundColor: colors.background.card,
        ...theme.shadows.medium,
      },
    };

    return {
      ...sizeStyles[size],
      ...variantStyles[variant],
      width: fullWidth ? '100%' : undefined,
    };
  };

  return (
    <View
      style={[styles.card, getCardStyles(), style]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

export default Card; 