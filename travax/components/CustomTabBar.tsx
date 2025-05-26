import React, { useRef } from 'react';
import { View, Text, Animated, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    return (
        <View style={styles.container}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const rawLabel = options.tabBarLabel ?? options.title ?? route.name;
                const label = typeof rawLabel === 'function' ? route.name : rawLabel;
                const isFocused = state.index === index;
                const icon = options.tabBarIcon?.({ color: isFocused ? '#FF00FF' : '#999', focused: isFocused, size: 24 });


                const flashAnim = useRef(new Animated.Value(0)).current;

                const onPress = () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                    Animated.sequence([
                        Animated.timing(flashAnim, {
                            toValue: 1,
                            duration: 100,
                            useNativeDriver: false,
                        }),
                        Animated.timing(flashAnim, {
                            toValue: 0,
                            duration: 200,
                            useNativeDriver: false,
                        }),
                    ]).start();

                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                const backgroundColor = flashAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#1C1C1C', '#39FF14'], // anthracite -> neon green flash
                });

                return (
                    <Pressable key={route.key} onPress={onPress} style={{ flex: 1 }}>
                        <Animated.View style={[styles.tabItem, { backgroundColor }]}>
                            <View style={{}}>
                                <View style={{ margin: 4 }}>{icon} 
                                <Text style={{ color: isFocused ? '#FF00FF' : '#999', }}>{label}</Text></View>
                            </View>
                        </Animated.View>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#1C1C1C',
        borderTopWidth: 0,
        height: 100,
        elevation: 5,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
