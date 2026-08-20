/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#13283A',
    tint: '#397A7F',
    background: '#F5F7F6',
    foreground: '#13283A',
    card: 'rgba(255,255,255,0.78)',
    cardForeground: '#13283A',
    primary: '#397A7F',
    primaryForeground: '#FFFFFF',
    secondary: '#E7EFEC',
    secondaryForeground: '#2B4B50',
    muted: '#EAF0EE',
    mutedForeground: '#71818A',
    accent: '#F1C58B',
    accentForeground: '#5D3D21',
    destructive: '#C65C5C',
    destructiveForeground: '#FFFFFF',
    border: 'rgba(57,122,127,0.16)',
    input: '#E1E9E6',
    glass: 'rgba(255,255,255,0.68)',
    glassStrong: 'rgba(255,255,255,0.9)',
    bubbleIncoming: '#EAF0EE',
    bubbleOutgoing: '#397A7F',
    success: '#4D9A77',
    navy: '#13283A',
    lavender: '#E9E7F3',
  },
  dark: {
    text: '#F2F7F5',
    tint: '#83C7C0',
    background: '#101C24',
    foreground: '#F2F7F5',
    card: 'rgba(29,45,55,0.78)',
    cardForeground: '#F2F7F5',
    primary: '#83C7C0',
    primaryForeground: '#10272B',
    secondary: '#20353E',
    secondaryForeground: '#D4E5E2',
    muted: '#1B3038',
    mutedForeground: '#91A5AC',
    accent: '#E4B97F',
    accentForeground: '#2F2115',
    destructive: '#E07B7B',
    destructiveForeground: '#2A1111',
    border: 'rgba(131,199,192,0.18)',
    input: '#263B44',
    glass: 'rgba(28,45,55,0.72)',
    glassStrong: 'rgba(38,57,67,0.94)',
    bubbleIncoming: '#20353E',
    bubbleOutgoing: '#397A7F',
    success: '#72B894',
    navy: '#0C1821',
    lavender: '#313144',
  },
  radius: 24,
};

export default colors;
