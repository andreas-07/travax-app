import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function RecordButton({ onPress, active }: { onPress: () => void; active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.wrapper}>
      <Animated.View style={[styles.outerCircle, { transform: [{ scale }] }]}>
        <View style={[styles.innerCircle, active && styles.innerCircleActive]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ff3b30', // Apple red
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    opacity:0.9
  },
  innerCircle: {
    width: 54,
    height: 54,
    borderRadius: 24,
    backgroundColor: '#ff3b30',
  },
  innerCircleActive: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ff3b30',
  },
});
