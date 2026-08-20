import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { TopBar } from '@/components/TopBar';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function AnnouncementsScreen() {
  const colors = useColors();
  const { conversations, messages } = useApp();
  const channels = conversations.filter((conversation) => conversation.kind === 'announcement' || conversation.pinned);
  return <Screen><TopBar title="Announcements" subtitle="Updates from your organisation" onProfile={() => router.push('/profile')} /><SectionLabel>PINNED CHANNELS</SectionLabel>{channels.map((channel) => <PressableScale key={channel.id} onPress={() => router.push(`/conversation/${channel.id}`)}><Glass style={[styles.channel, { borderLeftColor: colors.statusAttention }]}><View style={[styles.icon, { backgroundColor: colors.statusAttention }]}><Ionicons name="megaphone-outline" size={21} color="#2E2110" /></View><View style={styles.copy}><View style={styles.headingRow}><Text style={[styles.name, { color: colors.foreground }]}>{channel.name}</Text><Text style={[styles.time, { color: colors.mutedForeground }]}>{channel.time}</Text></View><Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>{channel.lastMessage}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{messages[channel.id]?.length ?? 0} posts · {channel.unread ? `${channel.unread} unread` : 'All caught up'}</Text></View></Glass></PressableScale>)}<SectionLabel>NOTICE</SectionLabel><Glass style={styles.notice}><Ionicons name="information-circle-outline" size={21} color={colors.primary} /><Text style={[styles.noticeText, { color: colors.foreground }]}>Announcements are shared by approved managers and organisation administrators.</Text></Glass></Screen>;
}
const styles = StyleSheet.create({ channel: { borderRadius: 12, borderLeftWidth: 3, padding: 16, flexDirection: 'row', gap: 14, marginBottom: 14 }, icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, gap: 6 }, headingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, name: { fontFamily: 'Inter_500Medium', fontSize: 17, flex: 1 }, time: { fontFamily: 'Inter_400Regular', fontSize: 12 }, preview: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 23 }, meta: { fontFamily: 'Inter_400Regular', fontSize: 12 }, notice: { padding: 16, borderRadius: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 } });