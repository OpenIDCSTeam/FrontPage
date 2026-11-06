import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, ReactNode } from 'react'
import { ConfigProvider } from 'antd'
import type { ThemeConfig } from 'antd'
import type { Locale } from 'antd/es/locale'
import zhCN from 'antd/locale/zh_CN'
import zhTW from 'antd/locale/zh_TW'
import enUS from 'antd/locale/en_US'
import jaJP from 'antd/locale/ja_JP'
import koKR from 'antd/locale/ko_KR'
import frFR from 'antd/locale/fr_FR'
import deDE from 'antd/locale/de_DE'
import itIT from 'antd/locale/it_IT'
import ptPT from 'antd/locale/pt_PT'
import esES from 'antd/locale/es_ES'
import ruRU from 'antd/locale/ru_RU'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/ja'
import 'dayjs/locale/ko'
import 'dayjs/locale/fr'
import 'dayjs/locale/de'
import 'dayjs/locale/it'
import 'dayjs/locale/pt'
import 'dayjs/locale/es'
import 'dayjs/locale/ru'
import {
  createArtTheme,
  getThemeCssVariables,
  getThemePalette,
  ThemeMode,
  ThemePreset,
} from '../config/theme.config'
import { FontId, getSavedFontId, saveFontId, applyFontId } from '../config/fonts.config'

const ANTD_LOCALES: Record<string, Locale> = {
  'zh-cn': zhCN,
  'zh-tw': zhTW,
  'en-us': enUS,
  'ja-jp': jaJP,
  'ko-kr': koKR,
  'fr-fr': frFR,
  'de-de': deDE,
  'it-it': itIT,
  'pt-br': ptPT,
  'es-es': esES,
  'ru-ru': ruRU,
}

const DAYJS_LOCALES: Record<string, string> = {
  'zh-cn': 'zh-cn',
  'zh-tw': 'zh-tw',
  'en-us': 'en',
  'ja-jp': 'ja',
  'ko-kr': 'ko',
  'fr-fr': 'fr',
  'de-de': 'de',
  'it-it': 'it',
  'pt-br': 'pt',
  'es-es': 'es',
  'ru-ru': 'ru',
}

const resolveLanguage = () => localStorage.getItem('language') || 'zh-cn'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  themePreset: ThemePreset
  setThemePreset: (preset: ThemePreset) => void
  transparentMode: boolean
  toggleTransparentMode: () => void
  roundedMode: boolean
  toggleRoundedMode: () => void
  fontId: FontId
  setFontId: (id: FontId) => void
  getThemeConfig: () => ThemeConfig
}

type AppearanceState = {
  theme: ThemeMode
  themePreset: ThemePreset
  transparentMode: boolean
  roundedMode: boolean
  fontId: FontId
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
const PRESET_KEY = 'themePreset'
const VALID_PRESETS: ThemePreset[] = ['minimal', 'tech', 'cute']

function readInitialAppearance(): AppearanceState {
  let theme: ThemeMode = 'light'
  let themePreset: ThemePreset = 'minimal'
  let transparentMode = false
  let roundedMode = false

  try {
    const savedMode = localStorage.getItem('theme')
    const legacyMmuiMode = localStorage.getItem('mmui-dark-mode')
    if (savedMode === 'dark' || savedMode === 'light') {
      theme = savedMode
    } else if (legacyMmuiMode === 'enabled') {
      theme = 'dark'
    }

    const savedPreset = localStorage.getItem(PRESET_KEY)
    if (savedPreset && VALID_PRESETS.includes(savedPreset as ThemePreset)) {
      themePreset = savedPreset as ThemePreset
    } else {
      const legacyPreset = localStorage.getItem('activeAnimeTheme')
      if (legacyPreset === 'solid-tech-green' || legacyPreset === 'solid-klein-blue') themePreset = 'tech'
      if (legacyPreset === 'solid-warm-sunset') themePreset = 'cute'
    }

    transparentMode = localStorage.getItem('transparentMode') === 'true'
    roundedMode = localStorage.getItem('roundedMode') === 'true'
  } catch {
    // 浏览器禁用本地存储时使用默认外观。
  }

  return { theme, themePreset, transparentMode, roundedMode, fontId: getSavedFontId() }
}

function applyAppearance(state: AppearanceState): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const body = document.body
  const dark = state.theme === 'dark'
  const palette = getThemePalette(state.themePreset, dark, state.transparentMode)

  root.dataset.theme = state.theme
  root.dataset.themePreset = state.themePreset
  root.dataset.mmuiTheme = state.theme
  root.style.colorScheme = state.theme
  if (state.transparentMode) root.dataset.transparent = 'true'
  else delete root.dataset.transparent
  if (state.roundedMode) root.dataset.rounded = 'true'
  else delete root.dataset.rounded

  Object.entries(getThemeCssVariables(palette, state.roundedMode)).forEach(([name, value]) => {
    root.style.setProperty(name, value)
  })

  if (body) {
    body.dataset.mmuiTheme = state.theme
    body.style.removeProperty('background-image')
    body.style.removeProperty('background-size')
    body.style.removeProperty('background-position')
    body.style.removeProperty('background-attachment')
    body.style.removeProperty('background-color')
  }
}

const initialAppearance = readInitialAppearance()
applyAppearance(initialAppearance)

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(initialAppearance.theme)
  const [themePreset, setThemePresetState] = useState<ThemePreset>(initialAppearance.themePreset)
  const [transparentMode, setTransparentMode] = useState(initialAppearance.transparentMode)
  const [roundedMode, setRoundedMode] = useState(initialAppearance.roundedMode)
  const [fontId, setFontIdState] = useState<FontId>(initialAppearance.fontId)
  const [localeCode, setLocaleCode] = useState<string>(() => resolveLanguage())

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<{ language?: string }>).detail?.language
      setLocaleCode(next || resolveLanguage())
    }
    window.addEventListener('languageChanged', handleLanguageChange)
    return () => window.removeEventListener('languageChanged', handleLanguageChange)
  }, [])

  useEffect(() => {
    dayjs.locale(DAYJS_LOCALES[localeCode] || 'zh-cn')
  }, [localeCode])

  const antdLocale = ANTD_LOCALES[localeCode] || zhCN
  const tableLocale = {
    ...(antdLocale.Table || {}),
    emptyText: <div className="art-table-empty"><p>暂无数据</p></div>,
  }

  useLayoutEffect(() => {
    const appearance = { theme, themePreset, transparentMode, roundedMode, fontId }
    applyAppearance(appearance)
    localStorage.setItem('theme', theme)
    localStorage.setItem(PRESET_KEY, themePreset)
    localStorage.setItem('transparentMode', String(transparentMode))
    localStorage.setItem('roundedMode', String(roundedMode))
  }, [theme, themePreset, transparentMode, roundedMode, fontId])

  useLayoutEffect(() => {
    applyFontId(fontId)
    saveFontId(fontId)
  }, [fontId])

  useLayoutEffect(() => {
    localStorage.removeItem('activeAnimeTheme')
    localStorage.removeItem('animeBlurMode')
    localStorage.removeItem('liquidMode')
    localStorage.removeItem('mmui-dark-mode')
    document.documentElement.removeAttribute('data-wallpaper')
    document.documentElement.removeAttribute('data-anime-theme')
    document.documentElement.removeAttribute('data-anime-blur')
  }, [])

  const setTheme = useCallback((nextTheme: ThemeMode) => setThemeState(nextTheme), [])
  const toggleTheme = useCallback(() => {
    setThemeState(current => current === 'light' ? 'dark' : 'light')
  }, [])
  const setThemePreset = useCallback((nextPreset: ThemePreset) => {
    if (VALID_PRESETS.includes(nextPreset)) setThemePresetState(nextPreset)
  }, [])
  const toggleTransparentMode = useCallback(() => setTransparentMode(current => !current), [])
  const toggleRoundedMode = useCallback(() => setRoundedMode(current => !current), [])
  const setFontId = useCallback((id: FontId) => setFontIdState(id), [])

  const themeConfig = useMemo(() => createArtTheme({
    preset: themePreset,
    dark: theme === 'dark',
    transparent: transparentMode,
    rounded: roundedMode,
  }), [themePreset, theme, transparentMode, roundedMode])
  const getThemeConfig = useCallback(() => themeConfig, [themeConfig])

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      themePreset,
      setThemePreset,
      transparentMode,
      toggleTransparentMode,
      roundedMode,
      toggleRoundedMode,
      fontId,
      setFontId,
      getThemeConfig,
    }}>
      <ConfigProvider
        theme={themeConfig}
        locale={{ ...antdLocale, Table: tableLocale }}
        modal={{ mask: false } as any}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
