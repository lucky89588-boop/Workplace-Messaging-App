import { router } from 'expo-router';
import React from 'react';
import { Alert, Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/PressableScale';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function WelcomeScreen() {
  const colors = useColors();
  const { getAccountStatus } = useApp();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const signIn = () => {
    const status = getAccountStatus(email);
    if (status === 'pending') return router.replace('/pending');
    if (status === 'rejected') return Alert.alert('Request not approved', 'Please contact your manager if you need help with your staff access request.');
    if (status === 'active') return router.replace('/policy');
    Alert.alert('Use an approved work email', 'Request staff access if you do not yet have an approved Bridging Abilities account.');
  };
  return <KeyboardAvoidingView behavior="padding" style={[styles.keyboard, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.brand}><Image source={require('@/assets/images/company-logo.png')} style={styles.logo} accessibilityLabel="Bridging Abilities company logo" /><Text style={[styles.brandName, { color: colors.foreground }]}>Bridging Abilities Staff</Text><Text style={[styles.tagline, { color: colors.mutedForeground }]}>Private team communication</Text></View>
      <View style={styles.bottom}><Text style={[styles.welcome, { color: colors.foreground }]}>Sign in</Text><Text style={[styles.copy, { color: colors.mutedForeground }]}>Use your work account to continue.</Text><Text style={[styles.label, { color: colors.mutedForeground }]}>WORK EMAIL</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@bridgingabilities.com.au" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /><Text style={[styles.label, { color: colors.mutedForeground }]}>PASSWORD</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /><Text style={[styles.helper, { color: colors.mutedForeground }]}>Forgotten your password? Contact your manager to have it reset.</Text><PressableScale onPress={signIn} style={[styles.primary, { backgroundColor: colors.royalBlue }]}><Text style={styles.primaryText}>Sign in</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></PressableScale><Text style={[styles.note, { color: colors.mutedForeground }]}>Access is limited to Bridging Abilities staff.</Text></View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ keyboard: { flex: 1 }, root: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 32, paddingBottom: 24 }, brand: { alignItems: 'center' }, logo: { width: 122, height: 122, resizeMode: 'contain', marginBottom: 6 }, brandName: { fontFamily: 'Inter_500Medium', fontSize: 21, letterSpacing: -0.4 }, tagline: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 6 }, bottom: { marginTop: 22, gap: 8 }, welcome: { fontFamily: 'Inter_500Medium', fontSize: 24, letterSpacing: -0.5 }, copy: { fontFamily: 'Inter_400Regular', fontSize: 16, marginBottom: 2 }, label: { fontFamily: 'Inter_500Medium', fontSize: 12, letterSpacing: 0.8, marginTop: 4 }, input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 16 }, helper: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 19, marginTop: 1, marginBottom: 2 }, primary: { minHeight: 52, borderRadius: 27, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 2 }, primaryText: { color: '#fff', fontFamily: 'Inter_500Medium', fontSize: 16 }, note: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 1 } });