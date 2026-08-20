import React, { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export function Screen({ children, scroll = true, style }: PropsWithChildren<{ scroll?: boolean; style?: StyleProp<ViewStyle> }>) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const content = <View style={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 }, style]}>{children}</View>;
  return <View style={[styles.root, { backgroundColor: colors.background }]}>{scroll ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}</View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, scroll: { flexGrow: 1 }, content: { paddingHorizontal: 20 } });