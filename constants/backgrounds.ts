/**
 * Background image assets.
 *
 * Onboarding + PIN screens  → BG.onboarding
 * Parent / child general     → isDark ? BG.dark : BG.light
 * Child QUESTS tab           → QUEST_BG[`${gender}-${isDark ? 'dark' : 'light'}`]
 */

export const BG = {
  onboarding:    require('@/assets/images/onboarding-bg.jpg'),
  dark:          require('@/assets/images/bg-dark.jpg'),
  light:         require('@/assets/images/bg-light.jpg'),
} as const;

// React Native static require() returns a number (resource ID)
export const QUEST_BG: Record<string, number> = {
  'male-dark':    require('@/assets/images/child-bg-dark-boy.jpg'),
  'male-light':   require('@/assets/images/child-bg-light-boy.jpg'),
  'female-dark':  require('@/assets/images/child-bg-dark-girl.jpg'),
  'female-light': require('@/assets/images/child-bg-light-girl.jpg'),
};

/** Overlay colour that sits between the background image and the content */
export function overlayColor(isDark: boolean, opacity = 0.50): string {
  return isDark
    ? `rgba(5,8,5,${opacity})`
    : `rgba(242,249,234,${opacity})`;
}
