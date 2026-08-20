import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { TopBar } from '@/components/TopBar';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function ChatsScreen() {
  const colors = useColors();
  const { conversations } = useApp();
  const [search, setSearch] = useState('');
  const visible = useMemo(() => conversations.filter((item) => `${item.name} ${item.lastMessage}`.toLowerCase().includes(search.toLowerCase())), [conversations, search]);
  const announcement = conversations.find((item) => item.kind === 'announcement');
  return <Screen scroll={false} showSignature={false} style={styles.screen}>
    <TopBar title="Chats" subtitle="Bridging Abilities Staff" accentLine onProfile={() => router.push('/profile')} right={<PressableScale accessibilityLabel="New conversation" onPress={() => router.push('/new-chat')}><Ionicons name="create-outline" size={24} color={colors.foreground} /></PressableScale>} />
    <Glass style={styles.search}><Ionicons name="search-outline" size={19} color={colors.mutedForeground} /><TextInput value={search} onChangeText={setSearch} placeholder="Search conversations" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} /></Glass>
    <SectionLabel>COMPANY ANNOUNCEMENTS</SectionLabel>
    {announcement ? <PressableScale onPress={() => router.push('/conversation/announcements')}><Glass style={[styles.announcement, { borderColor: colors.accent }]} intensity={46}><View style={[styles.announcementIcon, { backgroundColor: colors.accent }]}><Ionicons name="megaphone-outline" size={21} color={colors.accentForeground} /></View><View style={styles.conversationCopy}><View style={styles.nameRow}><Text style={[styles.name, { color: colors.foreground }]}>{announcement.name}</Text><Text style={[styles.time, { color: colors.mutedForeground }]}>{announcement.time}</Text></View><Text numberOfLines={1} style={[styles.preview, { color: colors.mutedForeground }]}>{announcement.lastMessage}</Text></View>{announcement.unread > 0 ? <View style={[styles.badge, { backgroundColor: colors.primary }]}><Text style={styles.badgeText}>{announcement.unread}</Text></View> : null}</Glass></PressableScale> : null}
    <SectionLabel>RECENT CONVERSATIONS</SectionLabel>
    <FlatList data={visible.filter((item) => item.kind !== 'announcement')} keyExtractor={(item) => item.id} scrollEnabled={!!visible.length} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} renderItem={({ item }) => <PressableScale onPress={() => router.push(`/conversation/${item.id}`)}><View style={[styles.row, { borderBottomColor: colors.border }]}><Avatar label={item.avatar} size={50} tone={item.kind === 'group' ? 'lavender' : 'teal'} /><View style={styles.conversationCopy}><View style={styles.nameRow}><Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.time, { color: item.unread ? colors.primary : colors.mutedForeground }]}>{item.time}</Text></View><View style={styles.previewRow}><Text numberOfLines={1} style={[styles.preview, { color: colors.mutedForeground, fontFamily: item.unread ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{item.lastMessage}</Text>{item.unread > 0 ? <View style={[styles.badge, { backgroundColor: colors.primary }]}><Text style={styles.badgeText}>{item.unread}</Text></View> : null}</View></View></View></PressableScale>} />
  </Screen>;
}
const styles = StyleSheet.create({ screen: { paddingBottom: 10 }, search: { height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 28, gap: 10 }, searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15 }, announcement: { minHeight: 78, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 25 }, announcementIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, row: { minHeight: 76, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 }, conversationCopy: { flex: 1, gap: 7 }, nameRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, name: { fontFamily: 'Inter_600SemiBold', fontSize: 15 }, time: { fontFamily: 'Inter_500Medium', fontSize: 11 }, preview: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 }, badge: { minWidth: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, badgeText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 11 }, list: { paddingBottom: 40 } });