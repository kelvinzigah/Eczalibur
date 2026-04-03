// ─── Zelda-inspired dual-mode theme tokens ───────────────────────────────────
// Dark: deep forest night (#050805) + emerald green + gold + purple accents
// Light: parchment sage (#f2f9ea) + forest green + warm gold

export const DARK = {
  bgPrimary:    '#050805',
  bgSurface:    '#0a1208',
  bgCard:       '#0d1f0d',
  bgNav:        '#020b02',
  bgGlass:      'rgba(10,106,29,0.12)',
  textPrimary:  '#f2f9ea',
  textMuted:    'rgba(242,249,234,0.55)',
  textAccent:   '#4ade80',
  green:        '#4ade80',
  greenDark:    '#0a6a1d',
  gold:         '#FFD700',
  purple:       '#8b5cf6',
  purpleDim:    '#4c1d95',
  zoneGreen:    '#4ade80',
  zoneYellow:   '#FFD700',
  zoneRed:      '#ef4444',
  border:       'rgba(74,222,128,0.20)',
  borderActive: '#4ade80',
  error:        '#b02500',
  errorDark:    '#520c00',
} as const;

export const LIGHT = {
  bgPrimary:    '#f2f9ea',
  bgSurface:    '#ebf3e3',
  bgCard:       '#ffffff',
  bgNav:        '#1a4020',
  bgGlass:      'rgba(255,255,255,0.70)',
  textPrimary:  '#2a3127',
  textMuted:    '#575e52',
  textAccent:   '#0a6a1d',
  green:        '#0a6a1d',
  greenDark:    '#004b0f',
  gold:         '#B8860B',
  purple:       '#6d28d9',
  purpleDim:    '#ddd6fe',
  zoneGreen:    '#0a6a1d',
  zoneYellow:   '#92660a',
  zoneRed:      '#b02500',
  border:       'rgba(10,106,29,0.20)',
  borderActive: '#0a6a1d',
  error:        '#b02500',
  errorDark:    '#520c00',
} as const;

export type Theme = typeof DARK | typeof LIGHT;

// Backwards-compat shim for boilerplate files that still reference Colors.light/dark
export const Colors = {
  light: { icon: LIGHT.textMuted, tint: LIGHT.green, background: LIGHT.bgPrimary, text: LIGHT.textPrimary, tabIconDefault: LIGHT.textMuted, tabIconSelected: LIGHT.green },
  dark:  { icon: DARK.textMuted,  tint: DARK.green,  background: DARK.bgPrimary,  text: DARK.textPrimary,  tabIconDefault: DARK.textMuted,  tabIconSelected: DARK.green  },
};
