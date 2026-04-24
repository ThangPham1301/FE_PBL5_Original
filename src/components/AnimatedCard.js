import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export default function AnimatedCard({
  children,
  style,
  delay = 0,
  duration = 320,
  fromY = 10,
  play = true,
  onDidAnimate,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(fromY)).current;
  const hasPlayedRef = useRef(false);
  const onDidAnimateRef = useRef(onDidAnimate);

  useEffect(() => {
    onDidAnimateRef.current = onDidAnimate;
  }, [onDidAnimate]);

  useEffect(() => {
    if (!play) {
      hasPlayedRef.current = false;
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    if (hasPlayedRef.current) {
      return;
    }

    hasPlayedRef.current = true;

    opacity.setValue(0);
    translateY.setValue(fromY);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && onDidAnimateRef.current) {
        onDidAnimateRef.current();
      }
    });
  }, [delay, duration, fromY, opacity, play, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
