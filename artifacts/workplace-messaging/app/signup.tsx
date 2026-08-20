import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function SignupScreen() {
  const colors = useColors();
  const { requestAccess } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const canContinue = name.trim().length > 1 && email.includes('@');

  return <KeyboardAvoidingView behavior="padding" style={[styles.root, { backgroundColor: colors.background }]}>
    <View style={styles.top}><PressableScale onPress={() => router.back()} accessibilityLabel="Go back"><Ionicons name="chevron-back" size={28} color={colors.foreground} /></PressableScale><Text style={[styles.topTitle, { color: colors.foreground }]}>Request staff access</Text><View style={{ width: 28 }} /></View>
    <View style={styles.content}><Text style={[styles.heading, { color: colors.foreground }]}>Join your team.</Text><Text style={[styles.intro, { color: colors.mutedForeground }]}>Use your work email so management can verify your access request.</Text><Text style={[styles.label, { color: colors.mutedForeground }]}>FULL NAME</Text><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /><Text style={[styles.label, { color: colors.mutedForeground }]}>WORK EMAIL</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@bridgingabilities.com.au" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /><Text style={[styles.helper, { color: colors.mutedForeground }]}>Management will review your request before granting access to staff messages.</Text></View>
    <PressableScale disabled={!canContinue} onPress={() => { requestAccess(name.trim(), email.trim()); router.replace('/pending'); }} style={[styles.button, { backgroundColor: canContinue ? colors.royalBlue : colors.input }]}><Text style={[styles.buttonText, { color: canContinue ? '#fff' : colors.mutedForeground }]}>Request access</Text><Ionicons name="arrow-forward" size={18} color={canContinue ? '#fff' : colors.mutedForeground} /></PressableScale>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ root: { flex: 1, paddingHorizontal: 22, paddingTop: 56, paddingBottom: 34 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, topTitle: { fontFamily: 'Inter_500Medium', fontSize: 17 }, content: { flex: 1, paddingTop: 54 }, heading: { fontFamily: 'Inter_500Medium', fontSize: 30, letterSpacing: -1 }, intro: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 34 }, label: { fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1, marginBottom: 8, marginTop: 18 }, input: { height: 53, borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, fontFamily: 'Inter_400Regular', fontSize: 15 }, helper: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 18 }, button: { minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }, buttonText: { fontFamily: 'Inter_500Medium', fontSize: 15 } });