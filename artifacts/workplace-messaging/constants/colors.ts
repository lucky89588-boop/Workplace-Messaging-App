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
    text: '#25282D',
    tint: '#0A5C8A',
    background: '#F2F2F6',
    foreground: '#25282D',
    card: 'rgba(255,255,255,0.78)',
    cardForeground: '#25282D',
    primary: '#095CF2',
    primaryForeground: '#FFFFFF',
    secondary: '#E7E7EE',
    secondaryForeground: '#3F5566',
    muted: '#E1E2E8',
    mutedForeground: '#59636D',
    accent: '#8E1F6B',
    accentForeground: '#FFFFFF',
    destructive: '#5B2A86',
    destructiveForeground: '#FFFFFF',
    border: 'rgba(63,85,102,0.18)',
    input: '#D9DBE3',
    glass: 'rgba(255,255,255,0.68)',
    glassStrong: 'rgba(255,255,255,0.9)',
    bubbleIncoming: '#F2F2F6',
    bubbleOutgoing: '#E6E7ED',
    messageText: '#25282D',
    success: '#33DC8D',
    statusDone: '#33DC8D',
    statusAttention: '#FB9A02',
    statusEmergency: '#EA124A',
    royalBlue: '#095CF2',
    signatureStart: '#16A8FB',
    signatureEnd: '#7A2BE0',
    navy: '#3F5566',
    lavender: '#E9E5F0',
    senderColors: ['#6B124F', '#4F1495', '#29267F', '#064A70', '#075959', '#2F414D', '#432064', '#63341D'],
  },
  dark: {
    text: '#F2F2F6',
    tint: '#8CC9EA',
    background: '#12151A',
    foreground: '#F2F2F6',
    card: 'rgba(35,39,47,0.82)',
    cardForeground: '#F2F2F6',
    primary: '#6FA4FF',
    primaryForeground: '#12151A',
    secondary: '#252A33',
    secondaryForeground: '#D5D9E1',
    muted: '#242832',
    mutedForeground: '#B5BBC4',
    accent: '#D58BC2',
    accentForeground: '#12151A',
    destructive: '#C3A4DE',
    destructiveForeground: '#12151A',
    border: 'rgba(213,139,194,0.2)',
    input: '#30353F',
    glass: 'rgba(31,35,43,0.76)',
    glassStrong: 'rgba(41,46,56,0.95)',
    bubbleIncoming: '#242832',
    bubbleOutgoing: '#2D313A',
    messageText: '#EEF0F4',
    success: '#33DC8D',
    statusDone: '#33DC8D',
    statusAttention: '#FB9A02',
    statusEmergency: '#EA124A',
    royalBlue: '#6FA4FF',
    signatureStart: '#72C9F5',
    signatureEnd: '#B28AE8',
    navy: '#3F5566',
    lavender: '#312C3B',
    senderColors: ['#D58BC2', '#C19BEA', '#AAA8F0', '#8CC9EA', '#8BD0D0', '#B6C4CC', '#C3A4DE', '#D9B091'],
  },
  radius: 24,
};

export default colors;
