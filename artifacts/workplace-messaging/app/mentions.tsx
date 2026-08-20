import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function MentionsScreen() {
  const colors = useColors(); const { staff } = useApp(); const riley = staff.find((person) => person.id === 'riley');
  return <Screen><View style={styles.top}><PressableScale onPress={() => router.back()} accessibilityLabel="Back"><Ionicons name="chevron-back" size={27} color={colors.foreground} /></PressableScale><Text style={[styles.title, { color: colors.foreground }]}>Mentions & starred</Text><View style={{ width: 27 }} /></View><SectionLabel>RECENT MENTIONS</SectionLabel><PressableScale onPress={() => router.push('/conversation/announcements')}><Glass style={styles.card}><Avatar label={riley?.avatar ?? 'RJ'} size={42} tone="lavender" /><View style={styles.copy}><Text style={[styles.name, { color: colors.foreground }]}>{riley?.name ?? 'Riley Jones'} <Text style={{ color: colors.primary }}>mentioned you</Text></Text><Text style={[styles.message, { color: colors.mutedForeground }]}>“Maya, could you add the operations update before the staff forum?”</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>Organisation Announcements · Today</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></Glass></PressableScale><SectionLabel>STARRED MESSAGES</SectionLabel><Glass style={styles.empty}><Ionicons name="star-outline" size={28} color={colors.statusAttention} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No starred messages yet</Text><Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Long-press a useful message and choose Star to keep it here.</Text></Glass></Screen>;
}
const styles = StyleSheet.create({ top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 19 }, title: { fontFamily: 'Inter_500Medium', fontSize: 18 }, card: { padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, copy: { flex: 1, gap: 5 }, name: { fontFamily: 'Inter_500Medium', fontSize: 15 }, message: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 21 }, meta: { fontFamily: 'Inter_400Regular', fontSize: 12 }, empty: { padding: 26, borderRadius: 12, alignItems: 'center', gap: 8 }, emptyTitle: { fontFamily: 'Inter_500Medium', fontSize: 16 }, emptyCopy: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 } });