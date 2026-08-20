import { BlurView } from 'expo-blur';
import React, { PropsWithChildren } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function Glass({ children, style, intensity = 36 }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; intensity?: number }>) {
  const colors = useColors();
  return Platform.OS === 'web' ? (
    <View style={[styles.base, { backgroundColor: colors.glass }, style]}>{children}</View>
  ) : (
    <BlurView intensity={intensity} tint={colors.background === '#101C24' ? 'dark' : 'light'} style={[styles.base, { borderColor: colors.border }, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
      <View style={styles.content}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', borderWidth: 1, borderRadius: 24 },
  content: { flex: 1 },
});