import { ThemeConfig, theme } from 'antd'

export type ThemeMode = 'light' | 'dark'
export type ThemePreset = 'minimal' | 'tech' | 'cute'

type GrayScale = Record<100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>
type ThemeAccent = {
  primary: string
  primaryHover: string
  primaryActive: string
  primarySoft: string
  primarySofter: string
  accentText: string
  primaryLight9: string
  primaryLight8: string
}

type ThemeSurface = {
  gray: GrayScale
  contentBg: string
  boxBg: string
  sunkenBg: string
  elevatedBg: string
  sidebarBg: string
  cardBorder: string
  borderStrong: string
  hoverColor: string
  activeColor: string
  tableHeadBg: string
  insetHighlight: string
  headerBg: string
  headerText: string
  headerTextSecondary: string
  headerHover: string
  headerBorder: string
  headerField: string
  headerFieldHover: string
  transparentBackdrop: string
  shadowXs: string
  shadowSm: string
  shadowMd: string
  shadowLg: string
}

export interface ThemePalette extends ThemeAccent, ThemeSurface {
  preset: ThemePreset
  dark: boolean
  transparent: boolean
  onPrimary: string
  success: string
  successSoft: string
  warning: string
  warningSoft: string
  danger: string
  dangerSoft: string
  chartColors: readonly string[]
}

export interface ThemePresetOption {
  id: ThemePreset
  name: string
  description: string
  preview: readonly [string, string, string]
}

export const THEME_PRESET_OPTIONS: readonly ThemePresetOption[] = [
  {
    id: 'minimal',
    name: '简约纯白',
    description: '明净留白 · 克制蓝',
    preview: ['#ffffff', '#f2f6ff', '#2873e8'],
  },
  {
    id: 'tech',
    name: '科技大气',
    description: '深海蓝 · 电子青',
    preview: ['#0c1726', '#17314b', '#38c7ee'],
  },
  {
    id: 'cute',
    name: '可爱简约',
    description: '暖白粉 · 柔和莓红',
    preview: ['#fffafa', '#fff0f3', '#dc6688'],
  },
]

const FONT_FAMILY = 'var(--font-family)'
export const FONT_FAMILY_MONO = 'var(--font-mono)'

const GRAY_MINIMAL_LIGHT: GrayScale = {
  100: '#f5f7fa', 200: '#e9edf3', 300: '#d9e0e9', 400: '#bac5d2', 500: '#8793a3',
  600: '#596779', 700: '#39485b', 800: '#202d3d', 900: '#121c2a',
}
const GRAY_MINIMAL_DARK: GrayScale = {
  100: '#0b111a', 200: '#121a26', 300: '#1c2939', 400: '#2d4057', 500: '#78899d',
  600: '#9aabba', 700: '#c0ccd9', 800: '#d9e1ea', 900: '#f1f5f9',
}
const GRAY_TECH_LIGHT: GrayScale = {
  100: '#edf3f8', 200: '#dfe8f1', 300: '#c9d7e5', 400: '#a8bdcf', 500: '#70869b',
  600: '#4c647b', 700: '#2d455e', 800: '#1a3149', 900: '#10243a',
}
const GRAY_TECH_DARK: GrayScale = {
  100: '#07111d', 200: '#0c1928', 300: '#13263a', 400: '#24435e', 500: '#6e8aa4',
  600: '#8eabc5', 700: '#b1c9dd', 800: '#d0e0ed', 900: '#edf6fc',
}
const GRAY_CUTE_LIGHT: GrayScale = {
  100: '#fff6f7', 200: '#f8eaed', 300: '#efd9df', 400: '#dcbec7', 500: '#a98590',
  600: '#80616b', 700: '#62464f', 800: '#48323a', 900: '#302129',
}
const GRAY_CUTE_DARK: GrayScale = {
  100: '#1d151b', 200: '#2a1d25', 300: '#3a2933', 400: '#573c4a', 500: '#a17d8d',
  600: '#bd9ca9', 700: '#d8bdc7', 800: '#ead8de', 900: '#fff4f7',
}

const SURFACES: Record<ThemePreset, Record<ThemeMode, ThemeSurface>> = {
  minimal: {
    light: {
      gray: GRAY_MINIMAL_LIGHT,
      contentBg: '#ffffff', boxBg: '#ffffff', sunkenBg: '#f5f7fa', elevatedBg: '#ffffff', sidebarBg: '#ffffff',
      cardBorder: 'rgba(25, 43, 66, 0.1)', borderStrong: 'rgba(25, 43, 66, 0.2)',
      hoverColor: 'rgba(34, 74, 128, 0.055)', activeColor: 'rgba(40, 115, 232, 0.1)', tableHeadBg: '#f7f9fc',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      headerBg: '#ffffff', headerText: '#172334', headerTextSecondary: '#617083',
      headerHover: 'rgba(30, 55, 86, 0.06)', headerBorder: 'rgba(25, 43, 66, 0.09)',
      headerField: '#f5f7fa', headerFieldHover: '#edf1f6',
      transparentBackdrop: 'radial-gradient(ellipse at 12% 0%, rgba(196, 219, 255, 0.62), transparent 44%), linear-gradient(135deg, #f8fbff 0%, #eef4fb 100%)',
      shadowXs: '0 1px 2px rgba(23, 40, 61, 0.04)',
      shadowSm: '0 1px 2px rgba(23, 40, 61, 0.04), 0 5px 16px -8px rgba(23, 40, 61, 0.16)',
      shadowMd: '0 6px 24px -12px rgba(23, 40, 61, 0.2)', shadowLg: '0 16px 42px -22px rgba(23, 40, 61, 0.25)',
    },
    dark: {
      gray: GRAY_MINIMAL_DARK,
      contentBg: '#0b111a', boxBg: '#111a26', sunkenBg: '#0d1621', elevatedBg: '#182333', sidebarBg: '#0f1824',
      cardBorder: 'rgba(187, 207, 230, 0.12)', borderStrong: 'rgba(187, 207, 230, 0.23)',
      hoverColor: 'rgba(225, 238, 250, 0.06)', activeColor: 'rgba(80, 145, 238, 0.17)', tableHeadBg: '#152131',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.035)',
      headerBg: '#101a27', headerText: '#edf3f9', headerTextSecondary: '#91a1b4',
      headerHover: 'rgba(233, 242, 250, 0.08)', headerBorder: 'rgba(194, 212, 231, 0.1)',
      headerField: 'rgba(255, 255, 255, 0.06)', headerFieldHover: 'rgba(255, 255, 255, 0.1)',
      transparentBackdrop: 'radial-gradient(ellipse at 12% 0%, rgba(38, 78, 128, 0.48), transparent 46%), linear-gradient(135deg, #101c2a 0%, #0b111a 100%)',
      shadowXs: '0 1px 2px rgba(0, 0, 0, 0.24)', shadowSm: '0 3px 12px rgba(0, 0, 0, 0.24)',
      shadowMd: '0 8px 30px rgba(0, 0, 0, 0.34)', shadowLg: '0 20px 46px rgba(0, 0, 0, 0.42)',
    },
  },
  tech: {
    light: {
      gray: GRAY_TECH_LIGHT,
      contentBg: '#f0f5fa', boxBg: '#ffffff', sunkenBg: '#eaf1f7', elevatedBg: '#ffffff', sidebarBg: '#f7fafd',
      cardBorder: 'rgba(20, 55, 86, 0.12)', borderStrong: 'rgba(20, 55, 86, 0.23)',
      hoverColor: 'rgba(16, 83, 126, 0.06)', activeColor: 'rgba(14, 142, 196, 0.12)', tableHeadBg: '#eaf1f7',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      headerBg: '#10243a', headerText: '#eff8ff', headerTextSecondary: '#a8c1d4',
      headerHover: 'rgba(198, 233, 251, 0.1)', headerBorder: 'rgba(172, 214, 240, 0.15)',
      headerField: 'rgba(3, 16, 29, 0.32)', headerFieldHover: 'rgba(3, 16, 29, 0.5)',
      transparentBackdrop: 'radial-gradient(ellipse at 82% 4%, rgba(56, 199, 238, 0.18), transparent 32%), linear-gradient(135deg, #dceaf5 0%, #eef4fa 55%, #e2eef6 100%)',
      shadowXs: '0 1px 2px rgba(13, 40, 66, 0.05)', shadowSm: '0 3px 14px rgba(13, 40, 66, 0.1)',
      shadowMd: '0 8px 28px rgba(13, 40, 66, 0.15)', shadowLg: '0 20px 48px rgba(13, 40, 66, 0.2)',
    },
    dark: {
      gray: GRAY_TECH_DARK,
      contentBg: '#081422', boxBg: '#0f2031', sunkenBg: '#0a1928', elevatedBg: '#14283c', sidebarBg: '#0a1928',
      cardBorder: 'rgba(115, 190, 228, 0.16)', borderStrong: 'rgba(115, 190, 228, 0.28)',
      hoverColor: 'rgba(97, 184, 227, 0.08)', activeColor: 'rgba(32, 176, 223, 0.18)', tableHeadBg: '#11263a',
      insetHighlight: 'inset 0 1px 0 rgba(186, 228, 250, 0.045)',
      headerBg: '#06111d', headerText: '#eaf7ff', headerTextSecondary: '#8eacbf',
      headerHover: 'rgba(164, 220, 244, 0.1)', headerBorder: 'rgba(115, 190, 228, 0.12)',
      headerField: 'rgba(112, 189, 225, 0.08)', headerFieldHover: 'rgba(112, 189, 225, 0.14)',
      transparentBackdrop: 'radial-gradient(ellipse at 80% 0%, rgba(23, 116, 158, 0.38), transparent 42%), linear-gradient(135deg, #0d2032 0%, #081422 100%)',
      shadowXs: '0 1px 2px rgba(0, 0, 0, 0.32)', shadowSm: '0 3px 14px rgba(0, 0, 0, 0.3)',
      shadowMd: '0 8px 30px rgba(0, 0, 0, 0.42)', shadowLg: '0 20px 48px rgba(0, 0, 0, 0.5)',
    },
  },
  cute: {
    light: {
      gray: GRAY_CUTE_LIGHT,
      contentBg: '#fffafa', boxBg: '#ffffff', sunkenBg: '#fff2f4', elevatedBg: '#ffffff', sidebarBg: '#fffdfd',
      cardBorder: 'rgba(112, 57, 76, 0.12)', borderStrong: 'rgba(112, 57, 76, 0.22)',
      hoverColor: 'rgba(187, 92, 123, 0.06)', activeColor: 'rgba(220, 102, 136, 0.12)', tableHeadBg: '#fff5f6',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.85)',
      headerBg: '#fffdfd', headerText: '#4b3039', headerTextSecondary: '#91737d',
      headerHover: 'rgba(175, 82, 111, 0.07)', headerBorder: 'rgba(112, 57, 76, 0.11)',
      headerField: '#fff4f6', headerFieldHover: '#fcebef',
      transparentBackdrop: 'radial-gradient(ellipse at 12% 0%, rgba(255, 202, 215, 0.62), transparent 44%), linear-gradient(135deg, #fffafa 0%, #fff0f3 100%)',
      shadowXs: '0 1px 2px rgba(104, 54, 69, 0.04)', shadowSm: '0 3px 14px rgba(104, 54, 69, 0.09)',
      shadowMd: '0 8px 28px rgba(104, 54, 69, 0.13)', shadowLg: '0 20px 48px rgba(104, 54, 69, 0.18)',
    },
    dark: {
      gray: GRAY_CUTE_DARK,
      contentBg: '#201820', boxBg: '#2c222b', sunkenBg: '#251b24', elevatedBg: '#382a35', sidebarBg: '#291f28',
      cardBorder: 'rgba(247, 199, 215, 0.13)', borderStrong: 'rgba(247, 199, 215, 0.24)',
      hoverColor: 'rgba(244, 179, 200, 0.08)', activeColor: 'rgba(227, 114, 151, 0.18)', tableHeadBg: '#342731',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      headerBg: '#2b2029', headerText: '#fff2f6', headerTextSecondary: '#c8a8b5',
      headerHover: 'rgba(255, 224, 234, 0.08)', headerBorder: 'rgba(247, 199, 215, 0.12)',
      headerField: 'rgba(255, 235, 242, 0.06)', headerFieldHover: 'rgba(255, 235, 242, 0.1)',
      transparentBackdrop: 'radial-gradient(ellipse at 14% 0%, rgba(129, 65, 91, 0.38), transparent 45%), linear-gradient(135deg, #2a202a 0%, #201820 100%)',
      shadowXs: '0 1px 2px rgba(0, 0, 0, 0.3)', shadowSm: '0 3px 14px rgba(0, 0, 0, 0.3)',
      shadowMd: '0 8px 30px rgba(0, 0, 0, 0.4)', shadowLg: '0 20px 48px rgba(0, 0, 0, 0.48)',
    },
  },
}

const ACCENTS: Record<ThemePreset, Record<ThemeMode, ThemeAccent>> = {
  minimal: {
    light: { primary: '#2873e8', primaryHover: '#1f63cf', primaryActive: '#174fae', primarySoft: 'rgba(40, 115, 232, 0.1)', primarySofter: 'rgba(40, 115, 232, 0.055)', accentText: '#205fc5', primaryLight9: 'rgba(40, 115, 232, 0.08)', primaryLight8: 'rgba(40, 115, 232, 0.16)' },
    dark: { primary: '#5b9bff', primaryHover: '#79adff', primaryActive: '#397fe7', primarySoft: 'rgba(91, 155, 255, 0.16)', primarySofter: 'rgba(91, 155, 255, 0.09)', accentText: '#8ab7ff', primaryLight9: 'rgba(91, 155, 255, 0.12)', primaryLight8: 'rgba(91, 155, 255, 0.2)' },
  },
  tech: {
    light: { primary: '#147caf', primaryHover: '#0f6997', primaryActive: '#0a567e', primarySoft: 'rgba(20, 124, 175, 0.1)', primarySofter: 'rgba(20, 124, 175, 0.055)', accentText: '#116c9a', primaryLight9: 'rgba(20, 124, 175, 0.08)', primaryLight8: 'rgba(20, 124, 175, 0.16)' },
    dark: { primary: '#42c5ec', primaryHover: '#68d4f3', primaryActive: '#1da7d2', primarySoft: 'rgba(66, 197, 236, 0.16)', primarySofter: 'rgba(66, 197, 236, 0.09)', accentText: '#64d4f2', primaryLight9: 'rgba(66, 197, 236, 0.12)', primaryLight8: 'rgba(66, 197, 236, 0.2)' },
  },
  cute: {
    light: { primary: '#d65f82', primaryHover: '#bf4e71', primaryActive: '#a83c60', primarySoft: 'rgba(214, 95, 130, 0.11)', primarySofter: 'rgba(214, 95, 130, 0.06)', accentText: '#ae4969', primaryLight9: 'rgba(214, 95, 130, 0.08)', primaryLight8: 'rgba(214, 95, 130, 0.16)' },
    dark: { primary: '#f09ab4', primaryHover: '#f4b2c5', primaryActive: '#db7897', primarySoft: 'rgba(240, 154, 180, 0.17)', primarySofter: 'rgba(240, 154, 180, 0.09)', accentText: '#f2abc0', primaryLight9: 'rgba(240, 154, 180, 0.12)', primaryLight8: 'rgba(240, 154, 180, 0.2)' },
  },
}

const SEMANTIC_COLORS: Record<ThemeMode, Pick<ThemePalette, 'success' | 'successSoft' | 'warning' | 'warningSoft' | 'danger' | 'dangerSoft'>> = {
  light: { success: '#16825d', successSoft: 'rgba(22, 130, 93, 0.11)', warning: '#a65e12', warningSoft: 'rgba(196, 125, 33, 0.13)', danger: '#c43d3d', dangerSoft: 'rgba(196, 61, 61, 0.1)' },
  dark: { success: '#50d6a2', successSoft: 'rgba(80, 214, 162, 0.14)', warning: '#f0b45f', warningSoft: 'rgba(240, 180, 95, 0.16)', danger: '#ff8585', dangerSoft: 'rgba(255, 133, 133, 0.14)' },
}

const CHART_EXTRAS: Record<ThemePreset, Record<ThemeMode, readonly [string, string, string, string]>> = {
  minimal: { light: ['#7654b8', '#188e91', '#bd6546', '#699341'], dark: ['#b69cff', '#54d5cf', '#f39a79', '#b6d879'] },
  tech: { light: ['#6554bd', '#198e82', '#c17b24', '#b6525d'], dark: ['#a99aff', '#56d9c3', '#f2be71', '#ff8b8b'] },
  cute: { light: ['#8a64b5', '#3b9079', '#ba7c2c', '#bf536b'], dark: ['#c6a0eb', '#78d8b9', '#f0c178', '#f38ca7'] },
}

export function getThemePalette(preset: ThemePreset, dark: boolean, transparent: boolean): ThemePalette {
  const mode: ThemeMode = dark ? 'dark' : 'light'
  const surface = SURFACES[preset][mode]
  const accent = ACCENTS[preset][mode]
  const semantic = SEMANTIC_COLORS[mode]
  const transparentSurfaces: Record<ThemePreset, Record<ThemeMode, Pick<ThemeSurface, 'boxBg' | 'sunkenBg' | 'elevatedBg' | 'sidebarBg' | 'cardBorder' | 'tableHeadBg'>>> = {
    minimal: {
      light: { boxBg: 'rgba(255, 255, 255, 0.78)', sunkenBg: 'rgba(245, 248, 252, 0.62)', elevatedBg: 'rgba(255, 255, 255, 0.94)', sidebarBg: 'rgba(255, 255, 255, 0.78)', cardBorder: 'rgba(25, 43, 66, 0.13)', tableHeadBg: 'rgba(247, 249, 252, 0.72)' },
      dark: { boxBg: 'rgba(17, 26, 38, 0.8)', sunkenBg: 'rgba(13, 22, 33, 0.68)', elevatedBg: 'rgba(24, 35, 51, 0.94)', sidebarBg: 'rgba(15, 24, 36, 0.84)', cardBorder: 'rgba(187, 207, 230, 0.16)', tableHeadBg: 'rgba(21, 33, 49, 0.78)' },
    },
    tech: {
      light: { boxBg: 'rgba(255, 255, 255, 0.78)', sunkenBg: 'rgba(234, 241, 247, 0.65)', elevatedBg: 'rgba(255, 255, 255, 0.94)', sidebarBg: 'rgba(247, 250, 253, 0.82)', cardBorder: 'rgba(20, 55, 86, 0.15)', tableHeadBg: 'rgba(234, 241, 247, 0.78)' },
      dark: { boxBg: 'rgba(15, 32, 49, 0.82)', sunkenBg: 'rgba(10, 25, 40, 0.7)', elevatedBg: 'rgba(20, 40, 60, 0.94)', sidebarBg: 'rgba(10, 25, 40, 0.86)', cardBorder: 'rgba(115, 190, 228, 0.2)', tableHeadBg: 'rgba(17, 38, 58, 0.8)' },
    },
    cute: {
      light: { boxBg: 'rgba(255, 255, 255, 0.8)', sunkenBg: 'rgba(255, 242, 244, 0.68)', elevatedBg: 'rgba(255, 255, 255, 0.96)', sidebarBg: 'rgba(255, 253, 253, 0.82)', cardBorder: 'rgba(112, 57, 76, 0.15)', tableHeadBg: 'rgba(255, 245, 246, 0.82)' },
      dark: { boxBg: 'rgba(44, 34, 43, 0.82)', sunkenBg: 'rgba(37, 27, 36, 0.7)', elevatedBg: 'rgba(56, 42, 53, 0.95)', sidebarBg: 'rgba(41, 31, 40, 0.86)', cardBorder: 'rgba(247, 199, 215, 0.17)', tableHeadBg: 'rgba(52, 39, 49, 0.82)' },
    },
  }

  return {
    ...surface,
    ...accent,
    ...semantic,
    chartColors: [accent.primary, semantic.success, semantic.warning, ...CHART_EXTRAS[preset][mode].slice(0, 2), semantic.danger, ...CHART_EXTRAS[preset][mode].slice(2)],
    preset,
    dark,
    transparent,
    onPrimary: preset === 'tech' && dark ? '#092131' : preset === 'cute' ? dark ? '#492431' : '#4b2634' : '#ffffff',
    contentBg: transparent ? 'transparent' : surface.contentBg,
    ...(transparent ? transparentSurfaces[preset][mode] : {}),
  }
}

export function getThemeCssVariables(palette: ThemePalette, rounded: boolean): Record<string, string> {
  const { gray } = palette
  const cssVars: Record<string, string> = {
    '--main-color': palette.primary,
    '--art-primary-hover': palette.primaryHover,
    '--art-primary-active': palette.primaryActive,
    '--art-primary-soft': palette.primarySoft,
    '--art-primary-softer': palette.primarySofter,
    '--art-accent-text': palette.accentText,
    '--art-on-primary': palette.onPrimary,
    '--art-primary-light-9': palette.primaryLight9,
    '--art-primary-light-8': palette.primaryLight8,
    '--art-gray-100': gray[100], '--art-gray-200': gray[200], '--art-gray-300': gray[300],
    '--art-gray-400': gray[400], '--art-gray-500': gray[500], '--art-gray-600': gray[600],
    '--art-gray-700': gray[700], '--art-gray-800': gray[800], '--art-gray-900': gray[900],
    '--art-content-bg': palette.contentBg,
    '--art-box-bg': palette.boxBg,
    '--art-sunken-bg': palette.sunkenBg,
    '--art-elevated-bg': palette.elevatedBg,
    '--art-sidebar-bg': palette.sidebarBg,
    '--art-card-border': palette.cardBorder,
    '--art-border-strong': palette.borderStrong,
    '--art-hover-color': palette.hoverColor,
    '--art-active-color': palette.activeColor,
    '--art-table-head-bg': palette.tableHeadBg,
    '--art-inset-highlight': palette.insetHighlight,
    '--art-header-bg': palette.headerBg,
    '--art-header-text': palette.headerText,
    '--art-header-text-2': palette.headerTextSecondary,
    '--art-header-hover': palette.headerHover,
    '--art-header-border': palette.headerBorder,
    '--art-header-field': palette.headerField,
    '--art-header-field-hover': palette.headerFieldHover,
    '--art-transparent-backdrop': palette.transparentBackdrop,
    '--art-success': palette.success, '--art-success-soft': palette.successSoft,
    '--art-warning': palette.warning, '--art-warning-soft': palette.warningSoft,
    '--art-danger': palette.danger, '--art-danger-soft': palette.dangerSoft,
    '--art-error': palette.danger,
    '--art-shadow-xs': palette.shadowXs, '--art-shadow-sm': palette.shadowSm,
    '--art-shadow-md': palette.shadowMd, '--art-shadow-lg': palette.shadowLg,
    '--art-radius-xs': rounded ? '7px' : '4px',
    '--art-radius-sm': rounded ? '9px' : '6px',
    '--art-radius-md': rounded ? '12px' : '8px',
    '--art-radius-card': rounded ? '16px' : presetCardRadius(palette.preset),
    '--art-radius-lg': rounded ? '20px' : '12px',
    '--art-radius-pill': '999px',
    '--art-header-height': '56px',
    '--art-sidebar-width': '224px',
    '--art-sidebar-collapsed-width': '60px',
    '--default-border': 'var(--art-gray-200)',
    '--default-border-dashed': 'var(--art-gray-300)',
    '--default-bg-color': 'var(--art-content-bg)',
    '--default-box-color': 'var(--art-box-bg)',
    '--text-primary': 'var(--art-gray-900)',
    '--text-secondary': 'var(--art-gray-700)',
    '--text-tertiary': 'var(--art-gray-600)',
    '--bg-primary': 'var(--art-content-bg)',
    '--bg-secondary': 'var(--art-gray-200)',
    '--bg-card': 'var(--art-box-bg)',
    '--border-primary': 'var(--art-gray-200)',
    '--border-hover': 'var(--art-border-strong)',
    '--accent-primary': 'var(--main-color)',
    '--gradient-primary': 'var(--main-color)',
    '--gradient-bg': 'var(--art-content-bg)',
    '--art-gradient': 'var(--main-color)',
    '--art-indigo': 'var(--main-color)',
    '--mmui-primary': palette.primary,
    '--mmui-accent-blue': palette.primary,
    '--mmui-accent-blue-rgb': hexToRgb(palette.primary),
    '--mmui-accent-green': palette.success,
    '--mmui-success': palette.success,
    '--mmui-warning': palette.warning,
    '--mmui-error': palette.danger,
    '--mmui-font-family': 'var(--font-family)',
    '--mmui-radius': 'var(--art-radius-card)',
    '--mmui-radius-sm': 'var(--art-radius-sm)',
    '--mmui-radius-lg': 'var(--art-radius-lg)',
    '--mmui-radius-btn': 'var(--art-radius-sm)',
    '--mmui-page-gradient': palette.transparent ? palette.transparentBackdrop : palette.contentBg,
    '--mmui-bg': palette.contentBg,
    '--mmui-text': gray[900],
    '--mmui-text-soft': gray[700],
    '--mmui-text-muted': gray[600],
    '--mmui-heading': gray[900],
    '--mmui-border': palette.cardBorder,
    '--mmui-divider': palette.cardBorder,
    '--mmui-shell-border': palette.cardBorder,
    '--mmui-surface': palette.boxBg,
    '--mmui-surface-elevated': palette.elevatedBg,
    '--mmui-card-surface': palette.boxBg,
    '--mmui-card-surface-elevated': palette.elevatedBg,
    '--mmui-card-border': palette.cardBorder,
    '--mmui-card-shadow': palette.shadowXs,
    '--mmui-card-title': gray[900],
    '--mmui-card-subtitle': gray[600],
    '--mmui-header-bg': palette.headerBg,
    '--mmui-sidebar-text': gray[700],
    '--mmui-sidebar-icon': gray[600],
    '--mmui-sidebar-hover': palette.hoverColor,
    '--mmui-sidebar-active': palette.primary,
    '--mmui-sidebar-active-text': palette.onPrimary,
    '--mmui-scrollbar-track': 'transparent',
    '--mmui-scrollbar-thumb': gray[400],
    '--mmui-accent-blue-soft': palette.primarySoft,
    '--mmui-monitor-unit': gray[500],
    '--mmui-screen-overlay': `linear-gradient(to bottom, ${palette.primarySoft}, transparent)`,
    '--mmui-screen-surface': `linear-gradient(180deg, ${palette.boxBg}, ${palette.sunkenBg})`,
    '--mmui-screen-line': palette.primarySofter,
    '--mmui-screen-line-opacity': '0.5',
    '--mmui-power-ring-bg': palette.primarySofter,
    '--mmui-power-ring-border': palette.primary,
    '--mmui-power-ring-color': palette.primary,
    '--mmui-card-action-bg': palette.boxBg,
    '--mmui-card-action-text': gray[900],
    '--mmui-card-action-border': palette.cardBorder,
    '--mmui-fill-secondary': palette.hoverColor,
    '--mmui-bg-soft': palette.sunkenBg,
    '--mmui-mobile-drawer-bg': palette.boxBg,
  }
  palette.chartColors.forEach((color, index) => {
    cssVars[`--art-chart-${index + 1}`] = color
  })

  return cssVars
}

function presetCardRadius(preset: ThemePreset): string {
  return preset === 'tech' ? '8px' : preset === 'cute' ? '14px' : '10px'
}

function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map(char => `${char}${char}`).join('')
    : normalized
  return (value.match(/.{2}/g) || ['0', '0', '0']).slice(0, 3).map(channel => parseInt(channel, 16)).join(', ')
}

export function createArtTheme({
  preset,
  dark,
  transparent,
  rounded = false,
}: {
  preset: ThemePreset
  dark: boolean
  transparent: boolean
  rounded?: boolean
}): ThemeConfig {
  const palette = getThemePalette(preset, dark, transparent)
  const { gray } = palette
  const borderRadius = rounded ? 10 : preset === 'cute' ? 10 : preset === 'tech' ? 4 : 6
  const hoverBg = palette.hoverColor

  return {
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: palette.primary,
      colorTextLightSolid: palette.onPrimary,
      colorPrimaryHover: palette.primaryHover,
      colorPrimaryActive: palette.primaryActive,
      colorPrimaryBg: palette.primarySofter,
      colorPrimaryBgHover: palette.primarySoft,
      colorInfo: palette.primary,
      colorSuccess: palette.success,
      colorWarning: palette.warning,
      colorError: palette.danger,
      colorLink: palette.accentText,
      colorText: gray[900],
      colorTextSecondary: gray[700],
      colorTextTertiary: gray[600],
      colorTextQuaternary: gray[500],
      colorTextHeading: gray[900],
      colorTextDescription: gray[600],
      colorBgContainer: palette.boxBg,
      colorBgElevated: palette.elevatedBg,
      colorBgLayout: palette.contentBg,
      colorBgSpotlight: dark ? gray[800] : gray[900],
      colorBgMask: dark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(20, 33, 48, 0.42)',
      colorBorder: palette.cardBorder,
      colorBorderSecondary: palette.cardBorder,
      colorSplit: palette.cardBorder,
      colorFillQuaternary: palette.sunkenBg,
      colorFillTertiary: palette.hoverColor,
      colorFillSecondary: palette.activeColor,
      fontFamily: FONT_FAMILY,
      fontFamilyCode: FONT_FAMILY_MONO,
      fontSize: 13.5,
      fontSizeSM: 12,
      fontSizeLG: 15,
      fontSizeHeading1: 26,
      fontSizeHeading2: 22,
      fontSizeHeading3: 18,
      fontSizeHeading4: 16,
      fontSizeHeading5: 14,
      lineHeight: 1.6,
      borderRadius,
      borderRadiusXS: rounded ? 7 : 4,
      borderRadiusSM: rounded ? 9 : 6,
      borderRadiusLG: rounded ? 14 : preset === 'cute' ? 12 : 10,
      borderRadiusOuter: rounded ? 12 : 8,
      controlHeight: 38,
      controlHeightSM: 32,
      controlHeightLG: 44,
      controlHeightXS: 26,
      boxShadow: palette.shadowXs,
      boxShadowSecondary: palette.shadowMd,
      boxShadowTertiary: palette.shadowXs,
      motionDurationFast: '0.12s',
      motionDurationMid: '0.16s',
      motionDurationSlow: '0.24s',
      motionEaseInOut: 'cubic-bezier(0.32, 0.72, 0, 1)',
      motionEaseOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
      padding: 16,
      paddingLG: 20,
      paddingXL: 24,
      margin: 16,
      marginLG: 20,
      lineWidth: 1,
      wireframe: false,
    },
    components: {
      Layout: {
        headerBg: palette.headerBg,
        headerColor: palette.headerText,
        headerHeight: 56,
        headerPadding: '0 18px 0 12px',
        siderBg: palette.sidebarBg,
        bodyBg: palette.contentBg,
      },
      Menu: {
        itemBg: 'transparent', subMenuItemBg: 'transparent', itemColor: gray[600],
        itemHoverBg: hoverBg, itemHoverColor: gray[900], itemSelectedBg: palette.activeColor,
        itemSelectedColor: palette.accentText, itemActiveBg: palette.activeColor, itemHeight: 38,
        itemMarginInline: 8, itemMarginBlock: 3, itemBorderRadius: rounded ? 12 : borderRadius,
        subMenuItemBorderRadius: rounded ? 12 : borderRadius, iconSize: 16, collapsedIconSize: 17,
        collapsedWidth: 60, groupTitleColor: gray[500], groupTitleFontSize: 10,
        activeBarWidth: 0, activeBarBorderWidth: 0, horizontalItemSelectedColor: palette.primary,
      },
      Card: {
        colorBorderSecondary: palette.cardBorder, headerBg: 'transparent', headerHeight: 48,
        headerFontSize: 14, headerPadding: 18, bodyPadding: 18, bodyPaddingSM: 14,
        actionsBg: 'transparent', extraColor: gray[600], boxShadowTertiary: 'none',
      },
      Table: {
        headerBg: palette.tableHeadBg, headerColor: gray[600], headerSplitColor: 'transparent',
        headerBorderRadius: rounded ? 14 : borderRadius, borderColor: palette.cardBorder,
        rowHoverBg: hoverBg, rowSelectedBg: palette.primarySofter, rowSelectedHoverBg: palette.primarySoft,
        cellPaddingBlock: 11, cellPaddingInline: 14, fontSize: 12.5, footerBg: 'transparent', footerColor: gray[600],
      },
      Button: {
        controlHeight: 38, controlHeightSM: 32, controlHeightLG: 44, fontWeight: 550,
        primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none',
        defaultBorderColor: palette.cardBorder, defaultColor: gray[800], paddingInline: 14,
        contentFontSize: 13, borderRadius, borderRadiusSM: rounded ? 9 : borderRadius,
        borderRadiusLG: rounded ? 12 : 8,
      },
      Input: { controlHeight: 38, paddingInline: 12, activeShadow: 'none', hoverBorderColor: palette.borderStrong, activeBorderColor: palette.primary },
      InputNumber: { controlHeight: 38, activeShadow: 'none' },
      Select: { controlHeight: 38, optionPadding: '7px 11px', optionSelectedBg: hoverBg, optionSelectedColor: gray[900], optionSelectedFontWeight: 550, borderRadiusSM: rounded ? 9 : borderRadius, borderRadiusLG: rounded ? 12 : 8 },
      DatePicker: { controlHeight: 38, activeShadow: 'none', borderRadiusSM: rounded ? 9 : borderRadius },
      Form: { itemMarginBottom: 18, labelColor: gray[700], labelFontSize: 12.5, verticalLabelPadding: '0 0 6px' },
      Modal: { borderRadiusLG: rounded ? 18 : 12, titleFontSize: 15, headerBg: 'transparent', contentBg: palette.elevatedBg, paddingContentHorizontalLG: 22, paddingMD: 18 },
      Drawer: { paddingLG: 18, colorBgElevated: palette.boxBg },
      Dropdown: { borderRadiusLG: rounded ? 14 : 8, paddingBlock: 4, controlItemBgHover: hoverBg, controlItemBgActive: palette.activeColor },
      Popover: { borderRadiusLG: rounded ? 14 : 8, paddingContentVertical: 12 },
      Tooltip: { borderRadius: rounded ? 9 : 6, colorBgSpotlight: dark ? '#182333' : '#172334' },
      Message: { contentBg: palette.elevatedBg, borderRadiusLG: rounded ? 12 : 8 },
      Notification: { colorBgElevated: palette.elevatedBg, borderRadiusLG: rounded ? 14 : 8 },
      Tag: { borderRadiusSM: rounded ? 8 : 4, defaultBg: palette.sunkenBg, defaultColor: gray[700] },
      Tabs: { itemColor: gray[600], itemHoverColor: gray[900], itemSelectedColor: palette.accentText, inkBarColor: palette.primary, horizontalItemGutter: 20, titleFontSize: 12.5, cardBg: palette.sunkenBg },
      Descriptions: { labelBg: 'transparent', titleMarginBottom: 12, itemPaddingBottom: 12 },
      Statistic: { titleFontSize: 12, contentFontSize: 22 },
      Badge: { dotSize: 7, textFontSizeSM: 11 },
      Progress: { defaultColor: palette.primary },
      Segmented: { itemSelectedBg: palette.boxBg, trackBg: palette.sunkenBg, itemColor: gray[600], itemSelectedColor: gray[900], borderRadius: rounded ? 12 : 999 },
      Pagination: { itemSize: 32, itemActiveBg: palette.activeColor, colorPrimary: palette.primary },
      Steps: { iconSize: 26, titleLineHeight: 26 },
      Tree: { nodeHoverBg: hoverBg, nodeSelectedBg: palette.activeColor, titleHeight: 32 },
      Collapse: { headerBg: 'transparent', headerPadding: '12px 14px', contentPadding: '4px 14px 14px' },
      Alert: { borderRadiusLG: rounded ? 14 : 8, paddingContentVerticalSM: 9 },
      Empty: { colorTextDescription: gray[500] },
      Avatar: { containerSize: 32 },
      Breadcrumb: { itemColor: gray[600], lastItemColor: gray[900], linkColor: gray[600], separatorColor: gray[400], fontSize: 12.5, separatorMargin: 6 },
      Divider: { colorSplit: palette.cardBorder },
      Switch: { trackHeight: 22, trackMinWidth: 42 },
      Checkbox: { borderRadiusSM: rounded ? 7 : 4 },
      Radio: { radioSize: 16, dotSize: 6 },
      Upload: { colorFillAlter: palette.sunkenBg },
      Spin: { colorPrimary: palette.primary },
    } as ThemeConfig['components'],
  }
}

export const lightTheme = createArtTheme({ preset: 'minimal', dark: false, transparent: false })
export const darkTheme = createArtTheme({ preset: 'minimal', dark: true, transparent: false })
export const lightTransparentTheme = createArtTheme({ preset: 'minimal', dark: false, transparent: true })
export const darkTransparentTheme = createArtTheme({ preset: 'minimal', dark: true, transparent: true })
