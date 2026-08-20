import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function Avatar({ label, size = 48, tone = 'teal' }: { label: string; size?: number; tone?: 'teal' | 'amber' | 'lavender' | 'navy' }) {
  const colors = useColors();
  const backgroundColor = tone === 'amber' ? colors.accent : tone === 'lavender' ? colors.lavender : tone === 'navy' ? colors.navy : colors.secondary;
  const foreground = tone === 'amber' ? colors.accentForeground : tone === 'navy' ? '#FFFFFF' : colors.primary;
  return <View accessible accessibilityLabel={`${label} avatar`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}><Text style={[styles.text, { color: foreground, fontSize: size * 0.32 }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
});