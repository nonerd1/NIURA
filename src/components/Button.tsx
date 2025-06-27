import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacityProps,
  View,
  TextStyle,
  ViewStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../theme/theme';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

type ButtonVariant = 'filled' | 'outlined' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';
type ButtonColor = 'primary' | 'success' | 'error' | 'warning' | 'accent1' | 'accent2' | 'accent3';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'filled',
  size = 'medium',
  color = 'primary',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  ...rest
}) => {
  const { getScaledFontSize } = useTheme();

  const getGradientColors = (): [string, string] => {
    switch (color) {
      case 'primary': return [colors.primary.main, colors.primary.light];
      case 'success': return [colors.success, colors.success];
      case 'error': return [colors.error, colors.error];
      case 'warning': return [colors.warning, colors.warning];
      case 'accent1': return [colors.accent1, colors.primary.main];
      case 'accent2': return [colors.accent2, colors.info];
      case 'accent3': return [colors.accent3, colors.success];
      default: return [colors.primary.main, colors.primary.light];
    }
  };

  const getColorValue = () => {
    switch (color) {
      case 'primary': return colors.primary.main;
      case 'success': return colors.success;
      case 'error': return colors.error;
      case 'warning': return colors.warning;
      case 'accent1': return colors.accent1;
      case 'accent2': return colors.accent2;
      case 'accent3': return colors.accent3;
      default: return colors.primary.main;
    }
  };

  const getButtonStyles = (): ViewStyle => {
    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      small: { 
        height: 36, 
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
      },
      medium: { 
        height: 44, 
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
      },
      large: { 
        height: 56, 
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
      },
    };

    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      filled: {
        ...theme.shadows.medium,
      },
      outlined: {
        borderWidth: 1.5,
        borderColor: getColorValue(),
        backgroundColor: 'transparent',
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    return {
      ...sizeStyles[size],
      ...variantStyles[variant],
      width: fullWidth ? '100%' as any : undefined,
    };
  };

  const getTextStyles = (): TextStyle => {
    const sizeStyles: Record<ButtonSize, TextStyle> = {
      small: {
        fontSize: getScaledFontSize(theme.fontSizes.sm),
        fontWeight: theme.fontWeights.medium as TextStyle['fontWeight'],
      },
      medium: {
        fontSize: getScaledFontSize(theme.fontSizes.md),
        fontWeight: theme.fontWeights.semibold as TextStyle['fontWeight'],
      },
      large: {
        fontSize: getScaledFontSize(theme.fontSizes.lg),
        fontWeight: theme.fontWeights.semibold as TextStyle['fontWeight'],
      },
    };

    const variantStyles: Record<ButtonVariant, TextStyle> = {
      filled: {
        color: colors.common.white,
      },
      outlined: {
        color: getColorValue(),
      },
      ghost: {
        color: getColorValue(),
      },
    };

    return {
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator 
          size="small" 
          color={variant === 'filled' ? colors.common.white : getColorValue()} 
        />
      );
    }

    return (
      <View style={styles.contentContainer}>
        {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
        <Text style={[styles.text, getTextStyles()]}>{title}</Text>
        {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
      </View>
    );
  };

  if (variant === 'filled') {
    return (
      <TouchableOpacity 
        style={[styles.button, getButtonStyles(), style]} 
        activeOpacity={0.8} 
        disabled={loading}
        {...rest}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, getButtonStyles()]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.button, getButtonStyles(), style]} 
      activeOpacity={0.8} 
      disabled={loading}
      {...rest}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: theme.spacing.xs,
  },
  iconRight: {
    marginLeft: theme.spacing.xs,
  },
});

export default Button; 