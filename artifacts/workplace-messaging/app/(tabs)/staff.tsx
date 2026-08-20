import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function StaffScreen() {
  const colors = useColors(); const { staff } = useApp(); const [query, setQuery] = useState('');
  const visible = useMemo(() => staff.filter((person) => person.status === 'active' && `${person.name} ${person.title} ${person.department}`.toLowerCase().includes(query.toLowerCase())), [query, staff]);
  return <Screen scroll={false}><TopBar title="Staff" subtitle={`${staff.length} people at Northstar`} onProfile={() => router.push('/profile')} /><Glass style={styles.search}><Ionicons name="search-outline" size={19} color={colors.mutedForeground} /><TextInput value={query} onChangeText={setQuery} placeholder="Search by name, team or role" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} /></Glass><FlatList data={visible} keyExtractor={(item) => item.id} scrollEnabled={!!visible.length} contentContainerStyle={styles.list} renderItem={({ item }) => <PressableScale onPress={() => router.push(`/person/${item.id}`)}><View style={[styles.item, { borderBottomColor: colors.border }]}><Avatar label={item.avatar} size={48} tone={item.id === 'me' ? 'navy' : 'teal'} /><View style={styles.copy}><Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.title} · {item.department}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></View></PressableScale>} /></Screen>;
}
const styles = StyleSheet.create({ search: { height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10, marginBottom: 18 }, input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 }, list: { paddingBottom: 50 }, item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 76, borderBottomWidth: 1 }, copy: { flex: 1, gap: 5 }, name: { fontFamily: 'Inter_600SemiBold', fontSize: 15 }, meta: { fontFamily: 'Inter_400Regular', fontSize: 12 } });