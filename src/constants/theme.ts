export const colors = {
  primary: '#1F4E79',
  primaryLight: '#E8F0F8',
  accent: '#C8A24B',
  success: '#2E7D32',
  warning: '#B26A00',
  danger: '#B3261E',
  info: '#02677A',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  border: '#E0E3E8',
  text: '#1A1C1E',
  textSecondary: '#5B6169',
  textMuted: '#8A919B',
} as const;

export const spacing = (n: number): number => n * 4;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const },
  section: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15 },
  caption: { fontSize: 12, color: colors.textSecondary },
};
