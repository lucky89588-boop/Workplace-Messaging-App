import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function Glass({ children, style, intensity = 36 }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; intensity?: number }>) {
  const colors = useColors();
  return <View style={[styles.base, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', borderWidth: 1, borderRadius: 12 },
});