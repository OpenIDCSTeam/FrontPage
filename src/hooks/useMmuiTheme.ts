import { useCallback, useMemo } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export interface UseMmuiThemeReturn {
  mode: 'light' | 'dark'
  isDark: boolean
  toggleTheme: (event?: ReactMouseEvent | MouseEvent) => void
}

/** MMUI 详情页兼容适配器；主题状态唯一来源是全站 ThemeContext。 */
export function useMmuiTheme(): UseMmuiThemeReturn {
  const { theme, toggleTheme } = useTheme()
  const toggle = useCallback((_event?: ReactMouseEvent | MouseEvent) => toggleTheme(), [toggleTheme])

  return useMemo(() => ({
    mode: theme,
    isDark: theme === 'dark',
    toggleTheme: toggle,
  }), [theme, toggle])
}
