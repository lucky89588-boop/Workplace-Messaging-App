import colors from '@/constants/colors';

export function getSenderColor(senderId: string, isDark: boolean) {
  const palette = isDark ? colors.dark.senderColors : colors.light.senderColors;
  const index = Array.from(senderId).reduce((sum, character) => sum + character.charCodeAt(0), 0) % palette.length;
  return palette[index];
}