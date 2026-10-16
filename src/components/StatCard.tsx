import type { ReactNode } from 'react'
import { Progress } from 'antd'

/**
 * 指标语义色调
 * 受「单一强调色 + 仅语义色」约束，只保留 accent 与三个状态色。
 * 早期版本的 indigo / cyan 属于额外的装饰色相，已合并到 accent。
 */
export type StatTone = 'primary' | 'indigo' | 'success' | 'warning' | 'danger' | 'cyan'

interface StatCardProps {
  /** 图标节点（13px 小图标，不再是大色块） */
  icon: ReactNode
  /** 指标名称（等宽小字，自动大写） */
  label: string
  /** 指标值 */
  value: ReactNode
  /** 单位后缀（如「台」「核」） */
  unit?: string
  /** 语义色调：只影响小图标与进度条，不影响数字颜色 */
  tone?: StatTone
  /** 指标下方的辅助信息（可用 <span className="is-success"> 等语义类着色） */
  meta?: ReactNode
  /** 用量条（0-100），配额类指标使用 */
  progress?: number
  /** 可点击时整格出现 hover 底色 */
  onClick?: () => void
  /** 数据加载中：数值区域显示骨架 */
  loading?: boolean
}

/**
 * 指标格
 * ------------------------------------------------------------------
 * 结构：小图标 + 等宽标签 / 大号等宽数字 / 辅助行或用量条。
 * 这些格子由 .art-stat-grid 用 gap:1px 拼成一块「仪表盘面板」，
 * 因此组件本身不带边框、圆角与投影：层次由面板的发丝分隔线提供。
 */
export default function StatCard({
  icon,
  label,
  value,
  unit,
  tone = 'primary',
  meta,
  progress,
  onClick,
  loading = false,
}: StatCardProps) {
  return (
    <div
      className={`art-stat-card art-tone-${tone}${onClick ? ' is-clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      <div className="art-stat-head">
        <span className="art-stat-icon">{icon}</span>
        <span className="art-stat-label">{label}</span>
      </div>

      <div className="art-stat-body">
        {loading ? (
          <div className="art-skeleton art-skeleton-value" />
        ) : (
          <div className="art-stat-value">
            {value}
            {unit ? <span className="art-stat-unit">{unit}</span> : null}
          </div>
        )}

        {!loading && meta ? <div className="art-stat-meta">{meta}</div> : null}

        {!loading && typeof progress === 'number' ? (
          <Progress
            percent={Math.max(0, Math.min(100, progress))}
            showInfo={false}
            size="small"
            strokeWidth={3}
            strokeColor="var(--stat-tone)"
            trailColor="var(--art-gray-200)"
            className="art-stat-progress"
          />
        ) : null}
      </div>
    </div>
  )
}
