import { ThemeConfig, theme } from 'antd';

/**
 * Art Design 风格 Ant Design 主题配置
 * ------------------------------------------------------------------
 * 设计令牌与 `src/styles/art-design.css` 中的 CSS 变量保持一致，
 * 视觉规范参考 XiaoheiFS/adminweb（Art Design Pro）。
 *
 * 说明：
 * 1. 所有颜色/圆角/尺寸均通过 Ant Design 官方 token 与组件 token 下发，
 *    页面侧只需使用 Ant Design 组件，无需编写 Tailwind 工具类。
 * 2. 后续若要切换到 Tailwind，可直接从本文件的 token 生成 Tailwind theme。
 */

/** 品牌主色 */
export const ART_PRIMARY = '#5d87ff';

/** 中性色阶（亮色） */
const GRAY = {
  100: '#f9fafb',
  200: '#f2f4f5',
  300: '#e6eaeb',
  400: '#dbdfe1',
  500: '#949eb7',
  600: '#7987a1',
  700: '#4d5875',
  800: '#383853',
  900: '#29343d',
};

/** 中性色阶（暗色） */
const GRAY_DARK = {
  100: '#17171c',
  200: '#1e1e24',
  300: '#2b2b34',
  400: '#3d3d49',
  500: '#73738c',
  600: '#8f8fa3',
  700: '#ababba',
  800: '#c7c7d1',
  900: '#e3e3e8',
};

/** 字体栈：界面使用系统无衬线字体，等宽字体仅用于代码 */
const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";

/** 主题模式 */
interface ThemeModeOptions {
  /** 是否暗色模式 */
  dark: boolean;
  /** 是否透明（毛玻璃）模式 */
  transparent: boolean;
}

/**
 * 生成一套完整的 Ant Design 主题配置
 * @param options.dark 暗色模式
 * @param options.transparent 透明（毛玻璃）模式：容器背景改为半透明/透明
 */
export function createArtTheme({ dark, transparent }: ThemeModeOptions): ThemeConfig {
  // 语义化取值：暗色 / 亮色
  const pick = <T,>(lightValue: T, darkValue: T): T => (dark ? darkValue : lightValue);

  // 透明模式下容器背景透明，其余模式使用实色
  const boxBg = transparent ? 'transparent' : pick('#ffffff', '#161618');
  const layoutBg = transparent ? 'transparent' : pick('#fafbfc', '#070707');
  const elevatedBg = transparent ? pick('rgba(255, 255, 255, 0.6)', 'rgba(22, 22, 24, 0.6)') : boxBg;
  const borderColor = transparent ? 'rgba(0, 0, 0, 0.1)' : pick('#e2e8ee', 'rgba(255, 255, 255, 0.12)');
  const borderSecondary = transparent ? 'rgba(0, 0, 0, 0.06)' : pick('#edeff0', 'rgba(255, 255, 255, 0.08)');
  const grayScale = dark ? GRAY_DARK : GRAY;

  return {
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      /* ---------- 品牌与语义色 ---------- */
      colorPrimary: pick(ART_PRIMARY, '#7ea1ff'),
      colorInfo: pick(ART_PRIMARY, '#7ea1ff'),
      colorSuccess: '#13deb9',
      colorWarning: '#ffae1f',
      colorError: '#ff4d4f',
      colorLink: pick(ART_PRIMARY, '#7ea1ff'),

      /* ---------- 文本 ---------- */
      colorText: pick(GRAY[900], 'rgba(255, 255, 255, 0.88)'),
      colorTextSecondary: pick(GRAY[700], 'rgba(255, 255, 255, 0.62)'),
      colorTextTertiary: pick(GRAY[600], 'rgba(255, 255, 255, 0.42)'),
      colorTextQuaternary: pick(GRAY[500], 'rgba(255, 255, 255, 0.28)'),
      colorTextHeading: pick(GRAY[900], 'rgba(255, 255, 255, 0.92)'),
      colorTextDescription: pick(GRAY[600], 'rgba(255, 255, 255, 0.42)'),

      /* ---------- 背景 ---------- */
      colorBgContainer: boxBg,
      colorBgElevated: elevatedBg,
      colorBgLayout: layoutBg,
      colorBgSpotlight: pick(GRAY[800], '#2e2e38'),
      colorBorder: borderColor,
      colorBorderSecondary: borderSecondary,
      colorSplit: borderSecondary,
      colorFillQuaternary: pick(GRAY[100], 'rgba(255, 255, 255, 0.04)'),
      colorFillTertiary: pick(GRAY[200], 'rgba(255, 255, 255, 0.06)'),

      /* ---------- 字体 ---------- */
      fontFamily: FONT_FAMILY,
      fontSize: 14,
      fontSizeHeading1: 32,
      fontSizeHeading2: 26,
      fontSizeHeading3: 22,
      fontSizeHeading4: 18,
      fontSizeHeading5: 16,
      lineHeight: 1.6,

      /* ---------- 圆角（对齐 Art Design Pro 的 --custom-radius = 0.75rem） ---------- */
      borderRadius: 6,
      borderRadiusXS: 4,
      borderRadiusSM: 6,
      borderRadiusLG: 12,
      borderRadiusOuter: 8,

      /* ---------- 控件尺寸 ---------- */
      controlHeight: 36,
      controlHeightSM: 30,
      controlHeightLG: 42,
      controlHeightXS: 26,

      /* ---------- 阴影：统一使用极轻阴影，避免“AI 风”浮夸投影 ---------- */
      boxShadow: pick(
        '0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        '0 2px 6px rgba(0, 0, 0, 0.35)',
      ),
      boxShadowSecondary:
        '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
      boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',

      /* ---------- 动效 ---------- */
      motionDurationMid: '0.2s',
      motionDurationSlow: '0.3s',

      /* ---------- 内容区留白 ---------- */
      padding: 16,
      paddingLG: 20,
      paddingXL: 24,
      margin: 16,
      marginLG: 20,
    },
    components: {
      /* ---------- 布局 ---------- */
      Layout: {
        headerBg: boxBg,
        headerHeight: 60,
        headerPadding: '0 16px 0 12px',
        siderBg: boxBg,
        bodyBg: layoutBg,
      },
      /* ---------- 菜单：42px 高、6px 圆角、选中浅主色底 ---------- */
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemColor: grayScale[700],
        itemHoverBg: pick(GRAY[200], '#252530'),
        itemHoverColor: grayScale[900],
        itemSelectedBg: pick('#eef3ff', 'rgba(93, 135, 255, 0.14)'),
        itemSelectedColor: pick(ART_PRIMARY, '#7ea1ff'),
        itemActiveBg: pick('#eef3ff', 'rgba(93, 135, 255, 0.14)'),
        itemHeight: 42,
        itemMarginInline: 8,
        itemMarginBlock: 4,
        itemBorderRadius: 6,
        subMenuItemBorderRadius: 6,
        iconSize: 18,
        collapsedIconSize: 18,
        groupTitleColor: GRAY[500],
        groupTitleFontSize: 12,
        activeBarWidth: 0,
        activeBarBorderWidth: 0,
        horizontalItemSelectedColor: ART_PRIMARY,
      },
      /* ---------- 卡片 ---------- */
      Card: {
        colorBorderSecondary: borderColor,
        headerBg: 'transparent',
        headerHeight: 54,
        headerFontSize: 16,
        headerPadding: 20,
        bodyPadding: 20,
        bodyPaddingSM: 16,
        actionsBg: 'transparent',
        extraColor: grayScale[600],
        boxShadowTertiary: 'none',
      },
      /* ---------- 表格 ---------- */
      Table: {
        headerBg: pick(GRAY[100], '#17171c'),
        headerColor: grayScale[600],
        headerSplitColor: 'transparent',
        headerBorderRadius: 0,
        borderColor: borderSecondary,
        rowHoverBg: pick(GRAY[200], '#252530'),
        rowSelectedBg: pick('#eef3ff', 'rgba(93, 135, 255, 0.14)'),
        rowSelectedHoverBg: pick('#e2ebff', 'rgba(93, 135, 255, 0.2)'),
        cellPaddingBlock: 13,
        cellPaddingInline: 16,
        footerBg: 'transparent',
        footerColor: grayScale[600],
      },
      /* ---------- 按钮 ---------- */
      Button: {
        controlHeight: 36,
        controlHeightSM: 30,
        controlHeightLG: 42,
        fontWeight: 400,
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
        defaultBorderColor: borderColor,
        defaultColor: grayScale[800],
        paddingInline: 16,
      },
      /* ---------- 表单控件 ---------- */
      Input: {
        controlHeight: 36,
        paddingInline: 12,
        activeShadow: 'none',
        hoverBorderColor: ART_PRIMARY,
        activeBorderColor: ART_PRIMARY,
      },
      InputNumber: {
        controlHeight: 36,
        activeShadow: 'none',
      },
      Select: {
        controlHeight: 36,
        optionPadding: '6px 12px',
        optionSelectedBg: pick(GRAY[200], '#2e2e38'),
        optionSelectedColor: grayScale[900],
        optionSelectedFontWeight: 400,
        borderRadiusSM: 6,
      },
      DatePicker: {
        controlHeight: 36,
        activeShadow: 'none',
      },
      Form: {
        itemMarginBottom: 20,
        labelColor: grayScale[700],
        labelFontSize: 13,
        verticalLabelPadding: '0 0 6px',
      },
      /* ---------- 反馈与弹层 ---------- */
      Modal: {
        borderRadiusLG: 12,
        titleFontSize: 16,
        headerBg: boxBg,
        contentBg: boxBg,
        paddingContentHorizontalLG: 24,
        paddingMD: 20,
      },
      Drawer: {
        paddingLG: 20,
        colorBgElevated: boxBg,
      },
      Dropdown: {
        borderRadiusLG: 10,
        paddingBlock: 6,
        controlItemBgHover: pick(GRAY[200], '#2e2e38'),
        controlItemBgActive: pick(GRAY[200], '#2e2e38'),
      },
      Popover: {
        borderRadiusLG: 10,
        paddingContentVertical: 14,
      },
      Tooltip: {
        borderRadius: 6,
        colorBgSpotlight: pick(GRAY[800], '#2e2e38'),
      },
      Message: {
        contentBg: elevatedBg,
        borderRadiusLG: 10,
      },
      Notification: {
        colorBgElevated: elevatedBg,
        borderRadiusLG: 12,
      },
      /* ---------- 数据展示 ---------- */
      Tag: {
        borderRadiusSM: 6,
        defaultBg: pick(GRAY[200], 'rgba(255, 255, 255, 0.08)'),
        defaultColor: grayScale[700],
      },
      Tabs: {
        itemColor: grayScale[600],
        itemHoverColor: ART_PRIMARY,
        itemSelectedColor: pick(ART_PRIMARY, '#7ea1ff'),
        inkBarColor: pick(ART_PRIMARY, '#7ea1ff'),
        horizontalItemGutter: 24,
        titleFontSize: 14,
        cardBg: pick(GRAY[100], '#17171c'),
      },
      Descriptions: {
        labelBg: pick(GRAY[200], 'rgba(255, 255, 255, 0.04)'),
        titleMarginBottom: 12,
        itemPaddingBottom: 12,
      },
      Statistic: {
        titleFontSize: 13,
        contentFontSize: 24,
      },
      Badge: {
        dotSize: 6,
        textFontSizeSM: 11,
      },
      Progress: {
        defaultColor: pick(ART_PRIMARY, '#7ea1ff'),
      },
      Segmented: {
        itemSelectedBg: boxBg,
        trackBg: pick(GRAY[200], 'rgba(255, 255, 255, 0.06)'),
        itemColor: grayScale[600],
        itemSelectedColor: grayScale[900],
      },
      Pagination: {
        itemSize: 32,
        itemActiveBg: 'transparent',
        colorPrimary: pick(ART_PRIMARY, '#7ea1ff'),
      },
      Steps: {
        iconSize: 28,
        titleLineHeight: 28,
      },
      Tree: {
        nodeHoverBg: pick(GRAY[200], '#252530'),
        nodeSelectedBg: pick('#eef3ff', 'rgba(93, 135, 255, 0.14)'),
        titleHeight: 34,
      },
      Collapse: {
        headerBg: 'transparent',
        headerPadding: '12px 16px',
        contentPadding: '4px 16px 16px',
      },
      Alert: {
        borderRadiusLG: 8,
        paddingContentVerticalSM: 10,
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
        fontSize: 14,
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
        colorFillAlter: pick(GRAY[100], 'rgba(255, 255, 255, 0.04)'),
      },
      Spin: {
        colorPrimary: pick(ART_PRIMARY, '#7ea1ff'),
      },
    } as ThemeConfig['components'],
  };
}

/** 亮色主题 */
export const lightTheme: ThemeConfig = createArtTheme({ dark: false, transparent: false });

/** 暗色主题 */
export const darkTheme: ThemeConfig = createArtTheme({ dark: true, transparent: false });

/** 透明（毛玻璃）模式 - 亮色 */
export const lightTransparentTheme: ThemeConfig = createArtTheme({ dark: false, transparent: true });

/** 透明（毛玻璃）模式 - 暗色 */
export const darkTransparentTheme: ThemeConfig = createArtTheme({ dark: true, transparent: true });
