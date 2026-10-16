import { useEffect, useState } from 'react'
import { Row, Col, Button, Modal, Form, Input, Select, Slider, Progress, message, Space, Divider, Table, Tooltip, Alert, Spin } from 'antd'
import EmptyState from '@/components/EmptyState'

import {
  DesktopOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  PoweroffOutlined,
  MonitorOutlined,
  SettingOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  RadarChartOutlined,
  HddOutlined,
  GlobalOutlined,
  ApiOutlined,
  MinusCircleOutlined,
  TeamOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/apis.ts'
import { useUserStore } from '@/utils/data.ts'
import { openVNCConsole } from '@/utils/vncHelper'

/**
 * 系统统计数据接口
 */
interface SystemStats {
  hosts_count: number
  vms_count: number
  users_count: number
  running_vms: number
  stopped_vms: number
  total_nat_ports: number
  total_web_proxy: number
}

/**
 * 主机信息接口
 */
interface HostInfo {
  server_name: string
  server_type: string
  server_addr: string
  status: string
  vms_count: number
  max_vms: number
  running_vms: number
  stopped_vms: number
  cpu_usage: number
  gpu_usage: number
  memory_usage: number
  disk_usage: number
  enabled: boolean
  last_check: string
}

/**
 * 用户资源配额接口
 */
interface UserQuota {
  used_cpu: number
  quota_cpu: number
  used_ram: number
  quota_ram: number
  used_ssd: number
  quota_ssd: number
  used_gpu: number
  quota_gpu: number
  used_traffic: number
  quota_traffic: number
  used_nat_ports: number
  quota_nat_ports: number
  used_web_proxy: number
  quota_web_proxy: number
  used_bandwidth_up: number
  quota_bandwidth_up: number
  used_bandwidth_down: number
  quota_bandwidth_down: number
  assigned_hosts: string[]
  can_create_vm: boolean
  used_nat_ips: number
  quota_nat_ips: number
  used_pub_ips: number
  quota_pub_ips: number
}

/**
 * 虚拟机配置接口
 */
interface VMConfig {
  cpu_num: number
  mem_num: number
  hdd_num: number
  gpu_mem: number
  os_name: string
  nat_num: number
  web_num: number
  nic_all: Record<string, any>
}

/**
 * 虚拟机状态接口
 */
interface VMStatus {
  ac_status: string
}

/**
 * 虚拟机信息接口
 */
interface VMInfo {
  uuid: string
  display_name: string
  host: string
  config: VMConfig
  status: VMStatus[]
  power: string
}

/**
 * Dashboard仪表盘页面组件
 */
function Dashboards() {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const isAdmin = user?.is_admin || false

  // 管理员视图状态
  const [systemStats, setSystemStats] = useState<SystemStats>({
    hosts_count: 0,
    vms_count: 0,
    users_count: 0,
    running_vms: 0,
    stopped_vms: 0,
    total_nat_ports: 0,
    total_web_proxy: 0,
  })
  const [hosts, setHosts] = useState<Record<string, HostInfo>>({})

  // 普通用户视图状态
  const [userQuota, setUserQuota] = useState<UserQuota | null>(null)
  const [myVMs, setMyVMs] = useState<VMInfo[]>([])
  const [myVMCount, setMyVMCount] = useState(0)
  const [myRunningVMCount, setMyRunningVMCount] = useState(0)

  // 创建虚拟机模态框状态
  const [createVMModalVisible, setCreateVMModalVisible] = useState(false)
  const [createVMForm] = Form.useForm()
  const [availableHosts, setAvailableHosts] = useState<string[]>([])
  const [availableImages, setAvailableImages] = useState<string[]>([])
  
  // 新增状态：主机配置、UUID前缀、最小磁盘、网卡列表
  const [hostConfig, setHostConfig] = useState<any>(null)
  const [uuidPrefix, setUuidPrefix] = useState('')
  const [minDiskSize, setMinDiskSize] = useState(10)
  const [nicList, setNicList] = useState<Array<{ id: number; type: string; ip: string }>>([
    { id: 0, type: 'nat', ip: '' }
  ])
  const [nicCounter, setNicCounter] = useState(1)
  // 套餐卡片选择相关状态
  const [serverPlans, setServerPlans] = useState<Record<string, any>>({})
  const [selectedPlanName, setSelectedPlanName] = useState<string>('')

  // 是否可以自由配置（管理员或有自由配置权限）
  const canFreeConfig = isAdmin || !!(userQuota as any)?.can_free_config

  // 电源操作模态框状态
  const [powerModalVisible, setPowerModalVisible] = useState(false)
  const [currentPowerVM, setCurrentPowerVM] = useState<{ uuid: string; host: string; name: string }>({ uuid: '', host: '', name: '' })

  const [lastUpdate, setLastUpdate] = useState<string>('')

  // 仅首屏显示骨架屏；30 秒轮询刷新时不闪（loading 只从 true 变为 false，不再回true）
  const [loading, setLoading] = useState(true)

  /**
   * 加载管理员仪表板数据
   */
  const loadAdminDashboard = async () => {
    try {
      // 加载系统统计数据
      const statsResult = await api.get('/api/system/statis')
      if (statsResult.code === 200) {
        setSystemStats({
          hosts_count: statsResult.data.hosts_count || statsResult.data.host_count || 0,
          vms_count: statsResult.data.vms_count || statsResult.data.vm_count || 0,
          users_count: statsResult.data.users_count || 0,
          running_vms: statsResult.data.running_vms || statsResult.data.running_vm_count || 0,
          stopped_vms: statsResult.data.stopped_vms || 0,
          total_nat_ports: statsResult.data.total_nat_ports || 0,
          total_web_proxy: statsResult.data.total_web_proxy || 0,
        })
      }

      // 加载主机列表
      const hostsResult = await api.get('/api/server/detail')
      if (hostsResult.code === 200) {
        setHosts(hostsResult.data)
      }

      // 更新最后更新时间
      const now = new Date()
      setLastUpdate(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (error) {
      console.error('加载管理员数据失败:', error)
      message.error('加载数据失败')
    }
  }

  /**
   * 加载普通用户仪表盘数据
   */
  const loadUserDashboard = async () => {
    try {
      // 加载用户资源配额
      const userResult = await api.get('/api/users/current')
      if (userResult.code === 200) {
        setUserQuota(userResult.data)
        
        // 加载用户的虚拟机
        await loadUserVMs(userResult.data.assigned_hosts)
      }

      // 更新最后更新时间
      const now = new Date()
      setLastUpdate(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (error) {
      console.error('加载用户数据失败:', error)
      message.error('加载数据失败')
    }
  }

  /**
   * 加载用户的虚拟机列表
   */
  const loadUserVMs = async (assignedHosts: string[]) => {
    try {
      const allVMs: VMInfo[] = []
      let runningCount = 0

      // 从每个主机获取虚拟机
      for (const hostName of assignedHosts) {
        try {
          const vmsResult = await api.get(`/api/client/detail/${hostName}`)
          if (vmsResult.code === 200) {
            const vms = Object.entries(vmsResult.data || {})
            vms.forEach(([uuid, vm]: [string, any]) => {
              allVMs.push({ uuid, ...vm, host: hostName })
              if (vm.power === 'powered_on') runningCount++
            })
          }
        } catch (error) {
          console.error(`加载主机 ${hostName} 的虚拟机失败:`, error)
        }
      }

      setMyVMs(allVMs)
      setMyVMCount(allVMs.length)
      setMyRunningVMCount(runningCount)
    } catch (error) {
      console.error('加载用户虚拟机失败:', error)
    }
  }

  /**
   * 加载仪表盘数据
   */
  const loadDashboard = async () => {
    try {
      if (isAdmin) {
        await loadAdminDashboard()
      } else {
        await loadUserDashboard()
      }
    } catch (error) {
      console.error('加载仪表盘数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()

    // 定时刷新数据（每30秒）
    const interval = setInterval(loadDashboard, 30000)

    return () => {
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  /**
   * 保存所有配置
   */
  const handleSaveAll = async () => {
    try {
      const result = await api.post('/api/system/saving')
      if (result.code === 200) {
        message.success('配置已保存')
      } else {
        message.error(result.msg || '保存失败')
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      message.error('保存失败')
    }
  }

  /**
   * 打开创建虚拟机模态框
   */
  const handleOpenCreateVM = async () => {
    if (!userQuota?.can_create_vm) {
      message.error('您没有创建虚拟机的权限')
      return
    }

    // 加载可用主机列表
    const hosts = userQuota.assigned_hosts || []
    setAvailableHosts(hosts)

    // 重置表单
    createVMForm.resetFields()
    setUuidPrefix('')
    setMinDiskSize(10)
    setNicList([{ id: 0, type: 'nat', ip: '' }])
    setNicCounter(1)
    setHostConfig(null)
    setServerPlans({})
    setSelectedPlanName('')
    
    // 生成随机密码和VNC端口
    const randomPassword = generateRandomPassword()
    const randomVNCPort = Math.floor(Math.random() * (6999 - 5900 + 1)) + 5900
    
    createVMForm.setFieldsValue({
      os_pass: randomPassword,
      vc_pass: randomPassword,
      vc_port: randomVNCPort,
      cpu_num: 2,
      mem_num: 2,
      hdd_num: 20,
      gpu_mem: 128,
      flu_num: 100,
      speed_u: 100,
      speed_d: 100,
      web_num: 10,
      nat_num: 10,
    })

    setCreateVMModalVisible(true)
  }

  /**
   * 生成随机密码
   */
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let result = ''
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * 添加网卡
   */
  const addNic = () => {
    setNicList([...nicList, { id: nicCounter, type: 'nat', ip: '' }])
    setNicCounter(nicCounter + 1)
  }

  /**
   * 移除网卡
   */
  const removeNic = (id: number) => {
    setNicList(nicList.filter(nic => nic.id !== id))
  }

  /**
   * 操作系统变更
   */
  const handleOsChange = (value: string) => {
    if (!hostConfig?.system_maps) return

    const list = Array.isArray(hostConfig.system_maps) ? hostConfig.system_maps : []
    const matched = list.find((it: any) => {
      if (it && typeof it === 'object' && 'sys_file' in it) {
        return it.sys_file === value
      }
      return false
    })

    if (matched && typeof matched === 'object') {
      const minSize = Number((matched as any).sys_size) || 10
      setMinDiskSize(minSize)
      // 触发硬盘字段验证
      createVMForm.validateFields(['hdd_num'])
    }
  }

  /**
   * 加载主机的系统镜像
   */
  const handleHostChange = async (hostName: string) => {
    try {
      const [result, plansResult] = await Promise.all([
        api.get(`/api/client/os-images/${hostName}`),
        api.get(`/api/server/plan/${hostName}`),
      ])
      if (result.code === 200 && result.data) {
        setHostConfig(result.data)
        
        // 设置UUID前缀
        const prefix = result.data.filter_name || ''
        setUuidPrefix(prefix ? (prefix.endsWith('-') ? prefix : prefix + '-') : '')
        
        // 设置可用镜像
        if (result.data.system_maps) {
          // system_maps 现在为 list[OSConfig] 或旧 dict 格式，统一成 list[OSConfig]风格
          const rawList: any[] = Array.isArray(result.data.system_maps)
            ? result.data.system_maps
            : Object.entries(result.data.system_maps).map(([name, val]: [string, any]) => (
                Array.isArray(val)
                  ? { sys_name: name, sys_file: val[0], sys_size: String(val[1] ?? ''), sys_type: '' }
                  : (val && typeof val === 'object' ? { sys_name: name, ...val } : { sys_name: name, sys_file: val, sys_size: '', sys_type: '' })
              ))
          setAvailableImages(rawList.filter((it: any) => it && it.sys_flag !== false).map((it: any) => it.sys_file as string).filter(Boolean))
          // 同时也需要保存映射关系以供选择显示，这里简化处理，假设value即文件名
        }
      }
      // 加载套餐列表
      const loadedPlans = (plansResult.code === 200 && plansResult.data) ? plansResult.data : {}
      setServerPlans(loadedPlans)
      setSelectedPlanName('')
    } catch (error) {
      console.error('加载系统镜像失败:', error)
      message.error('加载系统镜像失败')
    }
  }

  /**
   * 创建虚拟机
   */
  const handleCreateVM = async () => {
    try {
      const values = await createVMForm.validateFields()
      
      // 构造完整UUID
      const fullUuid = uuidPrefix ? `${uuidPrefix}${values.uuid_suffix}` : values.uuid_suffix

      // 构造网卡配置
      const nicAll: any = {}
      nicList.forEach((nic, index) => {
        nicAll[`ethernet${index}`] = {
          nic_type: nic.type,
          ip4_addr: nic.ip || '',
        }
      })

      // 转换单位：GB -> MB
      const data = {
        ...values,
        uuid: fullUuid,
        mem_num: Math.round(values.mem_num * 1024),
        hdd_num: Math.round(values.hdd_num * 1024),
        gpu_mem: Math.round(values.gpu_mem),
        flu_num: Math.round(values.flu_num * 1024),
        nic_all: nicAll,
        // 非自由配置模式下附带套餐名称
        ...((!canFreeConfig && selectedPlanName) ? { plan_name: selectedPlanName } : {}),
      }
      
      // 删除临时字段
      delete data.uuid_suffix

      const result = await api.post(`/api/client/create/${values.host_name}`, data)
      
      if (result.code === 200) {
        message.success('虚拟机创建成功')
        setCreateVMModalVisible(false)
        loadDashboard()
      } else {
        message.error(result.msg || '创建失败')
      }
    } catch (error) {
      console.error('创建虚拟机失败:', error)
      message.error('创建失败')
    }
  }

  /**
   * 打开电源操作模态框
   */
  const handleOpenPowerModal = (vm: VMInfo) => {
    setCurrentPowerVM({ uuid: vm.uuid, host: vm.host, name: vm.display_name || vm.uuid })
    setPowerModalVisible(true)
  }

  /**
   * 执行电源操作
   */
  const handlePowerAction = async (action: string) => {
    try {
      const result = await api.post(`/api/client/powers/${currentPowerVM.host}/${currentPowerVM.uuid}`, { action })
      
      if (result.code === 200) {
        message.success('操作成功')
        setPowerModalVisible(false)
        loadDashboard()
      } else {
        message.error(result.msg || '操作失败')
      }
    } catch (error) {
      console.error('电源操作失败:', error)
      message.error('操作失败')
    }
  }

  /**
   * 打开VNC控制台
   */
  const handleOpenVNC = async (vm: VMInfo) => {
    try {
      const result = await api.get(`/api/client/remote/${vm.host}/${vm.uuid}`)
      if (result.code === 200 && result.data) {
        openVNCConsole(result.data, `vnc_${vm.uuid}`)
      } else {
        message.error('无法获取VNC控制台地址')
      }
    } catch (error) {
      console.error('打开VNC失败:', error)
      message.error('打开VNC失败')
    }
  }

  /**
   * 格式化内存显示
   */
  const formatMemory = (mb: number) => {
    if (!mb) return '0 MB'
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb} MB`
  }

  /**
   * 格式化存储容量显示
   */
  const formatStorage = (mb: number): string => {
    if (!mb) return '0 MB'
    if (mb < 1024) return `${mb} MB`
    const gb = mb / 1024
    if (gb < 1024) return `${gb.toFixed(1)} GB`
    const tb = gb / 1024
    return `${tb.toFixed(1)} TB`
  }

  /**
   * 计算配额使用百分比（配额为 0 时返回 0，避免 NaN）
   */
  const usagePct = (used: number, quota: number): number =>
    quota > 0 ? Math.round((used / quota) * 100) : 0

  /**
   * 虚拟机状态 → 语义类（颜色由设计层的 .art-sem 统一决定）
   */
  const getVMStatusSem = (vm: VMInfo): { text: string; cls: string } => {
    const statusList = vm.status || []
    const firstStatus = statusList.length > 0 ? statusList[0] : { ac_status: 'UNKNOWN' }
    const powerStatus = firstStatus.ac_status || 'UNKNOWN'

    const statusMap: Record<string, { text: string; cls: string }> = {
      STOPPED: { text: '已停止', cls: '' },
      STARTED: { text: '运行中', cls: 'is-success' },
      SUSPEND: { text: '已暂停', cls: 'is-warning' },
      ON_STOP: { text: '停止中', cls: 'is-accent' },
      ON_OPEN: { text: '启动中', cls: 'is-accent' },
      CRASHED: { text: '已崩溃', cls: 'is-danger' },
      UNKNOWN: { text: '未知', cls: '' },
    }
    return statusMap[powerStatus] || statusMap.UNKNOWN
  }

  /**
   * 主机资源用量单元格：百分比 + 用量比值 + 细进度条，
   * 颜色只在越阈值时切换到警告/危险，常态保持单一强调色。
   */
  const renderUsageCell = (percent: number, used: any, total: any) => {
    const pct = Number.isFinite(percent) ? percent : 0
    const stroke = pct > 80 ? 'var(--art-danger)' : pct > 60 ? 'var(--art-warning)' : 'var(--main-color)'
    return (
      <div>
        <div className="art-cell-sub" style={{ marginBottom: 4 }}>
          {pct.toFixed(0)}% · {used ?? '-'} / {total ?? '-'}
        </div>
        <Progress percent={pct} size="small" showInfo={false} strokeColor={stroke} />
      </div>
    )
  }

  /**
   * 渲染管理员视图
   */
  const renderAdminView = () => (
    <>
      {/* 核心指标 */}
      <div className="art-stat-grid">
        <StatCard
          icon={<CloudServerOutlined />}
          label="主机数量"
          value={systemStats.hosts_count}
          unit="台"
          tone="primary"
          loading={loading}
          onClick={() => navigate('/hosts')}
        />
        <StatCard
          icon={<DesktopOutlined />}
          label="虚拟机数量"
          value={systemStats.vms_count}
          unit="台"
          tone="indigo"
          loading={loading}
          meta={<span className="is-success"><CheckCircleOutlined /> {systemStats.running_vms} 运行中</span>}
        />
        <StatCard
          icon={<TeamOutlined />}
          label="用户数量"
          value={systemStats.users_count}
          unit="个"
          tone="success"
          loading={loading}
          onClick={() => navigate('/users')}
        />
        <StatCard
          icon={<ApiOutlined />}
          label="NAT 端口"
          value={systemStats.total_nat_ports}
          unit="个"
          tone="warning"
          loading={loading}
          onClick={() => navigate('/nat-rules')}
        />
        <StatCard
          icon={<GlobalOutlined />}
          label="Web 代理"
          value={systemStats.total_web_proxy}
          unit="个"
          tone="cyan"
          loading={loading}
          onClick={() => navigate('/web-proxys')}
        />
        <StatCard
          icon={<CheckCircleOutlined />}
          label="系统状态"
          value="正常"
          tone="success"
          loading={loading}
          meta={lastUpdate || '实时监控中'}
        />
      </div>

      {/* 主机列表：面板 + 紧凑表格，资源列共用同一个用量单元格 */}
      <div className="art-panel">
        <div className="art-panel-head">
          <span className="art-panel-title"><CloudServerOutlined />主机列表</span>
          <Space size={8}>
            <Button icon={<SaveOutlined />} onClick={handleSaveAll}>保存配置</Button>
            <Button icon={<SyncOutlined />} onClick={loadDashboard}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/hosts')}>管理主机</Button>
          </Space>
        </div>
        <div className="art-panel-body is-flush">
        <Table
          dataSource={Object.entries(hosts).map(([name, host]: [string, any]) => ({
            key: name,
            name: name,
            ...host,
          }))}
          columns={[
            {
              title: '主机',
              dataIndex: 'name',
              key: 'name',
              width: 220,
              render: (name: string, record: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`art-icon-tile${record.status === 'online' ? ' is-accent' : ''}`} style={{ width: 30, height: 30, fontSize: 14 }}>
                    <CloudServerOutlined />
                  </span>
                  <span className="art-cell-stack">
                    <span className="art-cell-title">{name}</span>
                    <span className="art-cell-sub">{record.server_addr || record.addr || '-'}</span>
                  </span>
                </div>
              ),
            },
            {
              title: '类型',
              dataIndex: 'server_type',
              key: 'server_type',
              width: 130,
              render: (type: string) => <span className="art-cell-sub" style={{ fontSize: 12 }}>{type || '未知'}</span>,
            },
            {
              title: '虚拟机',
              key: 'vms',
              width: 130,
              render: (_: any, record: any) => {
                const current = record.vms_count || record.vm_count || 0
                const max = record.max_vms || 50
                const percent = max > 0 ? Math.round((current / max) * 100) : 0
                return renderUsageCell(percent, current, max)
              },
            },
            {
              title: 'CPU',
              dataIndex: 'cpu_usage',
              key: 'cpu_usage',
              width: 130,
              render: (usage: number, record: any) => renderUsageCell(usage || 0, record.cpu_used, record.cpu_total),
            },
            {
              title: '内存',
              dataIndex: 'memory_usage',
              key: 'memory_usage',
              width: 130,
              render: (usage: number, record: any) => renderUsageCell(usage || 0, record.memory_used, record.memory_total),
            },
            {
              title: '硬盘',
              dataIndex: 'disk_usage',
              key: 'disk_usage',
              width: 130,
              render: (usage: number, record: any) => renderUsageCell(usage || 0, record.disk_used, record.disk_total),
            },
            {
              title: '状态',
              key: 'status',
              width: 110,
              render: (_: any, record: any) => {
                const status = record.status || 'unknown'
                const enabled = record.enabled !== false
                return (
                  <span className="art-cell-stack">
                    <span className={`art-status${status === 'online' ? ' is-success' : status === 'offline' ? ' is-danger' : ''}`}>
                      {status === 'online' ? '在线' : status === 'offline' ? '离线' : '未知'}
                    </span>
                    <span className="art-cell-sub">{enabled ? '已启用' : '已禁用'}</span>
                  </span>
                )
              },
            },
            {
              title: '操作',
              key: 'action',
              width: 90,
              render: (_: any, _record: any) => (
                <Button size="small" icon={<SettingOutlined />} onClick={() => navigate(`/hosts`)}>
                  管理
                </Button>
              ),
            },
          ]}
          pagination={false}
          scroll={{ x: 960 }}
          size="middle"
          locale={{ emptyText: '暂无主机数据' }}
        />
        </div>
      </div>

    </>
  )

  /**
   * 渲染普通用户视图
   */
  const renderUserView = () => {
    // 首屏配额数据还没回来：给出明确的加载态，而不是整页空白
    if (!userQuota) {
      return (
        <div className="art-loading">
          <Spin size="large" />
          <span>正在加载资源配额…</span>
        </div>
      )
    }

    return (
      <>
        {/* 核心配额：只保留 4 个带进度条的关键指标 */}
        <div className="art-stat-grid">
          <StatCard
            icon={<ThunderboltOutlined />}
            label="CPU 核心"
            value={`${userQuota.used_cpu}/${userQuota.quota_cpu}`}
            tone="primary"
            progress={usagePct(userQuota.used_cpu, userQuota.quota_cpu)}
            meta={`剩余 ${Math.max(0, userQuota.quota_cpu - userQuota.used_cpu)} 核`}
          />
          <StatCard
            icon={<RadarChartOutlined />}
            label="内存"
            value={formatStorage(userQuota.used_ram)}
            tone="primary"
            progress={usagePct(userQuota.used_ram, userQuota.quota_ram)}
            meta={`配额 ${formatStorage(userQuota.quota_ram)}`}
          />
          <StatCard
            icon={<HddOutlined />}
            label="存储"
            value={formatStorage(userQuota.used_ssd)}
            tone="primary"
            progress={usagePct(userQuota.used_ssd, userQuota.quota_ssd)}
            meta={`配额 ${formatStorage(userQuota.quota_ssd)}`}
          />
          <StatCard
            icon={<GlobalOutlined />}
            label="流量"
            value={formatStorage(userQuota.used_traffic)}
            tone="primary"
            progress={usagePct(userQuota.used_traffic, userQuota.quota_traffic)}
            meta={`配额 ${formatStorage(userQuota.quota_traffic)}`}
          />
        </div>

        {/* 次级配额：不收进指标层，压缩成一格一字段的明细网格 */}
        <div className="art-panel" style={{ marginTop: 16 }}>
          <div className="art-panel-head">
            <span className="art-panel-title"><ApiOutlined />配额明细</span>
            <span className="art-muted">NAT / 代理 / 带宽 / 显存</span>
          </div>
          <div className="art-panel-body is-flush">
            <div className="art-info-grid" style={{ border: 'none', borderRadius: 0 }}>
              <div>
                <div className="art-info-label">NAT 端口</div>
                <div className="art-info-value is-mono">{userQuota.used_nat_ports} / {userQuota.quota_nat_ports}</div>
              </div>
              <div>
                <div className="art-info-label">Web 代理</div>
                <div className="art-info-value is-mono">{userQuota.used_web_proxy} / {userQuota.quota_web_proxy}</div>
              </div>
              <div>
                <div className="art-info-label">上行带宽</div>
                <div className="art-info-value is-mono">{userQuota.used_bandwidth_up} / {userQuota.quota_bandwidth_up} Mbps</div>
              </div>
              <div>
                <div className="art-info-label">下行带宽</div>
                <div className="art-info-value is-mono">{userQuota.used_bandwidth_down} / {userQuota.quota_bandwidth_down} Mbps</div>
              </div>
              <div>
                <div className="art-info-label">GPU 显存</div>
                <div className="art-info-value is-mono">{formatStorage(userQuota.used_gpu)} / {formatStorage(userQuota.quota_gpu)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 我的虚拟机：面板 + 事件行。一行 = 状态点 + 名称/规格 + 地址 + 操作 */}
        <div className="art-panel" style={{ marginTop: 16 }}>
          <div className="art-panel-head">
            <span className="art-panel-title"><DesktopOutlined />我的虚拟机</span>
            <span className="art-muted">共 {myVMCount} 台 · 运行中 {myRunningVMCount}</span>
            <span style={{ flex: 1 }} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateVM}>
              创建虚拟机
            </Button>
          </div>
          <div className="art-panel-body is-flush">
            {myVMs.length === 0 ? (
              <EmptyState
                icon={<DesktopOutlined />}
                title="暂无虚拟机"
                description="当前账号下还没有可管理的实例。创建后可在此查看运行状态、资源占用与网络配置。"
                actions={
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateVM}>
                    创建虚拟机
                  </Button>
                }
              />
            ) : (
              <ul className="art-log-list">
                {myVMs.map((vm) => {
                  const config = vm.config || {}
                  const nicAll = config.nic_all || {}
                  const firstNic = (Object.values(nicAll)[0] as any) || {}
                  const sem = getVMStatusSem(vm)

                  return (
                    <li className="art-log-item" key={vm.uuid}>
                      <span className={`art-sem art-sem-dot ${sem.cls}`} style={{ marginTop: 7 }} />
                      <div
                        className="art-log-main is-clickable"
                        onClick={() => navigate(`/hosts/${vm.host}/vms/${vm.uuid}`)}
                      >
                        <div className="art-log-meta">
                          <span className="art-cell-title" style={{ fontSize: 13 }}>{vm.display_name || vm.uuid}</span>
                          <span className={`art-sem art-sem-text ${sem.cls}`}>{sem.text}</span>
                          <span>{vm.host}</span>
                          <span>{config.os_name || '未知系统'}</span>
                        </div>
                        <p className="art-log-message" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                          {config.cpu_num || 0}C · {formatMemory(config.mem_num)} · {formatMemory(config.hdd_num)}
                          {firstNic.ip4_addr ? ` · ${firstNic.ip4_addr}` : ''}
                        </p>
                      </div>
                      <div className="art-row-actions">
                        <Tooltip title="VNC 控制台">
                          <Button type="text" size="small" icon={<MonitorOutlined />} onClick={() => handleOpenVNC(vm)} />
                        </Tooltip>
                        <Tooltip title="电源操作">
                          <Button type="text" size="small" icon={<PoweroffOutlined />} onClick={() => handleOpenPowerModal(vm)} />
                        </Tooltip>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="art-stack">
      {/* 页面标题 */}
      <PageHeader
        icon={isAdmin ? <CloudServerOutlined /> : <DesktopOutlined />}
        title={isAdmin ? '系统概览' : '资源概览'}
        subtitle={
          isAdmin
            ? '集群主机、实例与用户资源的整体运行状况'
            : '查看您的实例、配额与网络资源使用情况'
        }
        actions={
          isAdmin ? (
            <Button icon={<SyncOutlined />} onClick={loadDashboard}>刷新数据</Button>
          ) : (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateVM}>创建虚拟机</Button>
          )
        }
      />

      {/* 根据用户角色渲染不同视图 */}
      {isAdmin ? renderAdminView() : renderUserView()}

      {/* 创建虚拟机模态框 */}
      <Modal
        title="创建虚拟机"
        open={createVMModalVisible}
        onCancel={() => setCreateVMModalVisible(false)}
        onOk={handleCreateVM}
        width={800}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createVMForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="主机" name="host_name" rules={[{ required: true, message: '请选择主机' }]}>
                <Select placeholder="请选择主机" onChange={handleHostChange}>
                  {availableHosts.map((host) => (
                    <Select.Option key={host} value={host}>
                      {host}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="操作系统" name="os_name" rules={[{ required: true, message: '请选择操作系统' }]}>
                <Select placeholder="请先选择主机" onChange={handleOsChange}>
                  {availableImages.map((image) => (
                    <Select.Option key={image} value={image}>
                      {image}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="虚拟机UUID" required>
                <Input.Group compact>
                  <Input 
                    style={{ width: '40%', textAlign: 'right', color: '#000', cursor: 'default' }}
                    value={uuidPrefix} 
                    disabled 
                    placeholder="前缀"
                  />
                  <Form.Item
                    name="uuid_suffix"
                    noStyle
                    rules={[{ required: true, message: '请输入UUID后缀' }]}
                  >
                    <Input style={{ width: '70%' }} placeholder="输入UUID后缀 (例如: my-vm-01)" />
                  </Form.Item>
                </Input.Group>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="系统密码" name="os_pass">
                <Input.Password 
                  placeholder="自动生成密码" 
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="VNC密码" name="vc_pass">
                <Input.Password 
                  placeholder="与系统密码一致" 
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="VNC端口" name="vc_port">
            <Input type="number" placeholder="VNC端口（自动分配）" disabled />
          </Form.Item>

          <Divider orientation="left">资源配置</Divider>

          {/* 套餐卡片选择（非自由配置模式时显示） */}
          {!canFreeConfig && (
            <div style={{ marginBottom: 24 }}>
              {Object.keys(serverPlans).length === 0 ? (
                <Alert message="当前主机暂无可用套餐，请联系管理员" type="warning" showIcon style={{ marginBottom: 16 }} />
              ) : (
                <Row gutter={[12, 12]}>
                  {Object.entries(serverPlans).map(([planName, planCfg]: [string, any]) => {
                    // 检查套餐是否超出用户配额
                    const remainCpu = (userQuota?.quota_cpu || 0) - (userQuota?.used_cpu || 0)
                    const remainRam = (userQuota?.quota_ram || 0) - (userQuota?.used_ram || 0)
                    const remainSsd = (userQuota?.quota_ssd || 0) - (userQuota?.used_ssd || 0)
                    const exceedReasons: string[] = []
                    if (planCfg.cpu_num > remainCpu) exceedReasons.push(`CPU超出${planCfg.cpu_num - remainCpu}核`)
                    if (planCfg.mem_num > remainRam) exceedReasons.push(`内存超出${planCfg.mem_num - remainRam}MB`)
                    if (planCfg.hdd_num > remainSsd) exceedReasons.push(`硬盘超出${planCfg.hdd_num - remainSsd}MB`)
                    const isExceeded = exceedReasons.length > 0

                    return (
                    <Col span={8} key={planName}>
                      <div
                        onClick={() => {
                          if (isExceeded) return
                          setSelectedPlanName(planName)
                          createVMForm.setFieldsValue({
                            cpu_num: planCfg.cpu_num,
                            mem_num: Math.round(planCfg.mem_num / 1024),
                            hdd_num: Math.round(planCfg.hdd_num / 1024),
                            gpu_mem: planCfg.gpu_mem ?? 0,
                            flu_num: Math.round(planCfg.flu_num / 1024),
                            speed_u: planCfg.speed_u,
                            speed_d: planCfg.speed_d,
                            web_num: planCfg.web_num,
                            nat_num: planCfg.nat_num,
                          })
                        }}
                        style={{
                          border: selectedPlanName === planName ? '2px solid #1677ff' : '1px solid #d9d9d9',
                          borderRadius: 8,
                          padding: 12,
                          cursor: isExceeded ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          background: isExceeded ? '#f5f5f5' : selectedPlanName === planName ? '#e6f4ff' : 'transparent',
                          opacity: isExceeded ? 0.6 : 1,
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{planName}</div>
                        <div className="text-xs" style={{ color: isExceeded ? '#999' : '#666' }}>
                          <div>CPU: {planCfg.cpu_num}核 {planCfg.cpu_per ? `(可用率${planCfg.cpu_per}%)` : ''}</div>
                          <div>内存: {Math.round(planCfg.mem_num / 1024)}GB / GPU: {planCfg.gpu_mem ? `${planCfg.gpu_mem}MB` : '无'}</div>
                          <div>硬盘: {Math.round(planCfg.hdd_num / 1024)}GB / IOPS: {planCfg.hdd_iop ?? 1000}</div>
                          <div>带宽: ↑{planCfg.speed_u}Mbps ↓{planCfg.speed_d}Mbps</div>
                          <div>流量: {planCfg.flu_num >= 1024 ? `${Math.round(planCfg.flu_num / 1024)}GB` : `${planCfg.flu_num}MB`} / {planCfg.flu_rst?.[0] ?? 31}天重置 / 超限{planCfg.flu_rst?.[1] ?? 10}Mbps</div>
                          <div>NAT: {planCfg.nat_num ?? 0}个 / Web: {planCfg.web_num ?? 0}个</div>
                          <div>网卡: 公网{planCfg.nic_pub ?? 0}张 + 内网{planCfg.nic_pri ?? 1}张 / IPv4: {planCfg.ip4_max ?? 1} / IPv6: {planCfg.ip6_max ?? 0}</div>
                          <div>备份: {planCfg.bak_num ?? 1} / 光盘: {planCfg.iso_num ?? 1}</div>
                          <div>数据盘: {planCfg.dat_num ?? 1}个 / 空间: {planCfg.dat_all ? (planCfg.dat_all >= 1024 ? `${Math.round(planCfg.dat_all / 1024)}GB` : `${planCfg.dat_all}MB`) : '0MB'}</div>
                        </div>
                        {isExceeded && (
                          <div style={{ marginTop: 4, color: '#ff4d4f', fontSize: 11 }}>
                            配额不足: {exceedReasons.join('、')}
                          </div>
                        )}
                      </div>
                    </Col>
                    )
                  })}
                </Row>
              )}
            </div>
          )}

          {/* 资源配置（自由配置模式时显示） */}
          {canFreeConfig && (
          <>
          <Form.Item
            label={`CPU核心 (可用: ${userQuota ? userQuota.quota_cpu - userQuota.used_cpu : 0}个)`} 
            name="cpu_num" 
            initialValue={1}
          >
            <Slider min={1} max={userQuota ? Math.max(1, userQuota.quota_cpu - userQuota.used_cpu) : 1} marks={{ 1: '1', 4: '4', 8: '8', 16: '16' }} />
          </Form.Item>

          <Form.Item 
            label={`内存 (可用: ${userQuota ? formatStorage(userQuota.quota_ram - userQuota.used_ram) : '0MB'})`} 
            name="mem_num" 
            initialValue={1}
          >
            <Slider min={1} max={userQuota ? Math.max(1, Math.floor((userQuota.quota_ram - userQuota.used_ram) / 1024)) : 1} marks={{ 1: '1G', 4: '4G', 8: '8G', 16: '16G' }} />
          </Form.Item>

          <Form.Item 
            label={`硬盘 (可用: ${userQuota ? formatStorage(userQuota.quota_ssd - userQuota.used_ssd) : '0MB'})`} 
            name="hdd_num"
            initialValue={20}
            rules={[
              { required: true },
              { 
                validator: (_, value) => {
                  if (value < minDiskSize) {
                    return Promise.reject(new Error(`最小要求: ${minDiskSize}GB`))
                  }
                  return Promise.resolve()
                }
              }
            ]}
            extra={minDiskSize > 10 ? `当前系统最小要求: ${minDiskSize}GB` : ''}
          >
            <Slider min={10} max={userQuota ? Math.max(10, Math.floor((userQuota.quota_ssd - userQuota.used_ssd) / 1024)) : 10} marks={{ 10: '10G', 100: '100G', 500: '500G' }} />
          </Form.Item>

          <Form.Item label="GPU显存 (MB)" name="gpu_mem" initialValue={0}>
            <Slider min={0} max={16384} step={128} marks={{ 0: '0', 2048: '2G', 8192: '8G' }} />
          </Form.Item>

          <Form.Item label="下行带宽 (Mbps)" name="flu_num" initialValue={10}>
            <Slider min={1} max={100} marks={{ 1: '1M', 10: '10M', 50: '50M', 100: '100M' }} />
          </Form.Item>
          </>
          )}

          <Divider orientation="left">
            <div className="flex justify-between items-center w-full">
              <span>网卡配置</span>
              <Button type="dashed" size="small" onClick={addNic} icon={<PlusOutlined />}>添加网卡</Button>
            </div>
          </Divider>

          {nicList.map((nic, index) => (
            <Row key={nic.id} gutter={16} align="middle" className="mb-2">
              <Col span={8}>
                <span className="mr-2">eth{index}</span>
                <Select 
                  value={nic.type} 
                  onChange={val => {
                    const newList = [...nicList]
                    newList[index].type = val
                    setNicList(newList)
                  }}
                  style={{ width: 100 }}
                >
                  <Select.Option value="nat">NAT</Select.Option>
                  <Select.Option value="bridge">Bridge</Select.Option>
                </Select>
              </Col>
              <Col span={14}>
                <Input 
                  placeholder={nic.type === 'bridge' ? "指定IP (可选)" : "自动分配"}
                  value={nic.ip}
                  onChange={e => {
                    const newList = [...nicList]
                    newList[index].ip = e.target.value
                    setNicList(newList)
                  }}
                  disabled={nic.type === 'nat'}
                />
              </Col>
              <Col span={2}>
                {index > 0 && (
                  <Button 
                    type="text" 
                    danger 
                    icon={<MinusCircleOutlined />} 
                    onClick={() => removeNic(nic.id)} 
                  />
                )}
              </Col>
            </Row>
          ))}
        </Form>
      </Modal>

      {/* 电源操作模态框 */}
      <Modal
        title={`电源操作 - ${currentPowerVM.name}`}
        open={powerModalVisible}
        onCancel={() => setPowerModalVisible(false)}
        footer={null}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Button block type="primary" className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700" onClick={() => handlePowerAction('start')}>
              启动
            </Button>
          </Col>
          <Col span={12}>
            <Button block className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white" onClick={() => handlePowerAction('stop')}>
              关机
            </Button>
          </Col>
          <Col span={12}>
            <Button block type="primary" onClick={() => handlePowerAction('reset')}>
              重启
            </Button>
          </Col>
          <Col span={12}>
            <Button block onClick={() => handlePowerAction('pause')}>
              暂停
            </Button>
          </Col>
          <Col span={12}>
            <Button block type="primary" className="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700" onClick={() => handlePowerAction('resume')}>
              恢复
            </Button>
          </Col>
          <Col span={12}>
            <Button block danger onClick={() => handlePowerAction('hard_stop')}>
              强制关机
            </Button>
          </Col>
          <Col span={12}>
            <Button block danger onClick={() => handlePowerAction('hard_reset')}>
              强制重启
            </Button>
          </Col>
        </Row>
      </Modal>
    </div>
  )
}

export default Dashboards
