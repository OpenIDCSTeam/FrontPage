/**
 * 字体预设
 * ------------------------------------------------------------------
 * 与 src/styles/fonts.css 中的 `html[data-font="…"]` 一一对应。
 * 新增一档字体：这里加一项，fonts.css 里加一段变量覆盖即可。
 * 选择结果持久化在 localStorage 的 `fontId`。
 *
 * 加载策略：默认预设是 hybrid（纯系统字体栈，零下载）。
 * Maple Mono 约 6MB，由 prefetchCustomFonts() 在页面空闲时后台
 * 拉取并注册，用户切到 maple 预设时瞬时生效。
 */

export type FontId = 'maple' | 'hybrid' | 'sans';

export interface FontOption {
  id: FontId;
  /** 面板上显示的名称 */
  name: string;
  /** 一句话说明适用场景 */
  desc: string;
  /** 面板上的预览样例（用该字体渲染） */
  sample: string;
  /** 该预设的字体栈，用于在面板里就地预览（不必先切换） */
  previewStack: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'hybrid',
    name: '混排（默认）',
    desc: '中文用系统黑体，数据用等宽，零下载',
    sample: '8 核 · 256 MB',
    previewStack:
      "'Segoe UI Variable Text', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei UI', sans-serif",
  },
  {
    id: 'maple',
    name: 'Maple Mono',
    desc: '全局等宽，数字与 ID 天然对齐（后台预载）',
    sample: '10.66.25.202',
    previewStack: "'Maple Mono', monospace",
  },
  {
    id: 'sans',
    name: '系统无衬线',
    desc: '完全跟随操作系统界面字体',
    sample: 'Controller-01',
    previewStack: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei UI', sans-serif",
  },
];

export const DEFAULT_FONT_ID: FontId = 'hybrid';

const STORAGE_KEY = 'fontId';

/** 读取已保存的字体预设，非法值回退到默认 */
export function getSavedFontId(): FontId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as FontId | null;
    if (saved && FONT_OPTIONS.some((f) => f.id === saved)) return saved;
  } catch {
    /* localStorage 不可用时忽略 */
  }
  return DEFAULT_FONT_ID;
}

export function saveFontId(id: FontId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* 忽略 */
  }
}

/** 把预设写到 <html data-font>，由 fonts.css 接管变量 */
export function applyFontId(id: FontId): void {
  document.documentElement.setAttribute('data-font', id);
}

/* ---------- 后台预载 ---------- */

let prefetched = false;

/**
 * 空闲时后台加载 Maple Mono：
 *  - 首屏（hybrid/sans 预设）不引用该字体文件，零下载、不阻塞渲染；
 *  - 页面 load 后的 idle 时段用 FontFace API 拉取并注册，写入缓存；
 *  - 之后切到 maple 预设时字体已就绪，无闪烁。
 */
export function prefetchCustomFonts(): void {
  if (prefetched || typeof window === 'undefined' || !('FontFace' in window)) return;
  prefetched = true;

  const load = () => {
    const face = new FontFace('Maple Mono', "url('/ttf/maple-mono.woff2')", {
      weight: '400',
      style: 'normal',
      display: 'swap',
    });
    face
      .load()
      .then((loaded) => document.fonts.add(loaded))
      .catch(() => {
        /* 预载失败不影响使用，切到 maple 时浏览器会自行按需加载 */
      });
  };

  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void })
    .requestIdleCallback;
  if (typeof ric === 'function') {
    ric(load, { timeout: 8000 });
  } else if (document.readyState === 'complete') {
    setTimeout(load, 1500);
  } else {
    window.addEventListener('load', () => setTimeout(load, 1500), { once: true });
  }
}
