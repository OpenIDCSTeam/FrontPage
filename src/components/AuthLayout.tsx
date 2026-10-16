import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Button, Dropdown } from 'antd'
import {
  TranslationOutlined,
  BgColorsOutlined,
  BulbOutlined,
  BulbFilled,
  CheckOutlined,
  CloudServerOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useTheme } from '@/contexts/ThemeContext'
import { changeLanguage, getAvailableLanguages, getCurrentLanguage } from '@/utils/i18n.ts'

/**
 * 认证页外壳（登录 / 注册 / 重置密码共用）
 * ------------------------------------------------------------------
 * 布局：桌面端为「品牌侧 + 表单侧」左右分栏；< 1024px 退化为单列。
 * 右上角统一提供 语言 / 透明模式 / 暗黑模式 三个切换按钮，
 * 与主控制台顶栏的能力保持一致。
 * 样式定义在 src/styles/art-design.css 的 .art-auth-* 中。
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme, transparentMode, toggleTransparentMode } = useTheme()
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage())
  const [languages, setLanguages] = useState<any[]>([])

  useEffect(() => {
    setCurrentLang(getCurrentLanguage())
    setLanguages(getAvailableLanguages())

    const handleLangChange = (e: any) => setCurrentLang(e.detail.language)
    const handleLangsLoaded = (e: any) => {
      setLanguages(e.detail.languages)
      setCurrentLang(getCurrentLanguage())
    }
    window.addEventListener('languageChanged', handleLangChange)
    window.addEventListener('languagesLoaded', handleLangsLoaded)
    return () => {
      window.removeEventListener('languageChanged', handleLangChange)
      window.removeEventListener('languagesLoaded', handleLangsLoaded)
    }
  }, [])

  const languageMenuItems: MenuProps['items'] = (languages.length > 0 ? languages : [
    { code: 'zh-cn', native: '简体中文' },
    { code: 'en-us', native: 'English' },
  ]).map(lang => ({
    key: lang.code,
    label: lang.native || lang.name,
    icon: lang.code === currentLang ? <CheckOutlined /> : undefined,
  }))

  return (
    <div className="art-auth-page">
      {/* 品牌侧：仅桌面端显示 */}
      <aside className="art-auth-aside">
        <div className="art-auth-aside-brand">
          <div className="art-auth-aside-logo">OI</div>
          <span className="art-auth-aside-brand-name">OpenIDCS</span>
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
          <Dropdown
            menu={{ items: languageMenuItems, onClick: ({ key }) => changeLanguage(key) }}
            placement="bottomRight"
            overlayStyle={{ zIndex: 20000, maxHeight: '400px', overflow: 'auto' }}
          >
            <Button className="art-auth-tool-btn" icon={<TranslationOutlined />} title="切换语言" />
          </Dropdown>

          <Button
            className={`art-auth-tool-btn${transparentMode ? ' is-active' : ''}`}
            onClick={toggleTransparentMode}
            icon={<BgColorsOutlined />}
            title={transparentMode ? '关闭透明模式' : '开启透明模式'}
          />

          <Button
            className={`art-auth-tool-btn${theme === 'dark' ? ' is-active' : ''}`}
            onClick={toggleTheme}
            icon={theme === 'dark' ? <BulbFilled /> : <BulbOutlined />}
            title={theme === 'dark' ? '切换到浅色模式' : '切换到暗黑模式'}
          />
        </div>

        {children}
      </div>
    </div>
  )
}
