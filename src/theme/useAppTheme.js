import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export default function useAppTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return useMemo(
    () => ({
      isDark,
      colors: isDark
        ? {
            bg: '#0F141B',
            bgSoft: '#161E29',
            card: '#18222E',
            cardAlt: '#1C2734',
            border: '#2A384A',
            text: '#F3F7FD',
            textMuted: '#A6B5C8',
            primary: '#2BA6FF',
            primarySoft: '#1C3C57',
            secondaryButton: '#223142',
            danger: '#F97066',
          }
        : {
            bg: '#F2F5FA',
            bgSoft: '#EAF0F8',
            card: '#FFFFFF',
            cardAlt: '#F7FAFF',
            border: '#DCE6F2',
            text: '#142033',
            textMuted: '#5E6E84',
            primary: '#0F70D1',
            primarySoft: '#DDEBFF',
            secondaryButton: '#E9F1FC',
            danger: '#D92D20',
          },
      radius: {
        sm: 10,
        md: 14,
        lg: 18,
        xl: 24,
      },
      spacing: {
        xs: 6,
        sm: 10,
        md: 14,
        lg: 18,
        xl: 24,
      },
      typography: {
        title: {
          fontSize: 22,
          fontWeight: '800',
        },
        section: {
          fontSize: 16,
          fontWeight: '700',
        },
        body: {
          fontSize: 14,
          lineHeight: 20,
        },
        caption: {
          fontSize: 12,
          fontWeight: '600',
        },
      },
    }),
    [isDark]
  );
}
