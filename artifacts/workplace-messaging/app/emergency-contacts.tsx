import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { useColors } from '@/hooks/useColors';

const contacts = [
  { name: 'On-call coordinator', role: 'After-hours operational support', phone: '+61255550120', urgent: true },
  { name: 'Office reception', role: 'Business-hours support', phone: '+61255550121' },
  { name: 'Work health & safety lead', role: 'Incident reporting guidance', phone: '+61255550122' },
];
export default function EmergencyContactsScreen() {
  const colors = useColors();
  const call = async (contact: typeof contacts[number]) => { const supported = await Linking.canOpenURL(`tel:${contact.phone}`); if (supported) await Linking.openURL(`tel:${contact.phone}`); else Alert.alert('Calling unavailable', `Use ${contact.phone} from a phone-capable device.`); };
  return <Screen><View style={styles.top}><PressableScale onPress={() => router.back()} accessibilityLabel="Back"><Ionicons name="chevron-back" size={27} color={colors.foreground} /></PressableScale><Text style={[styles.title, { color: colors.foreground }]}>Emergency contacts</Text><View style={{ width: 27 }} /></View><Glass style={[styles.alert, { borderLeftColor: colors.statusEmergency }]}><Ionicons name="warning-outline" size={22} color={colors.statusEmergency} /><Text style={[styles.alertCopy, { color: colors.foreground }]}>For life-threatening emergencies, call 000 first. This list is saved on your device for quick access.</Text></Glass><SectionLabel>WORKPLACE SUPPORT</SectionLabel>{contacts.map((contact) => <Glass key={contact.name} style={styles.contact}><View style={[styles.contactIcon, { backgroundColor: contact.urgent ? colors.statusEmergency : colors.secondary }]}><Ionicons name={contact.urgent ? 'alert-circle-outline' : 'call-outline'} size={20} color={contact.urgent ? '#fff' : colors.primary} /></View><View style={styles.copy}><Text style={[styles.name, { color: colors.foreground }]}>{contact.name}</Text><Text style={[styles.role, { color: colors.mutedForeground }]}>{contact.role}</Text><Text style={[styles.phone, { color: colors.primary }]}>{contact.phone}</Text></View><PressableScale onPress={() => call(contact)} accessibilityLabel={`Call ${contact.name}`} style={[styles.call, { backgroundColor: colors.royalBlue }]}><Ionicons name="call" size={18} color="#fff" /></PressableScale></Glass>)}</Screen>;
}
const styles = StyleSheet.create({ top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, title: { fontFamily: 'Inter_500Medium', fontSize: 18 }, alert: { padding: 16, borderRadius: 12, borderLeftWidth: 3, flexDirection: 'row', gap: 11, marginBottom: 18 }, alertCopy: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 }, contact: { padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }, contactIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' }, copy: { flex: 1, gap: 3 }, name: { fontFamily: 'Inter_500Medium', fontSize: 16 }, role: { fontFamily: 'Inter_400Regular', fontSize: 13 }, phone: { fontFamily: 'Inter_500Medium', fontSize: 13 }, call: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 21 } });