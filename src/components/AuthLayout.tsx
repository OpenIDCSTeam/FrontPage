import type { ReactNode } from 'react'
import {
  CloudServerOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import AppearanceMenu from '@/components/AppearanceMenu'
import LanguageMenu from '@/components/LanguageMenu'
import { useSiteStore } from '@/utils/site.ts'

/**
 * 认证页外壳（登录 / 注册 / 重置密码共用）
 * ------------------------------------------------------------------
 * 布局：桌面端为「品牌侧 + 表单侧」左右分栏；< 1024px 退化为单列。
 * 右上角语言与外观入口复用主控制台的三套主题、明暗、透明和圆角设置。
 * 样式定义在 src/styles/art-design.css 的 .art-auth-* 中。
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const siteTitle = useSiteStore(state => state.title)

  return (
    <div className="art-auth-page">
      {/* 品牌侧：仅桌面端显示 */}
      <aside className="art-auth-aside">
        <div className="art-auth-aside-brand">
          <div className="art-auth-aside-logo">OI</div>
          <span className="art-auth-aside-brand-name" title={siteTitle}>{siteTitle}</span>
        </div>

        <div className="art-auth-aside-content">
          <div className="art-auth-aside-eyebrow">Virtualization Platform</div>
          <h2 className="art-auth-aside-title">
            开源、多平台的
            <br />
            虚拟化控制台
          </h2>
          <p className="art-auth-aside-desc">
            集中管理主机、实例、网络与端口转发，把分散的算力收拢到一个面板里。
          </p>

          <ul className="art-auth-aside-points">
            <li>
              <CloudServerOutlined />
              <span>多主机纳管，实例状态与资源占用实时可见</span>
            </li>
            <li>
              <GlobalOutlined />
              <span>反向代理与端口转发统一编排，无需手工维护规则</span>
            </li>
            <li>
              <SafetyCertificateOutlined />
              <span>细粒度权限与配额控制，多用户隔离协作</span>
            </li>
            <li>
              <ThunderboltOutlined />
              <span>VNC 控制台与任务队列，运维操作可追溯</span>
            </li>
          </ul>
        </div>

        <div className="art-auth-aside-foot">© {new Date().getFullYear()} OpenIDCS Team</div>
      </aside>

      {/* 表单侧 */}
      <div className="art-auth-main">
        {/* 右上角工具区 */}
        <div className="art-auth-toolbar">
          <LanguageMenu triggerClassName="art-auth-tool-btn" />
          <AppearanceMenu />
        </div>

        {children}
      </div>
    </div>
  )
}
