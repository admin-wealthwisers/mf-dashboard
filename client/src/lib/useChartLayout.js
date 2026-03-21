import { useMemo } from 'react';
import { darkLayout, lightLayout } from './chartTheme';
import { useTheme } from './ThemeContext';

export function useChartLayout(overrides) {
  const { isDark } = useTheme();
  return useMemo(() => {
    const base = isDark ? darkLayout : lightLayout;
    if (!overrides) return base;
    return { ...base, ...overrides };
  }, [isDark, overrides]);
}
