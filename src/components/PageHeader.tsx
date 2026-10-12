import React from 'react'

/**
 * 页面标题组件属性
 */
interface PageHeaderProps {
  /** 图标 - 可以是 React 节点或 iconify 图标名称 */
  icon: React.ReactNode
  /** 主标题 */
  title: string
  /** 副标题/描述 */
  subtitle: string
  /** 操作按钮区域（可选） */
  actions?: React.ReactNode
  /** 额外的 className（可选） */
  className?: string
}

/**
 * 统一的页面标题组件（Art Design 规范）
 * 布局：图标（主色浅底方块）| 主标题 + 副标题 | 操作按钮区域
 *
 * 样式定义在 `src/styles/art-design.css` 的 `.art-page-header*` 中，
 * 组件内不写内联样式、不使用工具类，便于后续统一换肤。
 */
function PageHeader({ icon, title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`art-page-header ${className}`}>
      {/* 左侧：图标 + 标题 */}
      <div className="art-page-header-main">
        <div className="art-page-header-icon">{icon}</div>

        <div className="art-page-header-titles">
          <h1 className="art-page-header-title">{title}</h1>
          <p className="art-page-header-subtitle">{subtitle}</p>
        </div>
      </div>

      {/* 右侧：操作按钮区域 */}
      {actions && <div className="art-page-header-actions">{actions}</div>}
    </div>
  )
}

export default PageHeader
