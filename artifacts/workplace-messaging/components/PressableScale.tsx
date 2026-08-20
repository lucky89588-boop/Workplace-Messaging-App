import React, { PropsWithChildren } from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';
export function PressableScale({ children, style, ...props }: PropsWithChildren<PressableProps>) {
  return <Pressable {...props} style={(state) => [styles.base, typeof style === 'function' ? style(state) : style, state.pressed && styles.pressed]}>{children}</Pressable>;
}
const styles = StyleSheet.create({ base: { transform: [{ scale: 1 }] }, pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] } });