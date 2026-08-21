import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { SectionLabel } from '@/components/SectionLabel';
import { AuthProfile, getErrorMessage, useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

interface PasswordReveal {
  staff: AuthProfile;
  temporaryPassword: string;
}

export default function StaffAccessScreen() {
  const colors = useColors();
  const { createStaff, isLoading, listStaff, profile, resetStaffPassword } = useAuth();
  const [staff, setStaff] = useState<AuthProfile[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'staff' | 'manager'>('staff');
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [reveal, setReveal] = useState<PasswordReveal | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      setLoadingStaff(true);
      setStaff(await listStaff());
    } catch (error) {
      Alert.alert('Unable to load staff', getErrorMessage(error, 'Please try again.'));
    } finally {
      setLoadingStaff(false);
    }
  }, [listStaff]);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      router.replace('/(tabs)/settings');
      return;
    }
    void loadStaff();
  }, [loadStaff, profile?.role]);

  const submit = async () => {
    try {
      const result = await createStaff({ displayName: name, email, role });
      setReveal(result);
      setStaff((current) => [...current.filter((item) => item.id !== result.staff.id), result.staff].sort((left, right) => left.display_name.localeCompare(right.display_name)));
      setName('');
      setEmail('');
      setRole('staff');
    } catch (error) {
      Alert.alert('Unable to add staff', getErrorMessage(error, 'Please check the details and try again.'));
    }
  };

  const resetPassword = (staffMember: AuthProfile) => {
    Alert.alert(
      `Reset ${staffMember.display_name}'s password?`,
      'Their current app access will be paused until they choose a new password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset password',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const result = await resetStaffPassword(staffMember.id);
                setReveal(result);
                setStaff((current) => current.map((item) => item.id === result.staff.id ? result.staff : item));
              } catch (error) {
                Alert.alert('Unable to reset password', getErrorMessage(error, 'Please try again.'));
              }
            })();
          },
        },
      ],
    );
  };

  return <View style={[styles.root, { backgroundColor: colors.background }]}><View style={[styles.signature, { backgroundColor: colors.royalBlue }]} /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.top}><PressableScale accessibilityLabel="Back to Settings" onPress={() => router.back()}><Ionicons name="chevron-back" size={27} color={colors.foreground} /></PressableScale><Text style={[styles.title, { color: colors.foreground }]}>Staff access</Text><View style={styles.backSpacer} /></View><Text style={[styles.intro, { color: colors.mutedForeground }]}>Create work accounts and share each temporary password through your approved secure channel.</Text><SectionLabel>ADD STAFF MEMBER</SectionLabel><Glass style={styles.form}><Text style={[styles.label, { color: colors.mutedForeground }]}>FULL NAME</Text><TextInput value={name} onChangeText={setName} placeholder="Staff member name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.glassStrong }]} /><Text style={[styles.label, { color: colors.mutedForeground }]}>WORK EMAIL</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="name@bridgingabilities.com.au" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.glassStrong }]} /><Text style={[styles.label, { color: colors.mutedForeground }]}>ACCESS ROLE</Text><View style={styles.roleRow}>{(['staff', 'manager'] as const).map((item) => <PressableScale key={item} onPress={() => setRole(item)} style={[styles.roleButton, { borderColor: role === item ? colors.royalBlue : colors.border, backgroundColor: role === item ? colors.royalBlue : colors.secondary }]}><Text style={[styles.roleText, { color: role === item ? '#fff' : colors.foreground }]}>{item === 'staff' ? 'Staff' : 'Manager'}</Text></PressableScale>)}</View><PressableScale disabled={!name.trim() || !email.trim() || isLoading} onPress={submit} style={[styles.createButton, { backgroundColor: colors.royalBlue, opacity: !name.trim() || !email.trim() || isLoading ? 0.65 : 1 }]}><Ionicons name="person-add-outline" size={18} color="#fff" /><Text style={styles.createText}>{isLoading ? 'Creating…' : 'Create staff access'}</Text></PressableScale></Glass>{reveal ? <Glass style={[styles.reveal, { borderColor: colors.royalBlue }]}><View style={styles.revealHeading}><Ionicons name="key-outline" size={22} color={colors.primary} /><Text style={[styles.revealTitle, { color: colors.foreground }]}>Temporary password</Text></View><Text style={[styles.revealCopy, { color: colors.mutedForeground }]}>Share this with {reveal.staff.display_name} once. It expires in 7 days and cannot be shown again after you dismiss it.</Text><Text selectable style={[styles.password, { color: colors.foreground, backgroundColor: colors.glassStrong }]}>{reveal.temporaryPassword}</Text><Text style={[styles.copyHint, { color: colors.mutedForeground }]}>Press and hold the password to copy it.</Text><PressableScale onPress={() => setReveal(null)} style={[styles.dismissButton, { backgroundColor: colors.secondary }]}><Text style={[styles.dismissText, { color: colors.foreground }]}>I’ve copied it</Text></PressableScale></Glass> : null}<SectionLabel>STAFF ACCOUNTS</SectionLabel>{loadingStaff ? <Text style={[styles.loading, { color: colors.mutedForeground }]}>Loading staff accounts…</Text> : staff.map((staffMember) => <Glass key={staffMember.id} style={styles.staffCard}><View style={styles.staffRow}><View style={[styles.avatar, { backgroundColor: colors.navy }]}><Text style={styles.avatarText}>{staffMember.display_name.slice(0, 2).toUpperCase()}</Text></View><View style={styles.staffCopy}><Text style={[styles.staffName, { color: colors.foreground }]}>{staffMember.display_name}</Text><Text style={[styles.staffEmail, { color: colors.mutedForeground }]}>{staffMember.email}</Text><Text style={[styles.staffMeta, { color: staffMember.password_change_required ? colors.statusAttention : colors.primary }]}>{staffMember.password_change_required ? 'Password setup required' : staffMember.role === 'manager' ? 'Manager' : 'Staff member'}</Text></View></View><PressableScale disabled={isLoading} onPress={() => resetPassword(staffMember)} style={[styles.resetButton, { borderColor: colors.border }]}><Ionicons name="refresh-outline" size={16} color={colors.primary} /><Text style={[styles.resetText, { color: colors.primary }]}>Reset temporary password</Text></PressableScale></Glass>)}</ScrollView></View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, signature: { height: 3 }, content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 42 }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, title: { fontFamily: 'Inter_600SemiBold', fontSize: 19 }, backSpacer: { width: 27 }, intro: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginBottom: 18 }, form: { padding: 16, borderRadius: 20, marginBottom: 18 }, label: { fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 0.8, marginBottom: 7, marginTop: 12 }, input: { height: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, fontFamily: 'Inter_400Regular', fontSize: 15 }, roleRow: { flexDirection: 'row', gap: 9 }, roleButton: { flex: 1, minHeight: 43, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, roleText: { fontFamily: 'Inter_500Medium', fontSize: 14 }, createButton: { minHeight: 50, borderRadius: 25, marginTop: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, createText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 }, reveal: { padding: 16, borderRadius: 20, marginBottom: 16 }, revealHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, revealTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 }, revealCopy: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 9 }, password: { fontFamily: 'Inter_600SemiBold', fontSize: 16, letterSpacing: 0.2, padding: 13, borderRadius: 12, marginTop: 12 }, copyHint: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 7 }, dismissButton: { marginTop: 14, minHeight: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, dismissText: { fontFamily: 'Inter_500Medium', fontSize: 14 }, loading: { fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 10 }, staffCard: { padding: 14, borderRadius: 20, marginBottom: 11 }, staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 13 }, staffCopy: { flex: 1 }, staffName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 }, staffEmail: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 }, staffMeta: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 4 }, resetButton: { marginTop: 13, borderWidth: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, resetText: { fontFamily: 'Inter_500Medium', fontSize: 13 } });