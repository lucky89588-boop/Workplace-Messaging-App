import React, { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function SectionLabel({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.label, { color: colors.mutedForeground }]}>{children}</Text>;
}

const styles = StyleSheet.create({ label: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.3, marginBottom: 10, marginLeft: 4 } });