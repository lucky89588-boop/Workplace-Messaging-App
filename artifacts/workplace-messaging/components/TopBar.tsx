import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/PressableScale';

export function TopBar({ title, subtitle, accentLine = false, onProfile, right }: { title: string; subtitle?: string; accentLine?: boolean; onProfile?: () => void; right?: React.ReactNode }) {
  const colors = useColors();
  return <View style={styles.container}>
    <View style={styles.row}>
      <View style={styles.titleWrap}><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>{subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}</View>
      <View style={styles.actions}>{right}{onProfile ? <PressableScale accessibilityRole="button" accessibilityLabel="Open profile" onPress={onProfile}><Avatar label="MC" size={38} tone="navy" /></PressableScale> : null}</View>
    </View>
    {accentLine ? <View accessibilityElementsHidden style={[styles.accentLine, { backgroundColor: colors.royalBlue }]} /> : null}
  </View>;
}
const styles = StyleSheet.create({ container: { marginBottom: 22 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, titleWrap: { flex: 1 }, title: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -1.1 }, subtitle: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 5 }, actions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, accentLine: { height: 3, borderRadius: 999, marginTop: 12 } });