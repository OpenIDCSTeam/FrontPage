import { ThemeConfig, theme } from 'antd';

/**
 * Ant Design 主题配置
 * ------------------------------------------------------------------
 * 与 src/styles/art-design.css 的分层令牌一一对应：
 *   · theme.config 决定 Ant Design 组件「内部」的渲染（尺寸、内边距、色值），
 *   · art-design.css 决定组件外框与页面级视觉。
 *
 * 三条硬约束：
 *   1. 单一强调色（云蓝 #006eff），此外只有成功/警告/危险三个语义色。
 *   2. 单一圆角梯级 4 / 6 / 8 / 10 / 12。
 *   3. 控件高度只在这里定义（controlHeight）。art-design.css 不再写
 *      height / min-height，避免两者叠加导致输入框与选择框不等高。
 */

/** 唯一强调色 */
export const ART_PRIMARY = '#006eff';
/** 暗色模式下按钮底仍用同一支蓝（保证白字对比度），文字/链接换更亮的同色 */
export const ART_PRIMARY_DARK = '#006eff';
/**
 * @deprecated 早期「蓝 → 靛」渐变终点。渐变已从设计层移除，保留导出仅作兼容。
 */
export const ART_PRIMARY_TO = '#006eff';

/** 中性色阶（亮色）—— 单一冷灰族 */
const GRAY = {
  100: '#f3f5f7',
  200: '#eaedf0',
  300: '#dfe3e8',
  400: '#c4ccd6',
  500: '#9099a6',
  600: '#5d6675',
  700: '#394150',
  800: '#232a37',
  900: '#12161f',
};

/** 中性色阶（暗色） */
const GRAY_DARK = {
  100: '#0f1013',
  200: '#16181d',
  300: '#1f2228',
  400: '#2c3038',
  500: '#666d7c',
  600: '#848c9c',
  700: '#a9b0bd',
  800: '#ccd1da',
  900: '#e8eaee',
};

/**
 * 字体交给 CSS 变量，由 src/styles/fonts.css 的字体预设决定。
 * 这样 Ant Design 组件内部的文字也跟随全局字体切换，
 * 不需要在切换时重建 ConfigProvider。
 */
const FONT_FAMILY = 'var(--font-family)';
/** 等宽：所有数值、ID、日志、端口 */
export const FONT_FAMILY_MONO = 'var(--font-mono)';

interface ThemeModeOptions {
  /** 暗色模式 */
  dark: boolean;
  /** 透明（毛玻璃）模式：容器背景半透明 */
  transparent: boolean;
}

export function createArtTheme({ dark, transparent }: ThemeModeOptions): ThemeConfig {
  const pick = <T,>(lightValue: T, darkValue: T): T => (dark ? darkValue : lightValue);

  /* ---------- 分层表面 ---------- */
  const boxBg = transparent ? 'rgba(255, 255, 255, 0.68)' : pick('#ffffff', '#15171c');
  const layoutBg = transparent ? 'transparent' : pick('#f4f5f7', '#0b0c0f');
  const elevatedBg = transparent
    ? pick('rgba(255, 255, 255, 0.88)', 'rgba(27, 30, 36, 0.9)')
    : pick('#ffffff', '#1b1e24');
  const sunkenBg = transparent ? 'rgba(242, 244, 247, 0.42)' : pick('#f2f4f7', '#0f1013');

  const borderColor = transparent
    ? 'rgba(18, 24, 40, 0.1)'
    : pick('rgba(18, 24, 40, 0.07)', 'rgba(255, 255, 255, 0.08)');
  const borderSecondary = transparent
    ? 'rgba(18, 24, 40, 0.06)'
    : pick('rgba(18, 24, 40, 0.05)', 'rgba(255, 255, 255, 0.06)');

  const grayScale = dark ? GRAY_DARK : GRAY;
  const hoverBg = pick('#f3f5f7', 'rgba(255, 255, 255, 0.05)');
  const activeSoft = pick('rgba(0, 110, 255, 0.09)', 'rgba(61, 139, 255, 0.15)');
  const accentText = pick(ART_PRIMARY, '#6ba6ff');

  return {
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      /* ---------- 强调与语义色 ---------- */
      colorPrimary: pick(ART_PRIMARY, ART_PRIMARY_DARK),
      colorInfo: pick(ART_PRIMARY, ART_PRIMARY_DARK),
      colorSuccess: pick('#1a9e6f', '#3ecf94'),
      colorWarning: pick('#c07c15', '#e0ac52'),
      colorError: pick('#d0453b', '#ef7a70'),
      colorLink: accentText,

      /* ---------- 文本 ---------- */
      colorText: pick(GRAY[900], GRAY_DARK[900]),
      colorTextSecondary: pick(GRAY[700], GRAY_DARK[700]),
      colorTextTertiary: pick(GRAY[600], GRAY_DARK[600]),
      colorTextQuaternary: pick(GRAY[500], GRAY_DARK[500]),
      colorTextHeading: pick(GRAY[900], GRAY_DARK[900]),
      colorTextDescription: pick(GRAY[600], GRAY_DARK[600]),

      /* ---------- 背景 ---------- */
      colorBgContainer: boxBg,
      colorBgElevated: elevatedBg,
      colorBgLayout: layoutBg,
      colorBgSpotlight: pick('#232a37', '#23252b'),
      colorBgMask: pick('rgba(16, 22, 40, 0.4)', 'rgba(0, 0, 0, 0.7)'),
      colorBorder: borderColor,
      colorBorderSecondary: borderSecondary,
      colorSplit: borderSecondary,
      colorFillQuaternary: sunkenBg,
      colorFillTertiary: pick(GRAY[200], 'rgba(255, 255, 255, 0.05)'),
      colorFillSecondary: pick(GRAY[300], 'rgba(255, 255, 255, 0.07)'),

      /* ---------- 字体 ---------- */
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

      /* ---------- 圆角（Shape Lock：4 / 6 / 8 / 10 / 12） ---------- */
      borderRadius: 6,
      borderRadiusXS: 4,
      borderRadiusSM: 6,
      borderRadiusLG: 10,
      borderRadiusOuter: 8,

      /* ---------- 控件高度（唯一定义处） ---------- */
      controlHeight: 36,
      controlHeightSM: 30,
      controlHeightLG: 42,
      controlHeightXS: 24,

      /* ---------- 阴影：只服务浮层，中性色 ---------- */
      boxShadow: pick(
        '0 1px 2px rgba(16, 22, 38, 0.04)',
        '0 1px 2px rgba(0, 0, 0, 0.4)',
      ),
      boxShadowSecondary: pick(
        '0 2px 6px -2px rgba(16, 22, 38, 0.08), 0 16px 40px -12px rgba(16, 22, 38, 0.16)',
        '0 2px 8px -2px rgba(0, 0, 0, 0.55), 0 16px 40px -12px rgba(0, 0, 0, 0.7)',
      ),
      boxShadowTertiary: pick('0 1px 2px rgba(16, 22, 38, 0.04)', '0 1px 3px rgba(0, 0, 0, 0.4)'),

      /* ---------- 动效（统一曲线） ---------- */
      motionDurationFast: '0.12s',
      motionDurationMid: '0.16s',
      motionDurationSlow: '0.24s',
      motionEaseInOut: 'cubic-bezier(0.32, 0.72, 0, 1)',
      motionEaseOut: 'cubic-bezier(0.16, 1, 0.3, 1)',

      /* ---------- 间距 ---------- */
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
        headerBg: '#101216',
        headerHeight: 52,
        headerPadding: '0 14px 0 8px',
        siderBg: pick('#ffffff', '#121317'),
        bodyBg: layoutBg,
      },
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemColor: grayScale[600],
        itemHoverBg: hoverBg,
        itemHoverColor: grayScale[900],
        itemSelectedBg: activeSoft,
        itemSelectedColor: accentText,
        itemActiveBg: activeSoft,
        itemHeight: 34,
        itemMarginInline: 8,
        itemMarginBlock: 2,
        itemBorderRadius: 6,
        subMenuItemBorderRadius: 6,
        iconSize: 15,
        collapsedIconSize: 16,
        /* 折叠态菜单根宽度，必须与 MainLayout 的 collapsedWidth 一致，
           否则 80px 的菜单会被 56px 的侧栏裁掉一半，图标偏出可视区 */
        collapsedWidth: 56,
        groupTitleColor: GRAY[500],
        groupTitleFontSize: 10,
        activeBarWidth: 0,
        activeBarBorderWidth: 0,
        horizontalItemSelectedColor: ART_PRIMARY,
      },
      Card: {
        colorBorderSecondary: borderColor,
        headerBg: 'transparent',
        headerHeight: 48,
        headerFontSize: 14,
        headerPadding: 18,
        bodyPadding: 18,
        bodyPaddingSM: 14,
        actionsBg: 'transparent',
        extraColor: grayScale[600],
        boxShadowTertiary: 'none',
      },
      Table: {
        headerBg: pick('#f7f8fa', 'rgba(255, 255, 255, 0.03)'),
        headerColor: grayScale[500],
        headerSplitColor: 'transparent',
        headerBorderRadius: 8,
        borderColor: borderSecondary,
        rowHoverBg: hoverBg,
        rowSelectedBg: pick('rgba(0, 110, 255, 0.06)', 'rgba(61, 139, 255, 0.12)'),
        rowSelectedHoverBg: pick('rgba(0, 110, 255, 0.1)', 'rgba(61, 139, 255, 0.16)'),
        cellPaddingBlock: 11,
        cellPaddingInline: 14,
        fontSize: 12.5,
        footerBg: 'transparent',
        footerColor: grayScale[600],
      },
      Button: {
        controlHeight: 36,
        controlHeightSM: 30,
        controlHeightLG: 42,
        fontWeight: 500,
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
        defaultBorderColor: borderColor,
        defaultColor: grayScale[800],
        paddingInline: 14,
        contentFontSize: 13,
        borderRadius: 6,
        borderRadiusSM: 6,
        borderRadiusLG: 8,
      },
      Input: {
        controlHeight: 36,
        paddingInline: 12,
        activeShadow: 'none',
        hoverBorderColor: borderColor,
        activeBorderColor: ART_PRIMARY,
      },
      InputNumber: {
        controlHeight: 36,
        activeShadow: 'none',
      },
      Select: {
        controlHeight: 36,
        optionPadding: '6px 10px',
        optionSelectedBg: hoverBg,
        optionSelectedColor: grayScale[900],
        optionSelectedFontWeight: 500,
        borderRadiusSM: 6,
        borderRadiusLG: 8,
      },
      DatePicker: {
        controlHeight: 36,
        activeShadow: 'none',
        borderRadiusSM: 6,
      },
      Form: {
        itemMarginBottom: 18,
        labelColor: grayScale[700],
        labelFontSize: 12.5,
        verticalLabelPadding: '0 0 6px',
      },
      Modal: {
        borderRadiusLG: 12,
        titleFontSize: 15,
        headerBg: 'transparent',
        contentBg: elevatedBg,
        paddingContentHorizontalLG: 22,
        paddingMD: 18,
      },
      Drawer: {
        paddingLG: 18,
        colorBgElevated: boxBg,
      },
      Dropdown: {
        borderRadiusLG: 8,
        paddingBlock: 4,
        controlItemBgHover: hoverBg,
        controlItemBgActive: hoverBg,
      },
      Popover: {
        borderRadiusLG: 8,
        paddingContentVertical: 12,
      },
      Tooltip: {
        borderRadius: 6,
        colorBgSpotlight: pick('rgba(18, 22, 31, 0.95)', 'rgba(35, 37, 43, 0.96)'),
      },
      Message: {
        contentBg: elevatedBg,
        borderRadiusLG: 8,
      },
      Notification: {
        colorBgElevated: elevatedBg,
        borderRadiusLG: 8,
      },
      Tag: {
        borderRadiusSM: 4,
        defaultBg: pick(GRAY[100], 'rgba(255, 255, 255, 0.05)'),
        defaultColor: grayScale[700],
      },
      Tabs: {
        itemColor: grayScale[600],
        itemHoverColor: grayScale[900],
        itemSelectedColor: accentText,
        inkBarColor: ART_PRIMARY,
        horizontalItemGutter: 20,
        titleFontSize: 12.5,
        cardBg: sunkenBg,
      },
      Descriptions: {
        labelBg: 'transparent',
        titleMarginBottom: 12,
        itemPaddingBottom: 12,
      },
      Statistic: {
        titleFontSize: 12,
        contentFontSize: 22,
      },
      Badge: {
        dotSize: 6,
        textFontSizeSM: 11,
      },
      Progress: {
        defaultColor: pick(ART_PRIMARY, '#2b8bff'),
      },
      Segmented: {
        itemSelectedBg: boxBg,
        trackBg: sunkenBg,
        itemColor: grayScale[600],
        itemSelectedColor: grayScale[900],
        borderRadius: 999,
      },
      Pagination: {
        itemSize: 30,
        itemActiveBg: 'transparent',
        colorPrimary: ART_PRIMARY,
      },
      Steps: {
        iconSize: 26,
        titleLineHeight: 26,
      },
      Tree: {
        nodeHoverBg: hoverBg,
        nodeSelectedBg: activeSoft,
        titleHeight: 30,
      },
      Collapse: {
        headerBg: 'transparent',
        headerPadding: '12px 14px',
        contentPadding: '4px 14px 14px',
      },
      Alert: {
        borderRadiusLG: 8,
        paddingContentVerticalSM: 9,
      },
      Empty: {
        colorTextDescription: grayScale[500],
      },
      Avatar: {
        containerSize: 32,
      },
      Breadcrumb: {
        itemColor: grayScale[600],
        lastItemColor: grayScale[900],
        linkColor: grayScale[600],
        separatorColor: GRAY[400],
        fontSize: 12.5,
        separatorMargin: 6,
      },
      Divider: {
        colorSplit: borderSecondary,
      },
      Switch: {
        trackHeight: 22,
        trackMinWidth: 42,
      },
      Checkbox: {
        borderRadiusSM: 4,
      },
      Radio: {
        radioSize: 16,
        dotSize: 6,
      },
      Upload: {
        colorFillAlter: sunkenBg,
      },
      Spin: {
        colorPrimary: pick(ART_PRIMARY, '#2b8bff'),
      },
    } as ThemeConfig['components'],
  };
}

/** 四套预设：由 ThemeContext 按当前模式选用 */
export const lightTheme = createArtTheme({ dark: false, transparent: false });
export const darkTheme = createArtTheme({ dark: true, transparent: false });
export const lightTransparentTheme = createArtTheme({ dark: false, transparent: true });
export const darkTransparentTheme = createArtTheme({ dark: true, transparent: true });
