import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** 主图标 */
  icon: ReactNode
  /** 主标题：说明“这里现在是什么状态” */
  title: string
  /** 补充说明：告诉用户为什么为空、下一步做什么 */
  description?: ReactNode
  /** 主要操作（如「创建虚拟机」） */
  actions?: ReactNode
}

/**
 * 统一空状态
 * ------------------------------------------------------------------
 * 空状态是页面“看起来有没有做完”的关键：托盘式图标 + 明确的下一步操作，
 * 比 Antd 默认的插画 + 一行灰字更能传达信息。
 * 样式定义在 src/styles/art-design.css 的 .art-empty-state* 中。
 */
export default function EmptyState({ icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className="art-empty-state">
      <div className="art-empty-state-icon">{icon}</div>
      <div className="art-empty-state-title">{title}</div>
      {description ? <div className="art-empty-state-desc">{description}</div> : null}
      {actions ? <div className="art-empty-state-actions">{actions}</div> : null}
    </div>
  )
}
