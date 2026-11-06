import { useEffect, useState } from 'react'
import { Select, Button, Spin, Modal, message } from 'antd'
import { 
  ReloadOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  AlertOutlined,
  InfoCircleOutlined,
  BugOutlined,
  EyeOutlined
} from '@ant-design/icons'
import api from '@/utils/apis.ts'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import EmptyState from '@/components/EmptyState'

/**
 * 日志数据接口
 */
interface Log {
  level: string // 日志级别
  message: string // 日志消息
  host: string // 主机名称
  timestamp: string // 时间戳
  actions: string // 操作类型
  success?: boolean // 是否成功
  results?: any // 操作结果
  execute?: string // 错误堆栈
  content?: string // 消息内容（备用字段）
}

/** 操作结果字段的中文名称（命中常见接口字段，其余保留原字段名） */
const RESULT_FIELD_LABELS: Record<string, string> = {
  code: '状态码',
  status: '状态',
  status_code: '状态码',
  success: '是否成功',
  msg: '消息',
  message: '消息',
  error: '错误',
  errors: '错误详情',
  detail: '详情',
  details: '详情',
  data: '数据',
  result: '结果',
  results: '结果',
  items: '条目',
  list: '列表',
  total: '总数',
  count: '数量',
  id: '标识',
  uuid: 'UUID',
  name: '名称',
  host: '主机',
  host_name: '主机',
  vm_uuid: '虚拟机',
  vm_name: '虚拟机',
  task: '任务',
  task_id: '任务标识',
  action: '操作',
  path: '路径',
  url: '链接',
  ip: 'IP 地址',
  port: '端口',
  username: '用户名',
  user: '用户',
  time: '时间',
  timestamp: '时间戳',
}

interface ResultEntry {
  label: string
  value: string
  mono?: boolean
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 后端偶尔把 JSON 作为字符串塞进 results，这里先尝试还原为结构 */
function tryParseJson(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed || !/^[[{]/.test(trimmed)) return text
  try {
    return JSON.parse(trimmed)
  } catch {
    return text
  }
}

function formatResultScalar(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—'
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.length ? `${value.length} 项数据` : '—'
  if (isPlainObject(value)) return `${Object.keys(value).length} 项数据`
  return String(value)
}

/**
 * 把任意 results 结构摊平成可读的「字段 → 值」条目。
 * 常见接口字段翻译为中文，嵌套对象/数组递归展开，不再直接展示 JSON 原文。
 */
function collectResultEntries(value: unknown, path = '', depth = 0): ResultEntry[] {
  const parsed = typeof value === 'string' ? tryParseJson(value) : value

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return [{ label: path || '结果', value: '—' }]
    const primitivesOnly = parsed.every(item => item === null || ['string', 'number', 'boolean'].includes(typeof item))
    if (primitivesOnly) {
      return [{ label: path || '结果', value: parsed.map(formatResultScalar).join('、') }]
    }
    return parsed.flatMap((item, index) =>
      collectResultEntries(item, path ? `${path} · 第 ${index + 1} 项` : `第 ${index + 1} 项`, depth + 1),
    )
  }

  if (isPlainObject(parsed)) {
    const entries = Object.entries(parsed)
    if (entries.length === 0) return [{ label: path || '结果', value: '—' }]
    return entries.flatMap(([key, child]) => {
      const label = RESULT_FIELD_LABELS[key] || key
      const childPath = path ? `${path} · ${label}` : label
      const childValue = typeof child === 'string' ? tryParseJson(child) : child

      if (depth >= 3) {
        return [{ label: childPath, value: formatResultScalar(childValue) }]
      }
      if (isPlainObject(childValue) || Array.isArray(childValue)) {
        return collectResultEntries(childValue, childPath, depth + 1)
      }
      return [{
        label: childPath,
        value: formatResultScalar(childValue),
        mono: typeof childValue === 'number' || typeof childValue === 'boolean',
      }]
    })
  }

  return [{
    label: path || '结果',
    value: formatResultScalar(parsed),
    mono: typeof parsed === 'number' || typeof parsed === 'boolean',
  }]
}

function hasResultPayload(value: unknown): boolean {
  const parsed = typeof value === 'string' ? tryParseJson(value) : value
  if (parsed === null || parsed === undefined) return false
  if (typeof parsed === 'string') return parsed.trim().length > 0
  if (Array.isArray(parsed)) return parsed.length > 0
  if (isPlainObject(parsed)) return Object.keys(parsed).length > 0
  return true
}

/**
 * 日志查看页面
 */
function LogsManage() {
  // 状态管理
  const [logs, setLogs] = useState<Log[]>([]) // 所有日志
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]) // 过滤后的日志
  const [hosts, setHosts] = useState<string[]>([]) // 主机列表
  const [loading, setLoading] = useState(false) // 加载状态
  const [autoRefresh, setAutoRefresh] = useState(false) // 自动刷新状态
  const [selectedLog, setSelectedLog] = useState<Log | null>(null) // 选中的日志
  const [filters, setFilters] = useState({
    host: '', // 主机筛选
    level: '', // 日志级别筛选
    limit: 100, // 显示条数
  })
  const [statistics, setStatistics] = useState({
    ERROR: 0,
    WARNING: 0,
    INFO: 0,
    DEBUG: 0,
  })

  /**
   * 加载主机列表
   */
  const loadHosts = async () => {
    try {
      const result = await api.getHosts()
      if (result && result.code === 200) {
        const hostNames = Object.keys(result.data || {})
        setHosts(hostNames)
      }
    } catch (error) {
      console.error('加载主机列表失败:', error)
    }
  }

  /**
   * 加载日志列表
   */
  const loadLogs = async () => {
    try {
      setLoading(true)
      const params: any = {
        limit: filters.limit,
      }
      if (filters.host) {
        params.hs_name = filters.host
      }
      
      const result = await api.getLoggerDetail()
      if (result && result.code === 200) {
        const logData = result.data || []
        setLogs(logData)
        filterLogs(logData, filters.level)
        updateStatistics(logData)
      }
    } catch (error) {
      console.error('加载日志失败:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 过滤日志
   */
  const filterLogs = (logData: Log[], level: string) => {
    if (!level) {
      setFilteredLogs(logData)
    } else {
      setFilteredLogs(logData.filter(log => log.level === level))
    }
  }

  /**
   * 更新统计信息
   */
  const updateStatistics = (logData: Log[]) => {
    const stats = {
      ERROR: 0,
      WARNING: 0,
      INFO: 0,
      DEBUG: 0,
    }

    logData.forEach(log => {
      const level = (log.level || 'INFO').toUpperCase()
      if (level in stats) {
        stats[level as keyof typeof stats]++
      }
    })

    setStatistics(stats)
  }

  /**
   * 切换自动刷新
   */
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
  }

  /**
   * 清空日志
   */
  const clearLogs = () => {
    Modal.confirm({
      title: '确认清空日志',
      content: filters.host ? `确定要清空主机 "${filters.host}" 的所有日志吗？此操作不可恢复！` : '确定要清空所有日志吗？此操作不可恢复！',
      okText: '确认清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true)
          const result = await api.clearLogs(filters.host)
          if (result && result.code === 200) {
            // 清空成功后，清空前端显示
            setLogs([])
            setFilteredLogs([])
            setStatistics({
              ERROR: 0,
              WARNING: 0,
              INFO: 0,
              DEBUG: 0,
            })
            message.success('日志清空成功')
          } else {
            message.error(result?.msg || '清空日志失败')
          }
        } catch (error) {
          console.error('清空日志失败:', error)
          message.error('清空日志失败')
        } finally {
          setLoading(false)
        }
      },
    })
  }

  /**
   * 日志级别 → 设计系统类名后缀
   * 早期这里返回 Tailwind 色值类（bg-red-500 / text-blue-600 dark:...），
   * 与主题令牌脱节：换强调色时日志里的红/蓝不会跟着变，深色模式下还要
   * 额外写 dark: 变体。现在只返回语义后缀，颜色由 art-design.css 统一决定。
   */
  const levelKey = (level: string) => (level || 'INFO').toLowerCase()

  /** 单条日志的展示字段（默认值集中在这里，列表与详情共用） */
  const readLog = (log: Log) => ({
    level: (log.level || 'INFO').toUpperCase(),
    host: log.host || '系统',
    action: log.actions || '未知操作',
    message: log.message || log.content || '无消息内容',
    time: new Date(log.timestamp || Date.now()).toLocaleString('zh-CN'),
    result: log.success === undefined ? null : log.success ? '成功' : '失败',
  })

  // 初始化加载
  useEffect(() => {
    loadHosts()
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 监听筛选条件变化
  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.host, filters.limit])

  // 监听日志级别筛选
  useEffect(() => {
    filterLogs(logs, filters.level)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.level])

  // 自动刷新
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (autoRefresh) {
      interval = setInterval(() => {
        loadLogs()
      }, 5000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, filters])

  const selectedResultEntries = selectedLog ? collectResultEntries(selectedLog.results) : []
  const showSelectedResult = Boolean(selectedLog && hasResultPayload(selectedLog.results))

  return (
    <div className="art-stack">
      <PageHeader
        icon={<FileTextOutlined />}
        title="系统日志"
        subtitle="查看主机运行日志与操作记录"
        actions={
          <>
            <Button
              type={autoRefresh ? 'primary' : 'default'}
              icon={autoRefresh ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={toggleAutoRefresh}
            >
              {autoRefresh ? '停止刷新' : '自动刷新'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadLogs} loading={loading}>
              刷新
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={clearLogs}>
              清空
            </Button>
          </>
        }
      />

      {/* 指标：只留四个级别计数，其余信息交给列表 */}
      <div className="art-stat-grid">
        <StatCard icon={<AlertOutlined />} label="错误" value={statistics.ERROR} tone="danger" />
        <StatCard icon={<AlertOutlined />} label="警告" value={statistics.WARNING} tone="warning" />
        <StatCard icon={<InfoCircleOutlined />} label="信息" value={statistics.INFO} tone="primary" />
        <StatCard icon={<BugOutlined />} label="调试" value={statistics.DEBUG} tone="primary" />
      </div>

      {/* 筛选：与其他清单共用同一工具栏结构 */}
      <section className="art-list-toolbar" aria-label="日志筛选">
        <div className="art-list-toolbar-filters">
          <Select
            className="art-list-filter"
            placeholder="全部主机"
            allowClear
            value={filters.host || undefined}
            onChange={(value) => setFilters({ ...filters, host: value || '' })}
            getPopupContainer={() => document.body}
          >
            {hosts.map(host => (
              <Select.Option key={host} value={host}>{host}</Select.Option>
            ))}
          </Select>
          <Select
            className="art-list-filter"
            placeholder="全部级别"
            allowClear
            value={filters.level || undefined}
            onChange={(value) => setFilters({ ...filters, level: value || '' })}
            getPopupContainer={() => document.body}
          >
            <Select.Option value="ERROR">错误</Select.Option>
            <Select.Option value="WARNING">警告</Select.Option>
            <Select.Option value="INFO">信息</Select.Option>
            <Select.Option value="DEBUG">调试</Select.Option>
          </Select>
          <Select
            className="art-list-filter art-list-filter--compact"
            value={filters.limit}
            onChange={(value) => setFilters({ ...filters, limit: value })}
            getPopupContainer={() => document.body}
          >
            <Select.Option value={50}>50 条</Select.Option>
            <Select.Option value={100}>100 条</Select.Option>
            <Select.Option value={200}>200 条</Select.Option>
            <Select.Option value={500}>500 条</Select.Option>
          </Select>
        </div>
        <div className="art-list-toolbar-actions">
          <span className="art-list-result-count" aria-live="polite">
            共 <strong>{filteredLogs.length}</strong> 条
          </span>
        </div>
      </section>

      {/* 列表 + 详情：固定高度分栏，两侧各自内部滚动 */}
      <div className="art-split">
        <section className="art-panel">
          <header className="art-panel-head">
            <span className="art-panel-title">
              <FileTextOutlined />
              日志记录
            </span>
          </header>
          <div className={`art-panel-body${filteredLogs.length > 0 ? ' is-flush' : ''}`}>
            {loading && filteredLogs.length === 0 ? (
              <div className="art-loading">
                <Spin />
                <span>正在加载日志…</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <EmptyState
                icon={<FileTextOutlined />}
                title="暂无日志记录"
                description="当前筛选条件下没有日志。可以放宽级别筛选，或点击「刷新」重新拉取。"
                actions={
                  <Button icon={<ReloadOutlined />} onClick={loadLogs}>
                    刷新
                  </Button>
                }
              />
            ) : (
              <ul className="art-log-list">
                {filteredLogs.map((log, index) => {
                  const item = readLog(log)
                  const key = levelKey(item.level)
                  return (
                    <li
                      key={index}
                      className={`art-log-item${selectedLog === log ? ' is-active' : ''}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <span className={`art-log-dot is-${key}`} />
                      <div className="art-log-main">
                        <div className="art-log-meta">
                          <span className={`art-log-level is-${key}`}>{item.level}</span>
                          <span className="art-log-host">{item.host}</span>
                          <span className="art-log-action">{item.action}</span>
                          {item.result && (
                            <span className={`art-log-result ${item.result === '成功' ? 'is-ok' : 'is-fail'}`}>
                              {item.result}
                            </span>
                          )}
                          <span className="art-log-time">{item.time}</span>
                        </div>
                        <p className="art-log-message">{item.message}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="art-panel">
          <header className="art-panel-head">
            <span className="art-panel-title">
              <EyeOutlined />
              日志详情
            </span>
          </header>
          <div className="art-panel-body">
            {selectedLog ? (
              <div className="art-detail">
                <div className="art-info-grid">
                  <div>
                    <div className="art-info-label">主机</div>
                    <div className="art-info-value">{readLog(selectedLog).host}</div>
                  </div>
                  <div>
                    <div className="art-info-label">级别</div>
                    <div className={`art-info-value is-mono art-log-level is-${levelKey(selectedLog.level)}`}>
                      {readLog(selectedLog).level}
                    </div>
                  </div>
                  <div>
                    <div className="art-info-label">操作</div>
                    <div className="art-info-value">{readLog(selectedLog).action}</div>
                  </div>
                  <div>
                    <div className="art-info-label">状态</div>
                    <div className={`art-info-value${selectedLog.success === true ? ' is-ok' : selectedLog.success === false ? ' is-fail' : ''}`}>
                      {readLog(selectedLog).result || '未知'}
                    </div>
                  </div>
                  <div>
                    <div className="art-info-label">时间</div>
                    <div className="art-info-value is-mono">{readLog(selectedLog).time}</div>
                  </div>
                </div>

                <div className="art-subpanel">
                  <div className="art-subpanel-head">
                    <FileTextOutlined />
                    消息内容
                  </div>
                  <p className="art-log-message is-expanded">{readLog(selectedLog).message}</p>
                </div>

                {showSelectedResult && (
                  <div className="art-subpanel">
                    <div className="art-subpanel-head">
                      <EyeOutlined />
                      操作结果
                    </div>
                    <div className="art-result-summary">
                      <span className={`art-log-result ${selectedLog.success === false ? 'is-fail' : 'is-ok'}`}>
                        {selectedLog.success === false ? '执行失败' : selectedLog.success === true ? '执行成功' : '已返回结果'}
                      </span>
                      <span>共 {selectedResultEntries.length} 项</span>
                    </div>
                    <div className="art-result-grid">
                      {selectedResultEntries.map((entry, index) => (
                        <div className="art-result-item" key={`${entry.label}-${index}`}>
                          <span className="art-result-label">{entry.label}</span>
                          <span className={`art-result-value${entry.mono ? ' is-mono' : ''}`}>{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.execute && selectedLog.execute !== 'None' && selectedLog.execute.trim() !== '' && (
                  <div className="art-subpanel is-danger">
                    <div className="art-subpanel-head">
                      <BugOutlined />
                      错误堆栈
                    </div>
                    <pre className="art-code is-danger">{selectedLog.execute}</pre>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={<EyeOutlined />}
                title="未选择日志"
                description="从左侧列表中选择一条日志，这里会显示它的完整字段、操作结果与错误堆栈。"
              />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default LogsManage