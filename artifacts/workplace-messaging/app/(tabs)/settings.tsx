import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { TopBar } from '@/components/TopBar';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  const { isDark, notificationsEnabled, resetLocalData, setNotificationsEnabled, toggleTheme } = useApp();
  const { profile, signOut } = useAuth();
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const initials = profile?.display_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? 'BA';

  const resetData = async () => {
    const didReset = await resetLocalData();
    if (!didReset) {
      setResetError('We could not reset local data. Please try again.');
      return;
    }
    setResetError(null);
    setShowResetConfirmation(false);
  };

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    void Notifications.getPermissionsAsync()
      .then((permission) => {
        if (mounted && !permission.granted && notificationsEnabled) setNotificationsEnabled(false);
      })
      .catch((error) => console.warn('Unable to read notification permission.', error));
    return () => {
      mounted = false;
    };
  }, [notificationsEnabled, setNotificationsEnabled]);

  const updateNotifications = async (enabled: boolean) => {
    if (!enabled) {
      setNotificationsEnabled(false);
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert('Use the mobile app', 'Device notifications are available in the Workplace Messaging mobile app.');
      return;
    }
    setUpdatingNotifications(true);
    try {
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        const actions = !permission.canAskAgain
          ? [{ text: 'Cancel', style: 'cancel' as const }, { text: 'Open settings', onPress: () => { void Linking.openSettings().catch(() => Alert.alert('Unable to open settings', 'Please enable notifications in your device settings.')); } }]
          : [{ text: 'OK' }];
        Alert.alert('Notifications are off', 'Allow notifications to receive workplace messages, mentions, and announcements.', actions);
        return;
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('workplace-messages', {
          name: 'Workplace messages',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      setNotificationsEnabled(true);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Notifications are on',
          body: 'Workplace messages and announcements can now reach this device.',
          sound: false,
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Unable to enable notifications.', error);
      Alert.alert('Notifications unavailable', 'We could not enable device notifications. Please try again.');
    } finally {
      setUpdatingNotifications(false);
    }
  };

  const row = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle: string,
    onPress?: () => void,
    trailing?: React.ReactNode,
  ) => (
    <PressableScale onPress={onPress} style={styles.press}>
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
        {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />}
      </View>
    </PressableScale>
  );

  const handleSignOut = () => {
    signOut();
    router.replace('/');
  };

  return (
    <Screen>
      <TopBar title="Settings" subtitle="Your account and app preferences" onProfile={() => router.push('/profile')} />

      <PressableScale onPress={() => router.push('/profile')}>
        <Glass style={styles.profileCard}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.navy }]}>
            <Text style={styles.profileInitials}>{initials}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{profile?.display_name ?? 'Staff member'}</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              {profile?.role === 'admin' ? 'Administrator' : profile?.role === 'manager' ? 'Manager' : 'Staff member'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={colors.mutedForeground} />
        </Glass>
      </PressableScale>

      <SectionLabel>YOUR APP</SectionLabel>
      <Glass style={styles.panel}>
        {row(
          'notifications-outline',
          'Notifications',
          notificationsEnabled ? 'On for messages, announcements and mentions' : 'Off — tap to allow device notifications',
          () => { void updateNotifications(!notificationsEnabled); },
          <Switch
            value={notificationsEnabled}
            disabled={updatingNotifications}
            onValueChange={(value) => { void updateNotifications(value); }}
            trackColor={{ false: colors.input, true: colors.primary }}
            thumbColor={colors.glassStrong}
          />,
        )}
        {row('at-outline', 'Mentions & starred', 'Messages saved for you', () => router.push('/mentions'))}
        {row('call-outline', 'Emergency contacts', 'On-call and workplace support', () => router.push('/emergency-contacts'))}
        {row(
          'color-palette-outline',
          'Appearance',
          isDark ? 'Dark mode' : 'Light mode',
          undefined,
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.input, true: colors.primary }}
            thumbColor={colors.glassStrong}
          />,
        )}
      </Glass>

      {profile?.role === 'admin' ? (
        <>
          <SectionLabel>ADMINISTRATION</SectionLabel>
          <Glass style={styles.panel}>
            {row('person-add-outline', 'Staff access', 'Add staff and reset temporary passwords', () => router.push('/staff-access'))}
          </Glass>
        </>
      ) : null}

      <SectionLabel>LOCAL DATA</SectionLabel>
      <Glass style={styles.panel}>
        {row('refresh-outline', 'Reset local data', 'Restore starter messages, groups and settings', () => {
          setResetError(null);
          setShowResetConfirmation(true);
        })}
      </Glass>

      <SectionLabel>ACCOUNT</SectionLabel>
      <Glass style={styles.panel}>
        {row('document-text-outline', 'Privacy & policies', 'Workplace communication policy', () => Alert.alert('Privacy & policies', 'Your policy acknowledgement is required before workplace messages are available.'))}
        {row('help-circle-outline', 'Help & support', 'Contact your manager for help', () => Alert.alert('Help & support', 'Ask your manager or workplace administrator for assistance.'))}
        {row('log-out-outline', 'Sign out', 'Sign out of this device', handleSignOut)}
      </Glass>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>Bridging Abilities Staff · Secure access</Text>

      <Modal transparent visible={showResetConfirmation} animationType="fade" onRequestClose={() => setShowResetConfirmation(false)}>
        <View style={styles.modalBackdrop}>
          <Glass style={[styles.confirmation, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.confirmationIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="refresh-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.confirmationTitle, { color: colors.foreground }]}>Reset local data?</Text>
            <Text style={[styles.confirmationCopy, { color: colors.mutedForeground }]}>
              This removes your saved messages, groups, local approvals, profile changes, and appearance choice, then restores the starter preview.
            </Text>
            {resetError ? <Text style={[styles.resetError, { color: colors.statusEmergency }]}>{resetError}</Text> : null}
            <View style={styles.confirmationActions}>
              <PressableScale accessibilityLabel="Cancel reset" onPress={() => setShowResetConfirmation(false)} style={[styles.confirmationButton, { borderColor: colors.border }]}>
                <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
              </PressableScale>
              <PressableScale accessibilityLabel="Confirm reset local data" onPress={resetData} style={[styles.confirmationButton, { backgroundColor: colors.royalBlue }]}>
                <Text style={styles.confirmText}>Reset data</Text>
              </PressableScale>
            </View>
          </Glass>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20, borderRadius: 20 },
  profileAvatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  profileInitials: { color: '#fff', fontFamily: 'Inter_500Medium', fontSize: 16 },
  copy: { flex: 1, gap: 4 },
  profileName: { fontFamily: 'Inter_500Medium', fontSize: 17 },
  panel: { paddingHorizontal: 16, marginBottom: 18, borderRadius: 20 },
  press: { width: '100%' },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: 'Inter_500Medium', fontSize: 16 },
  rowSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  version: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(9, 15, 27, 0.46)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmation: { width: '100%', maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 22, alignItems: 'center' },
  confirmationIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  confirmationTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, textAlign: 'center' },
  confirmationCopy: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  resetError: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 12 },
  confirmationActions: { flexDirection: 'row', gap: 10, marginTop: 22, width: '100%' },
  confirmationButton: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  confirmText: { color: '#fff', fontFamily: 'Inter_500Medium', fontSize: 14 },
});