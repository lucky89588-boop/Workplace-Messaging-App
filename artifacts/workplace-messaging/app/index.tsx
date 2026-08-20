import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/PressableScale';
import { useColors } from '@/hooks/useColors';

export default function WelcomeScreen() {
  const colors = useColors();
  return <View style={[styles.root, { backgroundColor: colors.navy }]}>
    <View style={styles.brand}><Image source={require('@/assets/images/company-logo.png')} style={styles.logo} accessibilityLabel="Bridging Abilities company logo" /><Text style={styles.brandName}>Bridging Abilities</Text><Text style={styles.tagline}>A clearer way to work together.</Text></View>
    <View style={styles.bottom}><Text style={styles.welcome}>Welcome back</Text><Text style={styles.copy}>Sign in to your private Northstar workspace.</Text><PressableScale onPress={() => router.replace('/(tabs)')} style={[styles.primary, { backgroundColor: colors.accent }]}><Text style={[styles.primaryText, { color: colors.accentForeground }]}>Continue as demo admin</Text><Ionicons name="arrow-forward" size={18} color={colors.accentForeground} /></PressableScale><PressableScale onPress={() => router.push('/signup')} style={styles.secondary}><Text style={styles.secondaryText}>Create a staff account</Text></PressableScale><Text style={styles.note}>New staff accounts require management approval.</Text></View>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, paddingHorizontal: 26, justifyContent: 'space-between', paddingTop: 78, paddingBottom: 44 }, brand: { alignItems: 'center' }, logo: { width: 190, height: 190, resizeMode: 'contain', marginBottom: 10 }, brandName: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 }, tagline: { color: 'rgba(255,255,255,0.76)', fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 8 }, bottom: { gap: 12 }, welcome: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 27, letterSpacing: -0.8 }, copy: { color: 'rgba(255,255,255,0.76)', fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 8 }, primary: { minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }, primaryText: { fontFamily: 'Inter_700Bold', fontSize: 14 }, secondary: { minHeight: 46, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: 'rgba(255,255,255,0.92)', fontFamily: 'Inter_600SemiBold', fontSize: 14 }, note: { color: 'rgba(255,255,255,0.58)', textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 } });