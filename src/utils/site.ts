import { create } from 'zustand'
import api from '@/utils/apis.ts'

/** 未配置系统标题时的默认标题 */
export const DEFAULT_SITE_TITLE = 'QuickIDC 虚拟化管理平台'

const TITLE_CACHE_KEY = 'quickidc-site-title'

/**
 * 读取本地缓存的系统标题。
 * 首屏在接口返回前先用缓存渲染，避免标题从默认值闪变。
 */
export const readCachedSiteTitle = (): string => {
  try {
    return localStorage.getItem(TITLE_CACHE_KEY)?.trim() || DEFAULT_SITE_TITLE
  } catch {
    return DEFAULT_SITE_TITLE
  }
}

interface SiteState {
  /** 系统标题（初始化页面设置） */
  title: string
  /** 是否已完成初始化；null 表示尚未获取到 */
  initialized: boolean | null
  loading: boolean
  setTitle: (title: string) => void
  setInitialized: (initialized: boolean) => void
  /** 拉取站点信息，页面挂载时调用；并发调用复用同一次请求 */
  load: () => Promise<void>
}

let pendingLoad: Promise<void> | null = null

export const useSiteStore = create<SiteState>((set, get) => ({
  title: readCachedSiteTitle(),
  initialized: null,
  loading: false,

  setTitle: (title) => {
    const next = title?.trim() || DEFAULT_SITE_TITLE
    try {
      localStorage.setItem(TITLE_CACHE_KEY, next)
    } catch {
      // localStorage 不可用时只影响缓存，不影响本次展示
    }
    document.title = next
    set({ title: next })
  },

  setInitialized: (initialized) => set({ initialized }),

  load: () => {
    if (pendingLoad) return pendingLoad
    set({ loading: true })
    const task = api.getSiteInfo()
      .then(res => {
        if (res.code !== 200 || !res.data) return
        const title = (res.data.system_title || '').trim() || DEFAULT_SITE_TITLE
        get().setTitle(title)
        set({ initialized: !!res.data.initialized })
      })
      .catch(() => {
        // 站点信息获取失败时保持「未知」状态，不误跳初始化页
      })
      .finally(() => {
        set({ loading: false })
        pendingLoad = null
      })
    pendingLoad = task
    return task
  },
}))

// 首屏先应用缓存标题，随后由 load() 用服务端标题覆盖
document.title = readCachedSiteTitle()
