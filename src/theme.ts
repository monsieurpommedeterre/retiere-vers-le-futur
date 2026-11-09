import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Nuances « bleu nuit » assorties au visuel (remplace le gris neutre de Mantine).
const dark: MantineColorsTuple = [
  '#C9CDD6',
  '#A8AEBD',
  '#8790A3',
  '#5F6880',
  '#3B4358',
  '#2A3044',
  '#1D2232',
  '#141A26',
  '#0C0F1C',
  '#06080F',
];

export const theme = createTheme({
  primaryColor: 'yellow',
  defaultRadius: 'lg',
  // Respecte le réglage système « réduire les animations » (les transitions deviennent instantanées).
  respectReducedMotion: true,
  colors: { dark },
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  headings: { fontFamily: 'inherit', fontWeight: '800' },
  components: {
    Button: { defaultProps: { radius: 'xl' } },
    ActionIcon: { defaultProps: { radius: 'xl' } },
  },
});
