import React, { PropsWithChildren } from 'react';
import { Platform, StyleProp, StyleSheet, useColorScheme, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useColors } from '@/hooks/useColors';

export function Glass({ children, style, intensity = 36 }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; intensity?: number }>) {
  const colors = useColors();
  const scheme = useColorScheme();
  const surfaceStyle = [styles.base, { borderColor: colors.border }, style];

  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return <GlassView glassEffectStyle="regular" tintColor={colors.glass} colorScheme={scheme === 'dark' ? 'dark' : 'light'} style={surfaceStyle}>{children}</GlassView>;
  }

  return <View style={surfaceStyle}>
    <BlurView pointerEvents="none" intensity={intensity} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
    {children}
  </View>;
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', borderWidth: 1, borderRadius: 20, backgroundColor: 'transparent' },
});