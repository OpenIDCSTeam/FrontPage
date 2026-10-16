import { useEffect, useState, useCallback } from 'react'
import { message, Modal, Select, Popconfirm, Pagination, Button, Spin } from 'antd'
import {
  ScheduleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  UnorderedListOutlined,
  RedoOutlined,
  InfoCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import EmptyState from '@/components/EmptyState'
import {
  getTaskList,
  getTaskStats,
  stopTask,
  retryTask,
  TASK_TYPE_LABELS,
  type AsyncTask,
  type TaskListResponse,
  type TaskStats,
} from '@/utils/taskPoller'
import { http } from '@/utils/axio'

/**
 * 任务管理页面（增强版）
 * 支持异步任务列表、强行结束、重新运行、任务类型筛选、分页等
 */
function TaskManage() {
  // 状态管理
  const [tasks, setTasks] = useState<AsyncTask[]>([])
  const [total, setTotal] = useState(0)
  const [hosts, setHosts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedHost, setSelectedHost] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AsyncTask | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [stats, setStats] = useState<TaskStats>({ pending: 0, running: 0, completed: 0, failed: 0, stopped: 0 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  /**
   * 加载主机列表
   */
  const loadHosts = async () => {
    try {
      const result = await http.get<Record<string, any>>('/api/server/detail')
      if (result && result.code === 200) {
        const hostNames = Object.keys(result.data || {})
        setHosts(hostNames)
      }
    } catch (error) {
      console.error('加载主机列表失败:', error)
    }
  }

  /**
   * 加载任务列表（使用新的异步任务API）
   */
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      const result: TaskListResponse = await getTaskList({
        hs_name: selectedHost || undefined,
        status: selectedStatus || undefined,
        task_type: selectedType || undefined,
        page,
        page_size: pageSize,
      })
      setTasks(result.items || [])
      setTotal(result.total || 0)
    } catch (error) {
      console.error('加载任务失败:', error)
      message.error('加载任务失败')
    } finally {
      setLoading(false)
    }
  }, [selectedHost, selectedStatus, selectedType, page, pageSize])

  /**
   * 加载任务统计
   */
  const loadStats = useCallback(async () => {
    try {
      const result = await getTaskStats()
      setStats(result)
    } catch (error) {
      console.error('加载统计失败:', error)
    }
  }, [])

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadHosts()
  }, [])

  useEffect(() => {
    loadTasks()
    loadStats()
  }, [loadTasks, loadStats])

  /**
   * 自动刷新
   */
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (autoRefresh) {
      interval = setInterval(() => {
        loadTasks()
        loadStats()
      }, 5000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, loadTasks, loadStats])

  /**
   * 强行结束任务
   */
  const handleStopTask = async (taskId: string) => {
    try {
      await stopTask(taskId)
      message.success('任务已停止')
      loadTasks()
      loadStats()
    } catch (error) {
      message.error('停止任务失败')
    }
  }

  /**
   * 重新运行任务
   */
  const handleRetryTask = async (taskId: string) => {
    try {
      await retryTask(taskId)
      message.success('任务已重新提交')
      loadTasks()
      loadStats()
    } catch (error) {
      message.error('重新运行失败')
    }
  }

  /**
   * 任务状态 → 展示信息
   * 只返回语义 tone，颜色由 art-design.css 的 .art-sem.* 决定。
   * 早期这里硬编码了 5 组 hex（#ca8a04 / rgba(234,179,8,.15) …），
   * 换主题时改不动，也是页面间配色不一致的来源。
   */
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { text: string; tone: string }> = {
      pending: { text: '等待中', tone: 'is-warning' },
      running: { text: '执行中', tone: 'is-accent' },
      completed: { text: '已完成', tone: 'is-success' },
      failed: { text: '已失败', tone: 'is-danger' },
      stopped: { text: '已停止', tone: '' },
    }
    return statusMap[(status || '').toLowerCase()] || { text: '未知', tone: '' }
  }
  /**
   * 格式化时间
   */
  const formatTime = (timestamp?: string | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  /**
   * 显示任务详情
   */
  const showTaskDetail = (task: AsyncTask) => {
    setSelectedTask(task)
    setModalVisible(true)
  }

  // 任务类型选项
  const taskTypeOptions = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ label, value }))

  return (
    <div className="art-stack">
      <PageHeader
        icon={<ScheduleOutlined />}
        title="任务管理"
        subtitle="查看与管理异步任务的执行情况"
        actions={
          <>
            <Button
              type={autoRefresh ? 'primary' : 'default'}
              icon={autoRefresh ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? '停止刷新' : '自动刷新'}
            </Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => { loadTasks(); loadStats() }}>
              刷新
            </Button>
          </>
        }
      />

      {/* 指标：只保留 5 个状态计数，其余信息交给列表 */}
      <div className="art-stat-grid">
        <StatCard icon={<ClockCircleOutlined />} label="等待中" value={stats.pending} tone="warning" />
        <StatCard icon={<PlayCircleOutlined />} label="执行中" value={stats.running} tone="primary" />
        <StatCard icon={<CheckCircleOutlined />} label="已完成" value={stats.completed} tone="success" />
        <StatCard icon={<CloseCircleOutlined />} label="已失败" value={stats.failed} tone="danger" />
        <StatCard icon={<StopOutlined />} label="已停止" value={stats.stopped} tone="primary" />
      </div>

      {/* 筛选：全部收进一行工具条 */}
      <div className="art-toolbar">
        <Select
          style={{ width: 180 }}
          placeholder="全部主机"
          allowClear
          value={selectedHost || undefined}
          onChange={(v) => { setSelectedHost(v || ''); setPage(1) }}
          options={[{ label: '全部主机', value: '' }, ...hosts.map(host => ({ label: host, value: host }))]}
        />
        <Select
          style={{ width: 150 }}
          placeholder="全部状态"
          allowClear
          value={selectedStatus || undefined}
          onChange={(v) => { setSelectedStatus(v || ''); setPage(1) }}
          options={[
            { label: '全部状态', value: '' },
            { label: '等待中', value: 'pending' },
            { label: '执行中', value: 'running' },
            { label: '已完成', value: 'completed' },
            { label: '已失败', value: 'failed' },
            { label: '已停止', value: 'stopped' },
          ]}
        />
        <Select
          style={{ width: 170 }}
          placeholder="全部类型"
          allowClear
          value={selectedType || undefined}
          onChange={(v) => { setSelectedType(v || ''); setPage(1) }}
          options={[{ label: '全部类型', value: '' }, ...taskTypeOptions]}
        />
        <span className="art-toolbar-spacer" />
        <span className="art-muted">共 {total} 条</span>
      </div>

      {/* 任务列表 */}
      <div className="art-panel">
        <header className="art-panel-head">
          <span className="art-panel-title">
            <UnorderedListOutlined />
            任务列表
          </span>
        </header>
        <div className={`art-panel-body${tasks.length > 0 ? ' is-flush' : ''}`}>
          {loading && tasks.length === 0 ? (
            <div className="art-loading">
              <Spin />
              <span>正在加载任务…</span>
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={<ScheduleOutlined />}
              title="暂无任务记录"
              description="当前筛选条件下没有任务。可以放宽筛选，或点击「刷新」重新拉取。"
              actions={
                <Button icon={<ReloadOutlined />} onClick={() => { loadTasks(); loadStats() }}>
                  刷新
                </Button>
              }
            />
          ) : (
            <ul className="art-log-list">
              {tasks.map((task) => {
                const statusInfo = getStatusInfo(task.status)
                const taskTypeLabel = TASK_TYPE_LABELS[task.task_type] || task.task_type
                const canStop = task.status === 'running' || task.status === 'pending'
                const canRetry = task.status === 'stopped'
                return (
                  <li key={task.task_id} className="art-log-item">
                    <span className={`art-sem ${statusInfo.tone} art-sem-dot`} style={{ marginTop: 7 }} />
                    <div className="art-log-main is-clickable" onClick={() => showTaskDetail(task)}>
                      <div className="art-log-meta">
                        <span className="art-log-level">{taskTypeLabel}</span>
                        <span className={`art-sem ${statusInfo.tone} art-sem-text`}>{statusInfo.text}</span>
                        <span className="art-log-host">{task.hs_name}</span>
                        {task.vm_uuid && <span className="art-log-action">{task.vm_uuid}</span>}
                        {task.username && <span className="art-log-action">{task.username}</span>}
                        <span className="art-log-time">{formatTime(task.created_at)}</span>
                      </div>
                      {task.error_message ? <p className="art-log-message is-danger">{task.error_message}</p> : null}
                    </div>
                    <div className="art-row-actions">
                      {canStop && (
                        <Popconfirm
                          title="确定要强行结束此任务吗？"
                          onConfirm={() => handleStopTask(task.task_id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button size="small" type="text" danger icon={<StopOutlined />}>
                            结束
                          </Button>
                        </Popconfirm>
                      )}
                      {canRetry && (
                        <Popconfirm
                          title="确定要重新运行此任务吗？"
                          onConfirm={() => handleRetryTask(task.task_id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button size="small" type="text" icon={<RedoOutlined />}>
                            重试
                          </Button>
                        </Popconfirm>
                      )}
                      <Button size="small" type="text" icon={<InfoCircleOutlined />} onClick={() => showTaskDetail(task)}>
                        详情
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {total > pageSize && (
          <div className="art-panel-foot">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={(p, ps) => { setPage(p); setPageSize(ps) }}
              showSizeChanger
              showTotal={(t) => `共 ${t} 条`}
              size="small"
            />
          </div>
        )}
      </div>

      {/* 任务详情：字段用信息网格铺开，长文本收进代码块 */}
      <Modal
        title="任务详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={720}
      >
        {selectedTask && (
          <div className="art-detail">
            <div className="art-info-grid">
              <div>
                <div className="art-info-label">任务 ID</div>
                <div className="art-info-value is-mono">{selectedTask.task_id}</div>
              </div>
              <div>
                <div className="art-info-label">状态</div>
                <div className="art-info-value">
                  <span className={`art-sem ${getStatusInfo(selectedTask.status).tone} art-sem-pill`}>
                    {getStatusInfo(selectedTask.status).text}
                  </span>
                </div>
              </div>
              <div>
                <div className="art-info-label">任务类型</div>
                <div className="art-info-value">{TASK_TYPE_LABELS[selectedTask.task_type] || selectedTask.task_type}</div>
              </div>
              <div>
                <div className="art-info-label">操作人</div>
                <div className="art-info-value">{selectedTask.username || '-'}</div>
              </div>
              <div>
                <div className="art-info-label">主机</div>
                <div className="art-info-value is-mono">{selectedTask.hs_name}</div>
              </div>
              <div>
                <div className="art-info-label">虚拟机</div>
                <div className="art-info-value is-mono">{selectedTask.vm_uuid || '-'}</div>
              </div>
              <div>
                <div className="art-info-label">创建时间</div>
                <div className="art-info-value is-mono">{formatTime(selectedTask.created_at)}</div>
              </div>
              <div>
                <div className="art-info-label">开始时间</div>
                <div className="art-info-value is-mono">{formatTime(selectedTask.started_at)}</div>
              </div>
              <div>
                <div className="art-info-label">完成时间</div>
                <div className="art-info-value is-mono">{formatTime(selectedTask.finished_at)}</div>
              </div>
            </div>

            {selectedTask.error_message && (
              <div className="art-subpanel is-danger">
                <div className="art-subpanel-head">
                  <CloseCircleOutlined />
                  错误信息
                </div>
                <pre className="art-code is-danger">{selectedTask.error_message}</pre>
              </div>
            )}

            {selectedTask.params && Object.keys(selectedTask.params).length > 0 && (
              <div className="art-subpanel">
                <div className="art-subpanel-head">
                  <SettingOutlined />
                  执行参数
                </div>
                <pre className="art-code">{JSON.stringify(selectedTask.params, null, 2)}</pre>
              </div>
            )}

            {selectedTask.result && Object.keys(selectedTask.result).length > 0 && (
              <div className="art-subpanel">
                <div className="art-subpanel-head">
                  <CheckCircleOutlined />
                  执行结果
                </div>
                <pre className="art-code">{JSON.stringify(selectedTask.result, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TaskManage