import { ThemeConfig, theme } from 'antd'

export type ThemeMode = 'light' | 'dark'
/** 用户选择的明暗偏好；system 表示跟随浏览器/系统 */
export type ThemePreference = ThemeMode | 'system'
export type ThemePreset = 'minimal' | 'tech' | 'techLite' | 'gold' | 'cute' | 'glass'

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
    id: 'techLite',
    name: '科技简约',
    description: '浅蓝底 · 精密线',
    preview: ['#edf6fc', '#fafdff', '#087fbd'],
  },
  {
    id: 'gold',
    name: '黑金质感',
    description: '墨黑 · 琥珀金',
    preview: ['#f6f8fc', '#ffffff', '#f2a12e'],
  },
  {
    id: 'cute',
    name: '清爽可爱',
    description: '薄荷绿 · 圆润',
    preview: ['#effaf5', '#fbfffd', '#17836c'],
  },
  {
    id: 'glass',
    name: '透明炫酷',
    description: '紫雾 · 磨砂层',
    preview: ['#f0effb', '#ffffff', '#7260bf'],
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
const GRAY_TECHLITE_LIGHT: GrayScale = {
  100: '#eef6fc', 200: '#e2eef7', 300: '#cbdce9', 400: '#a7c1d6', 500: '#6f8ba3',
  600: '#4d6a84', 700: '#2f4c66', 800: '#15314b', 900: '#0c2236',
}
const GRAY_TECHLITE_DARK: GrayScale = {
  100: '#081522', 200: '#0d1e2f', 300: '#142c42', 400: '#22475f', 500: '#6f92aa',
  600: '#90b1c8', 700: '#b6cfe0', 800: '#d7e6f1', 900: '#eef7fd',
}
const GRAY_GOLD_LIGHT: GrayScale = {
  100: '#f6f8fc', 200: '#eef1f7', 300: '#dce3ed', 400: '#c0cad8', 500: '#7c8598',
  600: '#5a6478', 700: '#3b4558', 800: '#1f2937', 900: '#0f1838',
}
const GRAY_GOLD_DARK: GrayScale = {
  100: '#16130b', 200: '#1e1a10', 300: '#2b2417', 400: '#453a24', 500: '#97835b',
  600: '#bcab86', 700: '#d6c8a6', 800: '#e9dfc7', 900: '#f7f0de',
}
const GRAY_CUTE_GREEN_LIGHT: GrayScale = {
  100: '#effaf5', 200: '#e2f3ea', 300: '#cde6d9', 400: '#a8d2be', 500: '#6f9b88',
  600: '#4d7364', 700: '#325649', 800: '#1e3f34', 900: '#102c23',
}
const GRAY_CUTE_GREEN_DARK: GrayScale = {
  100: '#0d211b', 200: '#122b23', 300: '#193a2f', 400: '#285747', 500: '#74a893',
  600: '#97c4b2', 700: '#b9dbcc', 800: '#d6ecdf', 900: '#eafff5',
}
const GRAY_GLASS_LIGHT: GrayScale = {
  100: '#f4f3fc', 200: '#eceaf8', 300: '#ddd8f0', 400: '#c3bce0', 500: '#8b84a8',
  600: '#6b6584', 700: '#4d4863', 800: '#332f47', 900: '#27243a',
}
const GRAY_GLASS_DARK: GrayScale = {
  100: '#1a1829', 200: '#221f35', 300: '#2e2a45', 400: '#443d63', 500: '#948cbb',
  600: '#b7b0d6', 700: '#d3cee8', 800: '#e6e2f5', 900: '#f4f1ff',
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
      gray: GRAY_CUTE_GREEN_LIGHT,
      contentBg: '#effaf5', boxBg: '#fbfffd', sunkenBg: '#e7f6ef', elevatedBg: '#ffffff', sidebarBg: '#f6fdf9',
      cardBorder: 'rgba(24, 55, 47, 0.12)', borderStrong: 'rgba(24, 55, 47, 0.22)',
      hoverColor: 'rgba(23, 131, 108, 0.06)', activeColor: 'rgba(23, 131, 108, 0.13)', tableHeadBg: '#e1f3ea',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.85)',
      headerBg: '#fbfffd', headerText: '#18372f', headerTextSecondary: '#5d7d73',
      headerHover: 'rgba(23, 131, 108, 0.07)', headerBorder: 'rgba(24, 55, 47, 0.11)',
      headerField: '#eef9f3', headerFieldHover: '#e2f5eb',
      transparentBackdrop: 'radial-gradient(ellipse at 12% 0%, rgba(140, 226, 195, 0.45), transparent 44%), linear-gradient(135deg, #f2fcf7 0%, #e8f8f0 100%)',
      shadowXs: '0 1px 2px rgba(24, 55, 47, 0.04)', shadowSm: '0 3px 14px rgba(24, 55, 47, 0.09)',
      shadowMd: '0 8px 28px rgba(24, 55, 47, 0.13)', shadowLg: '0 20px 48px rgba(24, 55, 47, 0.18)',
    },
    dark: {
      gray: GRAY_CUTE_GREEN_DARK,
      contentBg: '#10231e', boxBg: '#19362e', sunkenBg: '#142b24', elevatedBg: '#1d4036', sidebarBg: '#132a23',
      cardBorder: 'rgba(150, 220, 190, 0.15)', borderStrong: 'rgba(150, 220, 190, 0.26)',
      hoverColor: 'rgba(120, 216, 185, 0.08)', activeColor: 'rgba(79, 195, 159, 0.18)', tableHeadBg: '#1e473a',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      headerBg: '#0d1f1a', headerText: '#e2f6ec', headerTextSecondary: '#a4c9b8',
      headerHover: 'rgba(190, 240, 220, 0.08)', headerBorder: 'rgba(150, 220, 190, 0.12)',
      headerField: 'rgba(190, 240, 220, 0.06)', headerFieldHover: 'rgba(190, 240, 220, 0.1)',
      transparentBackdrop: 'radial-gradient(ellipse at 14% 0%, rgba(28, 96, 78, 0.4), transparent 45%), linear-gradient(135deg, #132b23 0%, #10231e 100%)',
      shadowXs: '0 1px 2px rgba(0, 0, 0, 0.3)', shadowSm: '0 3px 14px rgba(0, 0, 0, 0.3)',
      shadowMd: '0 8px 30px rgba(0, 0, 0, 0.4)', shadowLg: '0 20px 48px rgba(0, 0, 0, 0.48)',
    },
  },
  techLite: {
    light: {
      gray: GRAY_TECHLITE_LIGHT,
      contentBg: '#edf6fc', boxBg: '#fafdff', sunkenBg: '#eff7fc', elevatedBg: '#ffffff', sidebarBg: '#f7fbfe',
      cardBorder: 'rgba(21, 59, 91, 0.13)', borderStrong: 'rgba(21, 59, 91, 0.24)',
      hoverColor: 'rgba(21, 96, 138, 0.06)', activeColor: 'rgba(8, 127, 189, 0.12)', tableHeadBg: '#e5f1f9',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.85)',
      headerBg: '#deeffa', headerText: '#153b5b', headerTextSecondary: '#4f718c',
      headerHover: 'rgba(21, 59, 91, 0.07)', headerBorder: '#c2ddec',
      headerField: 'rgba(255, 255, 255, 0.7)', headerFieldHover: '#f4fbff',
      transparentBackdrop: 'radial-gradient(ellipse at 82% 4%, rgba(56, 199, 238, 0.2), transparent 34%), linear-gradient(135deg, #e6f3fb 0%, #edf6fc 100%)',
      shadowXs: '0 1px 2px rgba(15, 58, 88, 0.05)', shadowSm: '0 3px 14px rgba(15, 58, 88, 0.1)',
      shadowMd: '0 8px 28px rgba(15, 58, 88, 0.15)', shadowLg: '0 20px 48px rgba(15, 58, 88, 0.2)',
    },
    dark: {
      gray: GRAY_TECHLITE_DARK,
      contentBg: '#0c1725', boxBg: '#142539', sunkenBg: '#101f31', elevatedBg: '#1a2f45', sidebarBg: '#0d1b2b',
      cardBorder: 'rgba(140, 190, 220, 0.16)', borderStrong: 'rgba(140, 190, 220, 0.28)',
      hoverColor: 'rgba(126, 190, 224, 0.08)', activeColor: 'rgba(66, 197, 236, 0.17)', tableHeadBg: '#16304a',
      insetHighlight: 'inset 0 1px 0 rgba(186, 228, 250, 0.045)',
      headerBg: '#0a1826', headerText: '#eaf7ff', headerTextSecondary: '#8eacbf',
      headerHover: 'rgba(164, 220, 244, 0.1)', headerBorder: 'rgba(115, 190, 228, 0.12)',
      headerField: 'rgba(112, 189, 225, 0.08)', headerFieldHover: 'rgba(112, 189, 225, 0.14)',
      transparentBackdrop: 'radial-gradient(ellipse at 80% 0%, rgba(23, 116, 158, 0.38), transparent 42%), linear-gradient(135deg, #0d2032 0%, #0c1725 100%)',
      shadowXs: '0 1px 2px rgba(0, 0, 0, 0.32)', shadowSm: '0 3px 14px rgba(0, 0, 0, 0.3)',
      shadowMd: '0 8px 30px rgba(0, 0, 0, 0.42)', shadowLg: '0 20px 48px rgba(0, 0, 0, 0.5)',
    },
  },
  gold: {
    light: {
      gray: GRAY_GOLD_LIGHT,
      contentBg: '#f6f8fc', boxBg: '#ffffff', sunkenBg: '#f2f5fa', elevatedBg: '#ffffff', sidebarBg: '#ffffff',
      cardBorder: 'rgba(15, 24, 56, 0.12)', borderStrong: 'rgba(15, 24, 56, 0.24)',
      hoverColor: 'rgba(88, 66, 18, 0.055)', activeColor: 'rgba(242, 161, 46, 0.14)', tableHeadBg: '#eef2f7',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.85)',
      headerBg: '#ffffff', headerText: '#0f1838', headerTextSecondary: '#65718a',
      headerHover: 'rgba(15, 24, 56, 0.06)', headerBorder: '#dce3ed',
      headerField: '#f2f5fa', headerFieldHover: '#e9eef7',
      transparentBackdrop: 'radial-gradient(ellipse at 12% 0%, rgba(242, 190, 120, 0.35), transparent 44%), linear-gradient(135deg, #fbf8f1 0%, #f2f5fa 100%)',
      shadowXs: '0 1px 2px rgba(15, 24, 56, 0.04)', shadowSm: '0 3px 14px rgba(15, 24, 56, 0.09)',
      shadowMd: '0 8px 28px rgba(15, 24, 56, 0.13)', shadowLg: '0 20px 48px rgba(15, 24, 56, 0.18)',
    },
    dark: {
      gray: GRAY_GOLD_DARK,
      contentBg: '#17150e', boxBg: '#272318', sunkenBg: '#1e1b12', elevatedBg: '#302a1d', sidebarBg: '#1c1911',
      cardBorder: 'rgba(226, 196, 130, 0.16)', borderStrong: 'rgba(226, 196, 130, 0.28)',
      hoverColor: 'rgba(242, 200, 120, 0.08)', activeColor: 'rgba(242, 161, 46, 0.18)', tableHeadBg: '#332c1c',
      insetHighlight: 'inset 0 1px 0 rgba(255, 240, 200, 0.045)',
      headerBg: '#12100a', headerText: '#f7f0de', headerTextSecondary: '#c2b28b',
      headerHover: 'rgba(242, 200, 120, 0.08)', headerBorder: 'rgba(226, 196, 130, 0.12)',
      headerField: 'rgba(242, 200, 120, 0.08)', headerFieldHover: 'rgba(242, 200, 120, 0.14)',
      transparentBackdrop: 'radial-gradient(ellipse at 82% 0%, rgba(122, 92, 32, 0.4), transparent 42%), linear-gradient(135deg, #201c12 0%, #17150e 100%)',
      shadowXs: '0 1px 2px rgba(0, 0, 0, 0.34)', shadowSm: '0 3px 14px rgba(0, 0, 0, 0.32)',
      shadowMd: '0 8px 30px rgba(0, 0, 0, 0.44)', shadowLg: '0 20px 48px rgba(0, 0, 0, 0.52)',
    },
  },
  glass: {
    light: {
      gray: GRAY_GLASS_LIGHT,
      contentBg: '#f0effb', boxBg: 'rgba(255, 255, 255, 0.72)', sunkenBg: 'rgba(244, 243, 253, 0.62)',
      elevatedBg: 'rgba(255, 255, 255, 0.94)', sidebarBg: 'rgba(255, 255, 255, 0.62)',
      cardBorder: 'rgba(151, 143, 197, 0.28)', borderStrong: 'rgba(151, 143, 197, 0.42)',
      hoverColor: 'rgba(114, 96, 191, 0.07)', activeColor: 'rgba(114, 96, 191, 0.14)', tableHeadBg: 'rgba(236, 234, 250, 0.9)',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      headerBg: 'rgba(255, 255, 255, 0.66)', headerText: '#27243a', headerTextSecondary: '#706b88',
      headerHover: 'rgba(114, 96, 191, 0.07)', headerBorder: 'rgba(151, 143, 197, 0.24)',
      headerField: 'rgba(255, 255, 255, 0.7)', headerFieldHover: 'rgba(245, 243, 255, 0.9)',
      transparentBackdrop: 'radial-gradient(ellipse at 78% 0%, rgba(176, 160, 240, 0.4), transparent 42%), linear-gradient(135deg, #f3f1fd 0%, #ebe8fa 100%)',
      shadowXs: '0 1px 2px rgba(52, 42, 105, 0.05)', shadowSm: '0 4px 16px rgba(52, 42, 105, 0.1)',
      shadowMd: '0 10px 32px rgba(52, 42, 105, 0.16)', shadowLg: '0 20px 52px rgba(52, 42, 105, 0.22)',
    },
    dark: {
      gray: GRAY_GLASS_DARK,
      contentBg: '#171628', boxBg: 'rgba(41, 37, 59, 0.78)', sunkenBg: 'rgba(30, 27, 45, 0.72)',
      elevatedBg: 'rgba(52, 47, 74, 0.94)', sidebarBg: 'rgba(31, 28, 46, 0.8)',
      cardBorder: 'rgba(173, 162, 221, 0.27)', borderStrong: 'rgba(173, 162, 221, 0.4)',
      hoverColor: 'rgba(168, 155, 240, 0.09)', activeColor: 'rgba(168, 155, 240, 0.18)', tableHeadBg: 'rgba(57, 51, 83, 0.9)',
      insetHighlight: 'inset 0 1px 0 rgba(230, 226, 250, 0.06)',
      headerBg: 'rgba(24, 22, 38, 0.86)', headerText: '#eeeafd', headerTextSecondary: '#bcb5dc',
      headerHover: 'rgba(190, 180, 250, 0.09)', headerBorder: 'rgba(173, 162, 221, 0.16)',
      headerField: 'rgba(190, 180, 250, 0.08)', headerFieldHover: 'rgba(190, 180, 250, 0.14)',
      transparentBackdrop: 'radial-gradient(ellipse at 80% 0%, rgba(96, 82, 168, 0.42), transparent 42%), linear-gradient(135deg, #1d1a31 0%, #171628 100%)',
      shadowXs: '0 1px 2px rgba(0, 0, 0, 0.34)', shadowSm: '0 3px 16px rgba(0, 0, 0, 0.34)',
      shadowMd: '0 10px 32px rgba(0, 0, 0, 0.46)', shadowLg: '0 22px 52px rgba(0, 0, 0, 0.54)',
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
    light: { primary: '#17836c', primaryHover: '#116e5a', primaryActive: '#0c5948', primarySoft: 'rgba(23, 131, 108, 0.11)', primarySofter: 'rgba(23, 131, 108, 0.06)', accentText: '#0f6f5b', primaryLight9: 'rgba(23, 131, 108, 0.08)', primaryLight8: 'rgba(23, 131, 108, 0.16)' },
    dark: { primary: '#4fc39f', primaryHover: '#70d2b3', primaryActive: '#33a887', primarySoft: 'rgba(79, 195, 159, 0.16)', primarySofter: 'rgba(79, 195, 159, 0.09)', accentText: '#79d9ba', primaryLight9: 'rgba(79, 195, 159, 0.12)', primaryLight8: 'rgba(79, 195, 159, 0.2)' },
  },
  techLite: {
    light: { primary: '#087fbd', primaryHover: '#066ca0', primaryActive: '#04567f', primarySoft: 'rgba(8, 127, 189, 0.1)', primarySofter: 'rgba(8, 127, 189, 0.055)', accentText: '#066a9e', primaryLight9: 'rgba(8, 127, 189, 0.08)', primaryLight8: 'rgba(8, 127, 189, 0.16)' },
    dark: { primary: '#3ec5ee', primaryHover: '#68d6f5', primaryActive: '#1ba6d2', primarySoft: 'rgba(62, 197, 238, 0.16)', primarySofter: 'rgba(62, 197, 238, 0.09)', accentText: '#6fd9f4', primaryLight9: 'rgba(62, 197, 238, 0.12)', primaryLight8: 'rgba(62, 197, 238, 0.2)' },
  },
  gold: {
    light: { primary: '#e39a20', primaryHover: '#c9851a', primaryActive: '#a96d10', primarySoft: 'rgba(227, 154, 32, 0.12)', primarySofter: 'rgba(227, 154, 32, 0.06)', accentText: '#96600c', primaryLight9: 'rgba(227, 154, 32, 0.08)', primaryLight8: 'rgba(227, 154, 32, 0.17)' },
    dark: { primary: '#f3b65a', primaryHover: '#f7c778', primaryActive: '#dda043', primarySoft: 'rgba(243, 182, 90, 0.16)', primarySofter: 'rgba(243, 182, 90, 0.09)', accentText: '#f5c67a', primaryLight9: 'rgba(243, 182, 90, 0.12)', primaryLight8: 'rgba(243, 182, 90, 0.2)' },
  },
  glass: {
    light: { primary: '#7260bf', primaryHover: '#5f4eab', primaryActive: '#4d3e91', primarySoft: 'rgba(114, 96, 191, 0.12)', primarySofter: 'rgba(114, 96, 191, 0.065)', accentText: '#6450b4', primaryLight9: 'rgba(114, 96, 191, 0.08)', primaryLight8: 'rgba(114, 96, 191, 0.17)' },
    dark: { primary: '#a99cf2', primaryHover: '#c0b4f8', primaryActive: '#8a7ae0', primarySoft: 'rgba(169, 156, 242, 0.17)', primarySofter: 'rgba(169, 156, 242, 0.09)', accentText: '#bdb2f8', primaryLight9: 'rgba(169, 156, 242, 0.12)', primaryLight8: 'rgba(169, 156, 242, 0.2)' },
  },
}

const SEMANTIC_COLORS: Record<ThemeMode, Pick<ThemePalette, 'success' | 'successSoft' | 'warning' | 'warningSoft' | 'danger' | 'dangerSoft'>> = {
  light: { success: '#16825d', successSoft: 'rgba(22, 130, 93, 0.11)', warning: '#a65e12', warningSoft: 'rgba(196, 125, 33, 0.13)', danger: '#c43d3d', dangerSoft: 'rgba(196, 61, 61, 0.1)' },
  dark: { success: '#50d6a2', successSoft: 'rgba(80, 214, 162, 0.14)', warning: '#f0b45f', warningSoft: 'rgba(240, 180, 95, 0.16)', danger: '#ff8585', dangerSoft: 'rgba(255, 133, 133, 0.14)' },
}

const CHART_EXTRAS: Record<ThemePreset, Record<ThemeMode, readonly [string, string, string, string]>> = {
  minimal: { light: ['#7654b8', '#188e91', '#bd6546', '#699341'], dark: ['#b69cff', '#54d5cf', '#f39a79', '#b6d879'] },
  tech: { light: ['#6554bd', '#198e82', '#c17b24', '#b6525d'], dark: ['#a99aff', '#56d9c3', '#f2be71', '#ff8b8b'] },
  techLite: { light: ['#2f7fb0', '#188e82', '#c07c24', '#b6525d'], dark: ['#6fc4ee', '#56d9c3', '#f2be71', '#ff8b8b'] },
  gold: { light: ['#8a6a2f', '#1f8a6a', '#c07c24', '#b5525d'], dark: ['#d4b06a', '#5fd2b0', '#f2c878', '#ff9a8b'] },
  cute: { light: ['#7f7ac2', '#3b9079', '#c08a2c', '#b5729a'], dark: ['#b9b2f0', '#78d8b9', '#f0c178', '#f0a0c4'] },
  glass: { light: ['#8a7ad6', '#3f9d8c', '#c08a3c', '#b86b9a'], dark: ['#c0b4f8', '#6fd9c0', '#f0c884', '#f0a0c8'] },
}

const ON_PRIMARY: Record<ThemePreset, Record<ThemeMode, string>> = {
  minimal: { light: '#ffffff', dark: '#ffffff' },
  tech: { light: '#ffffff', dark: '#092131' },
  techLite: { light: '#ffffff', dark: '#06202e' },
  gold: { light: '#2a1c05', dark: '#241a06' },
  cute: { light: '#ffffff', dark: '#06251d' },
  glass: { light: '#ffffff', dark: '#1a1430' },
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
      light: { boxBg: 'rgba(251, 255, 253, 0.8)', sunkenBg: 'rgba(231, 246, 239, 0.68)', elevatedBg: 'rgba(255, 255, 255, 0.96)', sidebarBg: 'rgba(246, 253, 249, 0.84)', cardBorder: 'rgba(24, 55, 47, 0.15)', tableHeadBg: 'rgba(225, 243, 234, 0.84)' },
      dark: { boxBg: 'rgba(25, 54, 46, 0.82)', sunkenBg: 'rgba(20, 43, 36, 0.72)', elevatedBg: 'rgba(29, 64, 54, 0.95)', sidebarBg: 'rgba(19, 42, 35, 0.86)', cardBorder: 'rgba(150, 220, 190, 0.18)', tableHeadBg: 'rgba(30, 71, 58, 0.84)' },
    },
    techLite: {
      light: { boxBg: 'rgba(250, 253, 255, 0.8)', sunkenBg: 'rgba(239, 247, 252, 0.66)', elevatedBg: 'rgba(255, 255, 255, 0.94)', sidebarBg: 'rgba(247, 251, 254, 0.84)', cardBorder: 'rgba(21, 59, 91, 0.16)', tableHeadBg: 'rgba(229, 241, 249, 0.8)' },
      dark: { boxBg: 'rgba(20, 37, 57, 0.82)', sunkenBg: 'rgba(16, 31, 49, 0.72)', elevatedBg: 'rgba(26, 47, 69, 0.94)', sidebarBg: 'rgba(13, 27, 43, 0.86)', cardBorder: 'rgba(140, 190, 220, 0.2)', tableHeadBg: 'rgba(22, 48, 74, 0.82)' },
    },
    gold: {
      light: { boxBg: 'rgba(255, 255, 255, 0.8)', sunkenBg: 'rgba(242, 245, 250, 0.68)', elevatedBg: 'rgba(255, 255, 255, 0.96)', sidebarBg: 'rgba(255, 255, 255, 0.84)', cardBorder: 'rgba(15, 24, 56, 0.15)', tableHeadBg: 'rgba(238, 242, 247, 0.82)' },
      dark: { boxBg: 'rgba(39, 35, 24, 0.82)', sunkenBg: 'rgba(30, 27, 18, 0.72)', elevatedBg: 'rgba(48, 42, 29, 0.95)', sidebarBg: 'rgba(28, 25, 17, 0.86)', cardBorder: 'rgba(226, 196, 130, 0.19)', tableHeadBg: 'rgba(51, 44, 28, 0.84)' },
    },
    glass: {
      light: { boxBg: 'rgba(255, 255, 255, 0.56)', sunkenBg: 'rgba(244, 243, 253, 0.46)', elevatedBg: 'rgba(255, 255, 255, 0.88)', sidebarBg: 'rgba(255, 255, 255, 0.5)', cardBorder: 'rgba(151, 143, 197, 0.3)', tableHeadBg: 'rgba(236, 234, 250, 0.72)' },
      dark: { boxBg: 'rgba(41, 37, 59, 0.62)', sunkenBg: 'rgba(30, 27, 45, 0.55)', elevatedBg: 'rgba(52, 47, 74, 0.88)', sidebarBg: 'rgba(31, 28, 46, 0.66)', cardBorder: 'rgba(173, 162, 221, 0.3)', tableHeadBg: 'rgba(57, 51, 83, 0.72)' },
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
    onPrimary: ON_PRIMARY[preset][mode],
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
  const radii: Record<ThemePreset, string> = {
    minimal: '10px', tech: '8px', techLite: '8px', gold: '10px', cute: '14px', glass: '14px',
  }
  return radii[preset]
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
  const controlRadius: Record<ThemePreset, number> = {
    minimal: 6, tech: 4, techLite: 4, gold: 6, cute: 10, glass: 8,
  }
  const borderRadius = rounded ? 10 : controlRadius[preset]
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
      borderRadiusLG: rounded ? 14 : preset === 'cute' || preset === 'glass' ? 12 : 10,
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
