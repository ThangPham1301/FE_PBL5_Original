import React from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import useAppTheme from '../theme/useAppTheme';

export default function PrimaryButton({ title, onPress, variant = 'primary', disabled = false }) {
  const { colors, radius } = useAppTheme();
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    if (disabled) {
      return;
    }
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.97,
        stiffness: 240,
        damping: 22,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.9,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        stiffness: 220,
        damping: 20,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      disabled={disabled}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.base,
          {
            borderRadius: radius.md,
            backgroundColor: variant === 'secondary' ? colors.secondaryButton : colors.primary,
            borderColor: variant === 'secondary' ? colors.border : colors.primary,
            transform: [{ scale }],
            opacity: disabled ? 0.7 : opacity,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: variant === 'secondary' ? colors.primary : '#FFFFFF' },
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  base: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  text: {
    fontWeight: '700',
    fontSize: 14,
  },
});
