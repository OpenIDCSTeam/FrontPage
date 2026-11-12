import React, {useEffect, useState} from 'react'
import {
    Button,
    Modal,
    Form,
    Input,
    Select,
    InputNumber,
    message,
    Row,
    Col,
    Tabs,
    Space,
    Tag,
    Tooltip,
    Progress,
    Table,
    Spin,
    Segmented
} from 'antd'
import EmptyState from '@/components/EmptyState'
import {
    PlusOutlined,
    ReloadOutlined,
    DeleteOutlined,
    EditOutlined,
    PlayCircleOutlined,
    StopOutlined,
    ScanOutlined,
    CloudSyncOutlined,
    CloudServerOutlined,
    GlobalOutlined,
    SettingOutlined,
    FolderOutlined,
    DatabaseOutlined,
    ExclamationCircleOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    SearchOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
    ClearOutlined,
    MergeCellsOutlined,
} from '@ant-design/icons'
import {useNavigate} from 'react-router-dom'
import api from '@/utils/apis.ts'
import PageHeader from '@/components/PageHeader'
import HostConfigBackupActions from '@/components/HostConfigBackupActions'

// 主机配置接口
// OS镜像配置项（system_maps/images_maps通用结构）
interface OSConfigItem {
    sys_name: string   // 显示名称
    sys_file: string   // 文件存储名称
    sys_size: string   // 最低磁盘大小(GB)
    sys_type: string   // WinNT/Linux/macOS
    sys_flag?: boolean // 是否启用此镜像
}

interface HostConfig {
    server_type?: string
    server_addr?: string
    server_user?: string
    server_pass?: string
    filter_name?: string
    images_path?: string
    dvdrom_path?: string
    system_path?: string
    backup_path?: string
    extern_path?: string
    launch_path?: string
    server_port?: number
    network_nat?: string
    network_pub?: string
    i_kuai_addr?: string
    i_kuai_user?: string
    i_kuai_pass?: string
    i_kuai_token?: string
    ports_start?: number
    ports_close?: number
    remote_port?: number
    limits_nums?: number
    /** 反向代理模式：direct=同机直连虚拟机；relay=经爱快公网中转 */
    proxy_mode?: string
    /** 中转地址（relay 模式），留空使用服务器公网IP */
    relay_addr?: string
    /** VNC 反代 IP，留空使用平台地址 */
    vnc_ip?: string
    /** VNC 外网地址（可含端口），填写后返回给用户的是该地址 */
    vnc_wan?: string
    system_maps?: OSConfigItem[]
    images_maps?: OSConfigItem[]
    ipaddr_maps?: Record<string, any>
    ipaddr_ddns?: string[]
    public_addr?: string[]
    extend_data?: any
    server_area?: string
    n_cpu_price?: number
    n_mem_price?: number
    n_hdd_price?: number
    n_net_price?: number
    server_plan?: Record<string, any>
}

// 套餐配置行接口
interface ServerPlanRow {
    id: string
    planName: string
    cpu_num: number
    cpu_per: number
    gpu_mem: number
    mem_num: number
    hdd_num: number
    hdd_iop: number
    bak_num: number
    iso_num: number
    pci_num: number
    usb_num: number
    dat_num: number
    dat_all: number
    speed_u: number
    speed_d: number
    nat_num: number
    web_num: number
    flu_num: number
    flu_rst: number[]
    nic_pub: number
    nic_pri: number
    ip4_max: number
    ip6_max: number
}

// 主机数据接口
interface Host {
    name: string
    type: string
    addr: string
    status: string
    vm_count: number
    config?: HostConfig
}

// 主机状态接口
interface HostStatus {
    cpu_usage?: number
    cpu_total?: number
    cpu_model?: string
    cpu_heats?: number
    cpu_power?: number
    mem_usage?: number
    mem_total?: number
    hdd_usage?: number
    hdd_total?: number
    ext_usage?: Record<string, [number, number]>
    network_a?: number
    network_u?: number
    network_d?: number
    gpu_usage?: Record<string, number>
    gpu_total?: number
    status?: string
}

// 引擎类型配置接口
interface EngineTypeConfig {
    enabled: boolean
    description: string
    messages?: string[]
    options?: Record<string, string>
}

// 系统镜像行接口
interface SystemMapRow {
    id: string
    sys_name: string
    sys_file: string
    sys_size: string
    sys_type: string
    sys_flag: boolean
}

// 光盘镜像行接口
interface ImageMapRow {
    id: string
    sys_name: string
    sys_file: string
    sys_size: string
    sys_type: string
    sys_flag: boolean
}

// IP地址池配置行接口
interface IpaddrMapRow {
    id: string
    setName: string
    vers: string
    type: string
    gate: string
    mask: string
    fromIp: string
    nums: number
}

// 主机列表视图组件
function HostTableView({ hosts, hostsStatus, engineTypes, navigate, handleEdit, handleToggle }: {
    hosts: Record<string, Host>
    hostsStatus: Record<string, HostStatus>
    engineTypes: Record<string, EngineTypeConfig>
    navigate: any
    handleEdit: (name: string) => void
    handleToggle: (name: string, enable: boolean) => void
}) {
    const [visiblePublicAddr, setVisiblePublicAddr] = useState<Record<string, boolean>>({})

    const togglePublicAddr = (name: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setVisiblePublicAddr(prev => ({ ...prev, [name]: !prev[name] }))
    }

    const dataSource = Object.entries(hosts).map(([name, host]) => ({
        key: name,
        name,
        host,
        status: hostsStatus[name],
    }))

    const hasGpu = dataSource.some((record: any) => (record.status?.gpu_total || 0) > 0)

    const columns = [
        {
            title: '主机名称',
            key: 'name',
            width: 160,
            fixed: 'left' as const,
            render: (_: any, record: any) => {
                const isActive = record.host.status === 'active'
                const dotColor = isActive ? 'var(--art-success)' : 'var(--art-danger)'
                return (
                    <div>
                        <div className="art-table-identity">
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0, boxShadow: isActive ? '0 0 4px var(--art-success)' : undefined }} />
                            <CloudServerOutlined style={{ color: 'var(--art-accent-text)' }} />
                            <a className="art-table-link" title={record.name} onClick={() => navigate(`/hosts/${record.name}/vms`)}>{record.name}</a>
                        </div>
                        <div className="art-table-meta">
                            <Tag color={isActive ? 'success' : 'error'} style={{ margin: 0, fontSize: 11 }}>
                                {isActive ? '已启用' : '已禁用'}
                            </Tag>
                        </div>
                    </div>
                )
            },
        },
        {
            title: '引擎',
            key: 'type',
            width: 140,
            render: (_: any, record: any) => {
                const typeInfo = engineTypes[record.host.type] || {}
                const engineDetail = [record.host.type, record.host.config?.server_user].filter(Boolean).join(' · ')
                return (
                    <div className="art-cell-stack" title={engineDetail}>
                        <span className="art-cell-title" style={{ fontSize: 12 }}>{typeInfo.description || record.host.type}</span>
                        <span className="art-cell-sub">{engineDetail || '未配置登录用户'}</span>
                    </div>
                )
            },
        },
        {
            title: '连接地址',
            key: 'connection',
            width: 160,
            render: (_: any, record: any) => {
                const address = record.host.addr || record.host.config?.server_addr || ''
                const port = record.host.config?.server_port
                if (!address) return <span className="art-table-muted">未配置</span>
                return (
                    <span className="art-table-mono" title={port ? `${address}:${port}` : address}>
                        {address}{port ? `:${port}` : ''}
                    </span>
                )
            },
        },
        {
            title: '公网地址',
            key: 'public',
            width: 160,
            render: (_: any, record: any) => {
                const publicAddrs = record.host.config?.public_addr || []
                const showPublic = visiblePublicAddr[record.name]
                if (publicAddrs.length === 0) return <span className="text-xs" style={{ color: 'var(--art-gray-500)' }}>-</span>
                return (
                    <div className="flex items-center gap-1">
                        {showPublic ? (
                            <span className="text-xs">{publicAddrs.join(', ')}</span>
                        ) : (
                            <span className="text-xs" style={{ color: 'var(--art-gray-500)' }}>••••••</span>
                        )}
                        <Tooltip title={showPublic ? '隐藏' : '查看'}>
                            <Button
                                type="text"
                                size="small"
                                icon={showPublic ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                onClick={(e) => togglePublicAddr(record.name, e)}
                                style={{ fontSize: 12 }}
                            />
                        </Tooltip>
                    </div>
                )
            },
        },
        {
            title: '虚拟机',
            key: 'vms',
            width: 80,
            render: (_: any, record: any) => (
                <span className="text-xs">{record.host.vm_count || 0} / {record.host.config?.limits_nums || 0}</span>
            ),
        },
        {
            title: 'CPU',
            key: 'cpu',
            width: 120,
            render: (_: any, record: any) => {
                const status = record.status
                const cpuPercent = status ? Math.min(status.cpu_usage || 0, 100) : 0
                return (
                    <div title={status?.cpu_model || 'CPU 型号未上报'}>
                        <div className="text-xs mb-1">
                            {status?.cpu_total || 0}核 {cpuPercent.toFixed(1)}%
                        </div>
                        <Progress
                            percent={Number(cpuPercent.toFixed(0))}
                            size="small"
                            showInfo={false}
                            strokeColor={cpuPercent > 80 ? 'var(--art-danger)' : cpuPercent > 50 ? 'var(--art-warning)' : 'var(--main-color)'}
                        />
                    </div>
                )
            },
        },
        {
            title: '内存',
            key: 'mem',
            width: 110,
            render: (_: any, record: any) => {
                const status = record.status
                const memPercent = status && status.mem_total ? Math.min((status.mem_usage || 0) / status.mem_total * 100, 100) : 0
                const fmtMem = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)}G` : `${mb}M`
                return (
                    <div>
                        <div className="text-xs mb-1">
                            {status ? `${fmtMem(status.mem_usage || 0)}/${fmtMem(status.mem_total || 0)}` : '-'}
                        </div>
                        <Progress
                            percent={Number(memPercent.toFixed(0))}
                            size="small"
                            showInfo={false}
                            strokeColor={memPercent > 80 ? 'var(--art-danger)' : memPercent > 50 ? 'var(--art-warning)' : 'var(--art-chart-4)'}
                        />
                    </div>
                )
            },
        },
        {
            title: '磁盘',
            key: 'hdd',
            width: 110,
            render: (_: any, record: any) => {
                const status = record.status
                const hddPercent = status && status.hdd_total ? Math.min((status.hdd_usage || 0) / status.hdd_total * 100, 100) : 0
                const fmtDisk = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)}G` : `${mb}M`
                return (
                    <div>
                        <div className="text-xs mb-1">
                            {status?.hdd_total ? `${fmtDisk(status.hdd_usage || 0)}/${fmtDisk(status.hdd_total)}` : '-'}
                        </div>
                        <Progress
                            percent={Number(hddPercent.toFixed(0))}
                            size="small"
                            showInfo={false}
                            strokeColor={hddPercent > 80 ? 'var(--art-danger)' : hddPercent > 50 ? 'var(--art-warning)' : 'var(--art-success)'}
                        />
                    </div>
                )
            },
        },
        ...(hasGpu ? [{
            title: '显卡',
            key: 'gpu',
            width: 96,
            render: (_: any, record: any) => {
                const status = record.status
                if (!status?.gpu_total) return <span className="art-table-muted">-</span>
                const peak = status.gpu_usage
                    ? Math.max(...Object.values(status.gpu_usage as Record<string, number>).map(value => Number(value) || 0))
                    : 0
                return (
                    <div className="art-cell-stack">
                        <span className="art-table-mono">{status.gpu_total} 张</span>
                        <span className="art-cell-sub">峰值 {peak.toFixed(0)}%</span>
                    </div>
                )
            },
        }] : []),
        {
            title: '网络',
            key: 'network',
            width: 120,
            render: (_: any, record: any) => {
                const status = record.status
                if (!status) return <span className="art-table-muted">-</span>
                const rate = (value?: number) => ((value || 0) / 1024).toFixed(1)
                return (
                    <div className="art-cell-stack">
                        <span className="art-table-mono">↑ {rate(status.network_u)} / ↓ {rate(status.network_d)}</span>
                        <span className="art-cell-sub">MB/s</span>
                    </div>
                )
            },
        },
        {
            title: '区域',
            key: 'area',
            width: 96,
            render: (_: any, record: any) => {
                const area = record.host.config?.server_area
                return area ? <span className="art-table-strong">{area}</span> : <span className="art-table-muted">-</span>
            },
        },
        {
            title: '端口',
            key: 'ports',
            width: 130,
            render: (_: any, record: any) => {
                const { ports_start, ports_close, remote_port } = record.host.config || {}
                const range = ports_start && ports_close ? `${ports_start}–${ports_close}` : '-'
                return (
                    <div className="art-cell-stack">
                        <span className="art-table-mono">TCP {range}</span>
                        <span className="art-cell-sub">VNC {remote_port || '-'}</span>
                    </div>
                )
            },
        },
        {
            title: '操作',
            key: 'actions',
            width: 104,
            fixed: 'right' as const,
            render: (_: any, record: any) => {
                const isActive = record.host.status === 'active'
                return (
                    <div className="art-table-actions">
                        <Tooltip title="管理虚拟机">
                            <Button aria-label="管理虚拟机" className="art-table-icon-btn" type="text" size="small" icon={<CloudServerOutlined />} onClick={() => navigate(`/hosts/${record.name}/vms`)} disabled={!isActive} />
                        </Tooltip>
                        <Tooltip title="编辑">
                            <Button aria-label="编辑主机" className="art-table-icon-btn" type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record.name)} disabled={!isActive} />
                        </Tooltip>
                        <Tooltip title={isActive ? '禁用' : '启用'}>
                            <Button
                                aria-label={isActive ? '禁用主机' : '启用主机'}
                                className="art-table-icon-btn"
                                type="text"
                                size="small"
                                icon={isActive ? <StopOutlined style={{ color: 'var(--art-warning)' }} /> : <PlayCircleOutlined style={{ color: 'var(--art-success)' }} />}
                                onClick={() => handleToggle(record.name, !isActive)}
                            />
                        </Tooltip>
                    </div>
                )
            },
        },
    ]

    return (
        <Table
            dataSource={dataSource}
            columns={columns}
            size="small"
            scroll={{ x: 'max-content' }}
            pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                showTotal: (total) => `共 ${total} 条`,
            }}
            locale={{
                emptyText: (
                    <div className="art-table-empty">
                        <CloudServerOutlined />
                        <p>暂无主机数据</p>
                    </div>
                ),
            }}
        />
    )
}

/**
 * 归一化虚拟机前缀：去掉末尾的 “-” 与首尾空白。
 * 末尾的分隔符由系统自动补，避免用户手填出 “web--” 这类重复分隔。
 */
const normalizeFilterPrefix = (value?: string) => (value || '').trim().replace(/-+$/, '')

/** 前缀落库形态：非空时统一以 “-” 结尾，与虚拟机命名 {前缀}-{后缀} 保持一致 */
const withFilterSuffix = (value?: string) => {
    const base = normalizeFilterPrefix(value)
    return base ? `${base}-` : ''
}

/**
 * 主机管理页面
 */
function HostManage() {
    // 路由导航
    const navigate = useNavigate()

    // 状态管理
    const [hosts, setHosts] = useState<Record<string, Host>>({})
    const [hostsStatus, setHostsStatus] = useState<Record<string, HostStatus>>({})
    const [engineTypes, setEngineTypes] = useState<Record<string, EngineTypeConfig>>({})
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
        return (localStorage.getItem('hostManage_viewMode') as 'card' | 'table') || 'card'
    })
    const [hostSearch, setHostSearch] = useState('')
    const filteredHosts = Object.fromEntries(Object.entries(hosts).filter(([name, host]) => {
        const query = hostSearch.trim().toLocaleLowerCase()
        if (!query) return true
        const typeName = engineTypes[host.type]?.description || host.type || ''
        return [name, host.type, host.addr, host.config?.server_addr, typeName]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase()
            .includes(query)
    }))
    const [modalVisible, setModalVisible] = useState(false)
    const [editMode, setEditMode] = useState<'add' | 'edit'>('add')
    const [currentHost, setCurrentHost] = useState<string>('')
    const [form] = Form.useForm()

    // 用于跟踪最新的主机列表，避免闭包问题
    const hostsRef = React.useRef(hosts)

    useEffect(() => {
        hostsRef.current = hosts
    }, [hosts])

    // 动态配置状态
    const [systemMaps, setSystemMaps] = useState<SystemMapRow[]>([])
    const [imageMaps, setImageMaps] = useState<ImageMapRow[]>([])
    const [ipaddrMaps, setIpaddrMaps] = useState<IpaddrMapRow[]>([])
    const [serverPlans, setServerPlans] = useState<ServerPlanRow[]>([])
    const [selectedHostType, setSelectedHostType] = useState<string>('')

    // 加载引擎类型
    const loadEngineTypes = async () => {
        try {
            const result = await api.getEngineTypes()
            if (result.code === 200) {
                // 后端返回格式: { current_platform, current_arch, engine_types: {...} }
                const data = result.data as any || {}
                const engineData = data.engine_types || {}
                if (typeof engineData === 'object' && !Array.isArray(engineData)) {
                    setEngineTypes(engineData as Record<string, EngineTypeConfig>)
                }
            }
        } catch (error) {
            console.error('加载引擎类型失败:', error)
        }
    }

    // 状态加载与列表渲染解耦：
    // 采集主机状态要访问平台 API（PVE/ESXi/云），慢的时候要几秒；
    // 打开页面时如果等所有主机状态返回，列表会一直转圈。
    // 现在先渲染列表，状态到达后再增量填充。
    const loadHostsStatus = (names: string[]) => {
        if (!names.length) return
        const statusPromises = names.map(name =>
            api.getHostStatus(name).catch(() => null)
        )
        Promise.all(statusPromises).then(statusResults => {
            const statusMap: Record<string, HostStatus> = {}
            names.forEach((name, index) => {
                const statusResult = statusResults[index] as any
                if (statusResult && statusResult.code === 200 && statusResult.data?.status) {
                    statusMap[name] = statusResult.data.status
                }
            })
            setHostsStatus(prev => ({ ...prev, ...statusMap }))
        })
    }

    // 加载主机列表
    const loadHosts = async () => {
        try {
            setLoading(true)
            const result = await api.getHosts()
            if (result.code === 200 && result.data) {
                setHosts(result.data as unknown as Record<string, Host>)

                // 仅对已启用的主机加载状态，禁用主机不调用getHostStatus
                const enabledNames = Object.keys(result.data).filter(name =>
                    (result.data as any)[name].status === 'active'
                )
                // 列表已经可用，先结束 loading，再后台补状态
                setLoading(false)
                loadHostsStatus(enabledNames)
            }
        } catch (error) {
            message.error('加载主机列表失败')
        } finally {
            setLoading(false)
        }
    }

    // 初始加载
    useEffect(() => {
        loadEngineTypes()
        loadHosts()
    }, [])

    // 定时刷新状态 - 刷新主机列表和状态，确保enable_host等字段实时更新
    useEffect(() => {
        const refreshHostsAndStatus = async () => {
            try {
                // 1. 刷新主机列表（包含is_enabled状态）
                const hostsResult = await api.getHosts()
                if (hostsResult.code === 200 && hostsResult.data) {
                    setHosts(hostsResult.data as unknown as Record<string, Host>)

                    // 2. 仅对已启用的主机刷新状态，禁用主机不调用getHostStatus；
                    //    状态异步补，不阻塞下一次轮询
                    const enabledNames = Object.keys(hostsResult.data).filter(name =>
                        (hostsResult.data as any)[name].status === 'active'
                    )
                    loadHostsStatus(enabledNames)
                }
            } catch (error) {
                console.error('刷新主机数据失败:', error)
            }
        }

        // 只通过定时器执行，不立即执行
        const interval = setInterval(refreshHostsAndStatus, 10000)

        return () => clearInterval(interval)
    }, [])

    // 复制到剪贴板
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            message.success(`已复制: ${text}`)
        }).catch(() => {
            message.error('复制失败')
        })
    }

    // 打开添加主机对话框
    const handleAdd = () => {
        setEditMode('add')
        setCurrentHost('')
        setSelectedHostType('')
        form.resetFields()
        setSystemMaps([{id: Date.now().toString(), sys_name: '', sys_file: '', sys_size: '', sys_type: '', sys_flag: true}])
        setImageMaps([{id: Date.now().toString(), sys_name: '', sys_file: '', sys_size: '', sys_type: '', sys_flag: true}])
        setIpaddrMaps([{
            id: Date.now().toString(),
            setName: '',
            vers: 'ipv4',
            type: 'nat',
            gate: '',
            mask: '',
            fromIp: '',
            nums: 0
        }])
        setServerPlans([])
        setModalVisible(true)
    }

    // 打开编辑主机对话框
    const handleEdit = async (name: string) => {
        try {
            const result = await api.getHostDetail(name)
            if (result.code === 200 && result.data) {
                const hostData = result.data as unknown as Host
                setEditMode('edit')
                setCurrentHost(name)
                setSelectedHostType(hostData.type)

                const config = hostData.config || {}

                // 先重置表单，防止残留上次编辑的字段值
                form.resetFields()

                // 设置表单值
                form.setFieldsValue({
                    name: name,
                    type: hostData.type,
                    server_addr: config.server_addr,
                    server_user: config.server_user,
                    server_pass: config.server_pass,
                    filter_name: normalizeFilterPrefix(config.filter_name),
                    images_path: config.images_path,
                    dvdrom_path: config.dvdrom_path,
                    system_path: config.system_path,
                    backup_path: config.backup_path,
                    extern_path: config.extern_path,
                    launch_path: config.launch_path,
                    server_port: config.server_port,
                    network_nat: config.network_nat,
                    network_pub: config.network_pub,
                    i_kuai_addr: config.i_kuai_addr,
                    i_kuai_user: config.i_kuai_user,
                    i_kuai_pass: config.i_kuai_pass,
                    i_kuai_token: config.i_kuai_token,
                    ports_start: config.ports_start,
                    ports_close: config.ports_close,
                    remote_port: config.remote_port,
                    limits_nums: config.limits_nums,
                    proxy_mode: config.proxy_mode || 'direct',
                    relay_addr: config.relay_addr,
                    vnc_ip: config.vnc_ip,
                    vnc_wan: config.vnc_wan,
                    ipaddr_ddns: (config.ipaddr_ddns || []).join(', '),
                    public_addr: (config.public_addr || []).join(', '),
                    extend_data: config.extend_data ? JSON.stringify(config.extend_data, null, 2) : '',
                    // server_area 存储为 "代码,名称"（如 "CN,成都"），回显时拆为两个字段
                    area_code: ((config.server_area || '').split(',', 2)[0] || '').trim(),
                    area_name: ((config.server_area || '').split(',', 2)[1] || '').trim(),
                    // 售价配置
                    n_cpu_price: config.n_cpu_price ?? 0,
                    n_mem_price: config.n_mem_price ?? 0,
                    n_hdd_price: config.n_hdd_price ?? 0,
                    n_net_price: config.n_net_price ?? 0
                })

                // 加载系统镜像列表
                const systemMapsData: SystemMapRow[] = []
                if (Array.isArray(config.system_maps)) {
                    config.system_maps.forEach((item: OSConfigItem) => {
                        systemMapsData.push({
                            id: Date.now().toString() + Math.random(),
                                sys_name: item.sys_name || '',
                                sys_file: item.sys_file || '',
                                sys_size: item.sys_size || '',
                                sys_type: item.sys_type || '',
                                sys_flag: item.sys_flag !== false
                            })
                        })
                    }
                    setSystemMaps(systemMapsData.length > 0 ? systemMapsData : [{
                        id: Date.now().toString(),
                        sys_name: '',
                        sys_file: '',
                        sys_size: '',
                        sys_type: '',
                        sys_flag: true
                }])

                // 加载光盘镜像列表
                const imageMapsData: ImageMapRow[] = []
                if (Array.isArray(config.images_maps)) {
                    config.images_maps.forEach((item: OSConfigItem) => {
                        imageMapsData.push({
                            id: Date.now().toString() + Math.random(),
                                sys_name: item.sys_name || '',
                                sys_file: item.sys_file || '',
                                sys_size: item.sys_size || '',
                                sys_type: item.sys_type || '',
                                sys_flag: item.sys_flag !== false
                            })
                        })
                    }
                    setImageMaps(imageMapsData.length > 0 ? imageMapsData : [{
                        id: Date.now().toString(),
                        sys_name: '',
                        sys_file: '',
                        sys_size: '',
                        sys_type: '',
                        sys_flag: true
                }])

                // 加载IP地址池配置
                const ipaddrMapsData: IpaddrMapRow[] = []
                if (config.ipaddr_maps) {
                    Object.entries(config.ipaddr_maps).forEach(([setName, ipConfig]: [string, any]) => {
                        ipaddrMapsData.push({
                            id: Date.now().toString() + Math.random(),
                            setName,
                            vers: ipConfig.vers || 'ipv4',
                            type: ipConfig.type || 'nat',
                            gate: ipConfig.gate || '',
                            mask: ipConfig.mask || '',
                            fromIp: ipConfig.from || '',
                            nums: ipConfig.nums || 0
                        })
                    })
                }
                setIpaddrMaps(ipaddrMapsData.length > 0 ? ipaddrMapsData : [{
                    id: Date.now().toString(),
                    setName: '',
                    vers: 'ipv4',
                    type: 'nat',
                    gate: '',
                    mask: '',
                    fromIp: '',
                    nums: 0
                }])

                // 加载套餐配置
                const serverPlansData: ServerPlanRow[] = []
                if (config.server_plan) {
                    Object.entries(config.server_plan).forEach(([planName, planCfg]: [string, any]) => {
                        serverPlansData.push({
                            id: Date.now().toString() + Math.random(),
                            planName,
                            cpu_num: planCfg.cpu_num ?? 2,
                            cpu_per: planCfg.cpu_per ?? 0,
                            gpu_mem: planCfg.gpu_mem ?? 0,
                            mem_num: planCfg.mem_num ?? 2048,
                            hdd_num: planCfg.hdd_num ?? 8192,
                            hdd_iop: planCfg.hdd_iop ?? 1000,
                            bak_num: planCfg.bak_num ?? 1,
                            iso_num: planCfg.iso_num ?? 1,
                            pci_num: planCfg.pci_num ?? 0,
                            usb_num: planCfg.usb_num ?? 0,
                            dat_num: planCfg.dat_num ?? 1,
                            dat_all: planCfg.dat_all ?? 0,
                            speed_u: planCfg.speed_u ?? 100,
                            speed_d: planCfg.speed_d ?? 100,
                            nat_num: planCfg.nat_num ?? 100,
                            web_num: planCfg.web_num ?? 100,
                            flu_num: planCfg.flu_num ?? 102400,
                            flu_rst: Array.isArray(planCfg.flu_rst) ? planCfg.flu_rst : [31, 10, 10],
                            nic_pub: planCfg.nic_pub ?? 0,
                            nic_pri: planCfg.nic_pri ?? 1,
                            ip4_max: planCfg.ip4_max ?? 1,
                            ip6_max: planCfg.ip6_max ?? 0,
                        })
                    })
                }
                setServerPlans(serverPlansData)

                setModalVisible(true)
            }
        } catch (error) {
            console.error('加载主机信息失败:', error)
            message.error('加载主机信息失败:' + (error as Error).message)
        }
    }

    // 提交表单
    const handleSubmit = async (values: any) => {
        try {
            // 构建系统镜像列表
            const system_maps: OSConfigItem[] = []
            systemMaps.forEach(row => {
                if (row.sys_name && row.sys_file) {
                    system_maps.push({
                        sys_name: row.sys_name,
                        sys_file: row.sys_file,
                        sys_size: row.sys_size || '0',
                        sys_type: row.sys_type || '',
                        sys_flag: row.sys_flag !== false
                    })
                }
            })

            // 构建光盘镜像列表
            const images_maps: OSConfigItem[] = []
            imageMaps.forEach(row => {
                if (row.sys_name && row.sys_file) {
                    images_maps.push({
                        sys_name: row.sys_name,
                        sys_file: row.sys_file,
                        sys_size: row.sys_size || '0',
                        sys_type: row.sys_type || '',
                        sys_flag: row.sys_flag !== false
                    })
                }
            })

            // 构建IP地址池配置
            const ipaddr_maps: Record<string, any> = {}
            ipaddrMaps.forEach(row => {
                if (row.setName && row.fromIp && row.nums > 0) {
                    ipaddr_maps[row.setName] = {
                        vers: row.vers,
                        type: row.type,
                        gate: row.gate,
                        mask: row.mask,
                        from: row.fromIp,
                        nums: row.nums
                    }
                }
            })

            // 解析扩展数据
            let extend_data = {}
            if (values.extend_data) {
                try {
                    extend_data = JSON.parse(values.extend_data)
                } catch (e) {
                    message.error('扩展数据JSON格式错误')
                    return
                }
            }

            // 构建套餐配置
            const server_plan: Record<string, any> = {}
            serverPlans.forEach(row => {
                if (row.planName) {
                    server_plan[row.planName] = {
                        cpu_num: row.cpu_num,
                        cpu_per: row.cpu_per,
                        gpu_mem: row.gpu_mem,
                        mem_num: row.mem_num,
                        hdd_num: row.hdd_num,
                        hdd_iop: row.hdd_iop,
                        bak_num: row.bak_num,
                        iso_num: row.iso_num,
                        pci_num: row.pci_num,
                        usb_num: row.usb_num,
                        dat_num: row.dat_num,
                        dat_all: row.dat_all,
                        speed_u: row.speed_u,
                        speed_d: row.speed_d,
                        nat_num: row.nat_num,
                        web_num: row.web_num,
                        flu_num: row.flu_num,
                        flu_rst: Array.isArray(row.flu_rst) && row.flu_rst.length === 3 ? row.flu_rst : [31, 10, 10],
                        nic_pub: row.nic_pub,
                        nic_pri: row.nic_pri,
                        ip4_max: row.ip4_max,
                        ip6_max: row.ip6_max,
                    }
                }
            })

            const config: HostConfig = {
                server_type: values.type,
                server_addr: values.server_addr,
                server_user: values.server_user,
                server_pass: values.server_pass,
                filter_name: withFilterSuffix(values.filter_name),
                images_path: values.images_path,
                dvdrom_path: values.dvdrom_path,
                system_path: values.system_path,
                backup_path: values.backup_path,
                extern_path: values.extern_path,
                launch_path: values.launch_path,
                server_port: values.server_port,
                network_nat: values.network_nat,
                network_pub: values.network_pub,
                i_kuai_addr: values.i_kuai_addr,
                i_kuai_user: values.i_kuai_user,
                i_kuai_pass: values.i_kuai_pass,
                i_kuai_token: values.i_kuai_token,
                ports_start: values.ports_start,
                ports_close: values.ports_close,
                remote_port: values.remote_port,
                limits_nums: values.limits_nums,
                proxy_mode: values.proxy_mode || 'direct',
                relay_addr: values.relay_addr || '',
                vnc_ip: values.vnc_ip || '',
                vnc_wan: values.vnc_wan || '',
                system_maps,
                images_maps,
                ipaddr_maps,
                ipaddr_ddns: values.ipaddr_ddns ? values.ipaddr_ddns.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
                public_addr: values.public_addr ? values.public_addr.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
                extend_data,
                // 将 area_code + area_name 合并为 "代码,名称" 格式；只有一个时只传一个；都空则为空串
                server_area: (() => {
                    const code = (values.area_code || '').trim()
                    const name = (values.area_name || '').trim()
                    if (code && name) return `${code},${name}`
                    return code || name || ''
                })(),
                n_cpu_price: Number(values.n_cpu_price) || 0,
                n_mem_price: Number(values.n_mem_price) || 0,
                n_hdd_price: Number(values.n_hdd_price) || 0,
                n_net_price: Number(values.n_net_price) || 0,
                server_plan,
            }

            if (editMode === 'add') {
                await api.createHost({
                    name: values.name,
                    type: values.type,
                    config: config,
                    server_pass: values.server_pass
                } as any)
                message.success('主机添加成功')
            } else {
                await api.updateHost(currentHost, { config } as any)
                message.success('主机更新成功')
            }

            setModalVisible(false)
            loadHosts()
        } catch (error: any) {
            message.error(error.message || '操作失败')
        }
    }

    // 删除主机
    const handleDelete = async (name: string) => {
        try {
            await api.deleteHost(name)
            message.success('主机删除成功')
            loadHosts()
        } catch (error) {
            message.error('删除主机失败')
        }
    }

    // 切换主机状态（启用/禁用）
    const handleToggle = async (name: string, enable: boolean) => {
        // 如果是禁用操作，弹出确认对话框
        if (!enable) {
            Modal.confirm({
                title: '确认禁用主机',
                icon: <ExclamationCircleOutlined style={{color: 'var(--art-warning)'}}/>,
                content: (
                    <div>
                        <p>确定要禁用主机 <strong>"{name}"</strong> 吗？</p>
                        <p style={{marginTop: 8}}>
                            禁用后：
                        </p>
                        <ul style={{marginTop: 4, paddingLeft: 20}}>
                            <li>该主机的虚拟机操作将不可用</li>
                            <li>系统不再自动更新该主机状态</li>
                            <li>但运行中的虚拟机不会被关闭</li>
                        </ul>
                    </div>
                ),
                okText: '确认禁用',
                okType: 'danger',
                cancelText: '取消',
                mask: false,
                onOk: async () => {
                    try {
                        await api.setHostEnabled(name, enable)
                        message.success('主机已禁用')
                        loadHosts()
                    } catch (error) {
                        message.error('禁用失败')
                    }
                }
            })
        } else {
            // 启用操作也需要二次确认
            Modal.confirm({
                title: '确认启用主机',
                icon: <ExclamationCircleOutlined style={{color: 'var(--art-success)'}}/>,
                content: (
                    <div>
                        <p>确定要启用主机 <strong>"{name}"</strong> 吗？</p>
                        <p style={{marginTop: 8}}>
                            启用后：
                        </p>
                        <ul style={{marginTop: 4, paddingLeft: 20}}>
                            <li>系统将恢复对该主机的状态监控</li>
                            <li>该主机的虚拟机操作将恢复可用</li>
                        </ul>
                    </div>
                ),
                okText: '确认启用',
                cancelText: '取消',
                mask: false,
                onOk: async () => {
                    try {
                        await api.setHostEnabled(name, enable)
                        message.success('主机已启用')
                        loadHosts()
                    } catch (error) {
                        message.error('启用失败')
                    }
                }
            })
        }
    }

    // 扫描虚拟机
    const handleScanVMs = async (name: string) => {
        try {
            const result = await api.scanVMs(name)
            if (result.code === 200) {
                const data = result.data || {}
                message.success(`扫描完成：扫描到 ${data.scanned || 0} 台虚拟机，新增 ${data.added || 0} 台`)
                loadHosts()
            } else {
                message.error(result.msg || '扫描失败')
            }
        } catch (error) {
            message.error('扫描失败')
        }
    }

    // 清理不匹配「过滤器名称」前缀的历史纳管记录（仅本机记录，不删除平台虚拟机）
    const handleCleanupRecords = async (name: string) => {
        try {
            const preview = await api.cleanupVMRecords(name, true)
            if (preview.code !== 200) {
                message.error(preview.msg || '清理预览失败')
                return
            }
            const data: any = preview.data || {}
            const count: number = data.count || 0
            const prefix: string = data.prefix_filter || ''
            if (!count) {
                message.success(`没有需要清理的记录（过滤器名称：${prefix}）`)
                return
            }
            const items: string[] = data.items || []
            const shown = items.slice(0, 10).join('、')
            Modal.confirm({
                title: '清理不匹配前缀的虚拟机记录',
                icon: <DeleteOutlined style={{color: 'var(--art-warning)'}}/>,
                content: (
                    <div>
                        <p>将移除 <strong style={{color: 'var(--art-warning)'}}>{count}</strong> 条不匹配过滤器名称「<strong>{prefix}</strong>」的记录：</p>
                        <p style={{color: 'var(--text-secondary)', wordBreak: 'break-all'}}>
                            {shown}{items.length > 10 ? ` 等共 ${items.length} 条` : ''}
                        </p>
                        <p style={{color: 'var(--art-warning)'}}>仅移除本机纳管记录，不会删除平台上的虚拟机。</p>
                    </div>
                ),
                okText: '确认清理',
                okType: 'danger',
                cancelText: '取消',
                mask: false,
                onOk: async () => {
                    try {
                        const result: any = await api.cleanupVMRecords(name, false)
                        if (result.code === 200) {
                            message.success(`已清理 ${result.data?.removed ?? 0} 条记录`)
                            loadHosts()
                        } else {
                            message.error(result.msg || '清理失败')
                        }
                    } catch (error) {
                        message.error('清理失败')
                    }
                }
            })
        } catch (error) {
            message.error('清理预览失败')
        }
    }

    // 合并 Proxmox 命名变体（"-"/"_"）造成的重复记录（仅本机记录，不删除平台虚拟机）
    const handleDedupeRecords = async (name: string) => {
        try {
            const preview = await api.dedupeVMRecords(name, true)
            if (preview.code !== 200) {
                message.error(preview.msg || '重复记录检查失败')
                return
            }
            const data: any = preview.data || {}
            const groups: any[] = data.groups || []
            if (!groups.length) {
                message.success('没有发现重复记录')
                return
            }
            const detail = groups
                .slice(0, 10)
                .map((g: any) => `${g.keep} ← ${(g.remove || []).join('、')}`)
                .join('；')
            Modal.confirm({
                title: '合并重复虚拟机记录',
                icon: <MergeCellsOutlined style={{color: 'var(--art-warning)'}}/>,
                content: (
                    <div>
                        <p>发现 <strong style={{color: 'var(--art-warning)'}}>{groups.length}</strong> 组重复记录（同一台虚拟机因 "-"/"_" 形式不同被重复纳管）：</p>
                        <p style={{color: 'var(--text-secondary)', wordBreak: 'break-all'}}>
                            {detail}{groups.length > 10 ? ` 等共 ${groups.length} 组` : ''}
                        </p>
                        <p style={{color: 'var(--art-warning)'}}>将保留数据更完整的一条并补齐缺失字段，仅移除本机记录，不会删除平台上的虚拟机。</p>
                    </div>
                ),
                okText: '确认合并',
                okType: 'danger',
                cancelText: '取消',
                mask: false,
                onOk: async () => {
                    try {
                        const result: any = await api.dedupeVMRecords(name, false)
                        if (result.code === 200) {
                            message.success(`已合并 ${result.data?.merged ?? 0} 组，移除 ${result.data?.removed ?? 0} 条多余记录`)
                            loadHosts()
                        } else {
                            message.error(result.msg || '合并失败')
                        }
                    } catch (error) {
                        message.error('合并失败')
                    }
                }
            })
        } catch (error) {
            message.error('重复记录检查失败')
        }
    }

    // 扫描备份
    const handleScanBackups = async (name: string) => {
        try {
            await api.scanBackups(name)
            message.success('备份扫描成功')
            loadHosts()
        } catch (error) {
            message.error('扫描失败')
        }
    }

    // 渲染主机卡片
    const renderHostCard = (name: string, host: Host) => {
        const status = hostsStatus[name]
        const typeInfo = engineTypes[host.type] || {}
        const isActive = host.status === 'active'
        const hostAddress = host.addr || host.config?.server_addr || '未配置'
        const serverPort = host.config?.server_port
        const connection = serverPort && serverPort > 0 ? `${hostAddress}:${serverPort}` : hostAddress
        const vmCount = host.vm_count || 0
        const vmLimit = host.config?.limits_nums || 0
        const portRange = host.config?.ports_start && host.config?.ports_close
            ? `${host.config.ports_start}–${host.config.ports_close}`
            : '未配置'
        const clampPercent = (value: number) => Math.max(0, Math.min(value, 100))
        const cpuPercent = status ? clampPercent(status.cpu_usage || 0) : 0
        const memPercent = status?.mem_total
            ? clampPercent((status.mem_usage || 0) / status.mem_total * 100)
            : 0
        const memUsageGB = ((status?.mem_usage || 0) / 1024).toFixed(1)
        const memTotalGB = ((status?.mem_total || 0) / 1024).toFixed(1)

        let diskPercent = 0
        let diskUsageGB = 0
        let diskTotalGB = 0
        if (status?.hdd_total && status.hdd_total > 0) {
            diskTotalGB = status.hdd_total / 1024
            diskUsageGB = (status.hdd_usage || 0) / 1024
            diskPercent = clampPercent((status.hdd_usage || 0) / status.hdd_total * 100)
        } else if (status?.ext_usage) {
            const firstDisk = Object.values(status.ext_usage)[0]
            if (firstDisk) {
                const [total, used] = firstDisk
                diskTotalGB = total / 1024
                diskUsageGB = used / 1024
                diskPercent = total > 0 ? clampPercent(used / total * 100) : 0
            }
        }

        const networkA = status?.network_a || 1000
        const maxBandwidth = Math.max(networkA * 1024 / 8, 1)
        const networkU = status?.network_u || 0
        const networkD = status?.network_d || 0
        const networkUPercent = clampPercent(networkU / maxBandwidth * 100)
        const networkDPercent = clampPercent(networkD / maxBandwidth * 100)
        const gpuPercent = status?.gpu_usage
            ? clampPercent(Object.values(status.gpu_usage).reduce((peak, usage) => Math.max(peak, usage || 0), 0))
            : 0
        const usageStroke = (pct: number) =>
            pct > 80 ? 'var(--art-danger)' : pct > 60 ? 'var(--art-warning)' : 'var(--main-color)'
        const metric = (label: string, value: React.ReactNode, detail: string, pct: number, title?: string) => (
            <div className="host-resource-metric" title={title}>
                <div className="host-resource-metric-label">{label}</div>
                <div className="host-resource-metric-value">{value}</div>
                <div className="host-resource-metric-detail">{detail}</div>
                <Progress
                    percent={clampPercent(pct)}
                    size="small"
                    showInfo={false}
                    strokeColor={usageStroke(pct)}
                    trailColor="var(--art-gray-200)"
                />
            </div>
        )

        return (
            <article
                className={`art-panel host-resource-card${isActive ? ' is-active' : ' is-disabled'}`}
                key={name}
                aria-label={`主机 ${name} 资源卡片`}
            >
                <header className="host-resource-head">
                    <div className="host-resource-identity">
                        <span className="host-resource-icon" aria-hidden="true">
                            <CloudServerOutlined />
                        </span>
                        <div className="host-resource-title-block">
                            <div className="host-resource-title-row">
                                <h3 className="host-resource-name" title={name}>{name}</h3>
                                <span className={`host-resource-status${isActive ? ' is-active' : ''}`}>
                                    <span className="host-resource-status-dot" aria-hidden="true" />
                                    {isActive ? '已启用' : '已禁用'}
                                </span>
                            </div>
                            <div className="host-resource-subtitle" title={typeInfo.description || host.type}>
                                <span>{typeInfo.description || host.type}</span>
                                <span className="host-resource-engine-type">{host.type}</span>
                            </div>
                        </div>
                    </div>
                    <div className="host-resource-primary-actions">
                        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(name)} disabled={!isActive}>
                            编辑配置
                        </Button>
                        <Button size="small" type="primary" icon={<CloudServerOutlined />} onClick={() => navigate(`/hosts/${name}/vms`)} disabled={!isActive}>
                            管理虚拟机
                        </Button>
                    </div>
                </header>

                <div className="host-resource-main">
                    <section className="host-resource-facts" aria-label="主机连接与配置信息">
                        <div className="host-resource-fact">
                            <span className="host-resource-fact-label">连接地址</span>
                            <span className="host-resource-fact-value is-mono" title={connection}>{connection}</span>
                        </div>
                        <div className="host-resource-fact">
                            <span className="host-resource-fact-label">虚拟机</span>
                            <span className="host-resource-fact-value">{vmCount} 台 <span className="host-resource-fact-muted">/ {vmLimit > 0 ? `${vmLimit} 台` : '不限'}</span></span>
                        </div>
                        <div className="host-resource-fact">
                            <span className="host-resource-fact-label">网络桥接</span>
                            <span className="host-resource-fact-value host-resource-bridges" title={`NAT ${host.config?.network_nat || '-'} / 公网 ${host.config?.network_pub || '-'}`}>
                                <span>NAT <b>{host.config?.network_nat || '-'}</b></span>
                                <span>公网 <b>{host.config?.network_pub || '-'}</b></span>
                            </span>
                        </div>
                        <div className="host-resource-fact">
                            <span className="host-resource-fact-label">端口配置</span>
                            <span className="host-resource-fact-value is-mono">TCP {portRange}</span>
                            <span className="host-resource-fact-hint">VNC {host.config?.remote_port || '未配置'}</span>
                        </div>
                    </section>

                    {(host.config?.filter_name || host.config?.server_area || host.config?.i_kuai_addr) && (
                        <div className="host-resource-meta" aria-label="主机补充信息">
                            {host.config?.filter_name && <span><b>前缀</b><code>{withFilterSuffix(host.config.filter_name)}</code></span>}
                            {host.config?.server_area && <span><b>区域</b><span>{host.config.server_area}</span></span>}
                            {host.config?.i_kuai_addr && <span><GlobalOutlined aria-hidden="true" /><b>爱快</b><span className="host-resource-meta-address" title={host.config.i_kuai_addr}>{host.config.i_kuai_addr}</span></span>}
                        </div>
                    )}

                    {host.config?.public_addr && host.config.public_addr.length > 0 && (
                        <div className="host-resource-addresses">
                            <span className="host-resource-address-label">公网地址</span>
                            <div className="host-resource-address-list">
                                {host.config.public_addr.map((ip, idx) => (
                                    <Tooltip title="点击复制" key={`${ip}-${idx}`}>
                                        <button type="button" className="host-resource-address" onClick={() => copyToClipboard(ip)}>
                                            {ip}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    )}

                    <section className="host-resource-telemetry" aria-label="主机资源使用情况">
                        <div className="host-resource-section-head">
                            <h4>资源使用</h4>
                            <span>{status ? '状态已获取' : isActive ? '等待状态数据' : '主机已禁用'}</span>
                        </div>
                        {status ? (
                            <div className="host-resource-metrics">
                                {metric('CPU', `${status.cpu_total || 0} 核`, `${cpuPercent.toFixed(1)}% 使用`, cpuPercent, status.cpu_model || 'CPU 型号未上报')}
                                {metric('内存', `${memUsageGB} / ${memTotalGB} GB`, `${memPercent.toFixed(1)}% 已用`, memPercent)}
                                {metric('磁盘', `${diskUsageGB.toFixed(1)} / ${diskTotalGB.toFixed(1)} GB`, `${diskPercent.toFixed(1)}% 已用`, diskPercent)}
                                {metric(
                                    '网络吞吐',
                                    <span className="host-resource-network-value">
                                        <span><b>↑</b> {(networkU / 1024).toFixed(1)}</span>
                                        <span><b>↓</b> {(networkD / 1024).toFixed(1)}</span>
                                    </span>,
                                    `MB/s · ${networkA >= 1000 ? `${(networkA / 1000).toFixed(1)} Gbps` : `${networkA} Mbps`}`,
                                    Math.max(networkUPercent, networkDPercent),
                                )}
                                {metric('显卡', `${status.gpu_total || 0} 张`, `${gpuPercent.toFixed(1)}% 最高使用`, gpuPercent)}
                            </div>
                        ) : (
                            <div className="host-resource-empty" role="status">
                                <span className="host-resource-empty-mark" aria-hidden="true">—</span>
                                <span>{isActive ? '暂未获取到资源状态，请检查主机连接或稍后刷新。' : '主机已禁用，启用后将显示资源状态。'}</span>
                            </div>
                        )}
                    </section>
                </div>

                <footer className="host-resource-footer">
                    <span className="host-resource-footer-label">运维操作</span>
                    <div className="host-resource-maintenance-actions">
                        <Button size="small" icon={<CloudSyncOutlined />} onClick={() => handleScanBackups(name)} disabled={!isActive}>
                            扫描备份
                        </Button>
                        <Button size="small" icon={<ScanOutlined />} onClick={() => handleScanVMs(name)} disabled={!isActive}>
                            扫描虚拟机
                        </Button>
                        <Tooltip title="仅移除不匹配前缀的纳管记录，不删除平台虚拟机">
                            <Button size="small" icon={<ClearOutlined />} onClick={() => handleCleanupRecords(name)}>
                                清理记录
                            </Button>
                        </Tooltip>
                        <Tooltip title="合并因 -/_ 命名差异重复的纳管记录，仅移除本机记录">
                            <Button size="small" icon={<MergeCellsOutlined />} onClick={() => handleDedupeRecords(name)}>
                                合并重复
                            </Button>
                        </Tooltip>
                    </div>
                    <div className="host-resource-lifecycle-actions">
                        <Button size="small" icon={isActive ? <StopOutlined /> : <PlayCircleOutlined />} onClick={() => handleToggle(name, !isActive)}>
                            {isActive ? '禁用主机' : '启用主机'}
                        </Button>
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => {
                                Modal.confirm({
                                    title: '确认删除',
                                    content: `确定要删除主机 "${name}" 吗？此操作不可恢复。`,
                                    okText: '确认删除',
                                    okType: 'danger',
                                    cancelText: '取消',
                                    mask: false,
                                    onOk: () => handleDelete(name)
                                })
                            }}
                        >
                            删除主机
                        </Button>
                    </div>
                </footer>
            </article>
        )
    }

    return (
        <div className="art-stack host-manage-page">
            {/* 页面标题 */}
            <PageHeader
                icon={<CloudServerOutlined />}
                title="物理主机管理"
                subtitle="查看主机运行状态、资源用量及纳管配置"
                actions={
                    <Space wrap className="host-manage-header-actions">
                        <Button icon={<ReloadOutlined />} onClick={loadHosts} loading={loading}>刷新</Button>
                        <HostConfigBackupActions hostNames={Object.keys(hosts)} onRestored={loadHosts} />
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加主机</Button>
                    </Space>
                }
            />

            <section className="art-list-toolbar host-manage-toolbar" aria-label="主机筛选与列表操作">
                <div className="art-list-toolbar-filters">
                    <Input
                        className="art-list-search host-manage-search"
                        prefix={<SearchOutlined />}
                        placeholder="搜索主机名、类型或连接地址"
                        value={hostSearch}
                        onChange={event => setHostSearch(event.target.value)}
                        allowClear
                    />
                </div>
                <div className="art-list-toolbar-actions">
                    <span className="art-list-result-count" aria-live="polite">
                        显示 <strong>{Object.keys(filteredHosts).length}</strong> / {Object.keys(hosts).length} 台
                    </span>
                    <Segmented
                        aria-label="主机显示方式"
                        size="small"
                        value={viewMode}
                        onChange={value => {
                            const nextMode = value as 'card' | 'table'
                            setViewMode(nextMode)
                            localStorage.setItem('hostManage_viewMode', nextMode)
                        }}
                        options={[
                            { value: 'card', icon: <AppstoreOutlined />, label: '卡片' },
                            { value: 'table', icon: <UnorderedListOutlined />, label: '列表' },
                        ]}
                    />
                </div>
            </section>

            <section className="art-list-results host-manage-results" aria-label="主机列表">
                <header className="art-list-results-head">
                    <div>
                        <h2>{viewMode === 'card' ? '主机概览' : '主机清单'}</h2>
                        <span>管理主机资源与运行状态</span>
                    </div>
                </header>
                {loading ? (
                    <div className="art-loading">
                        <Spin size="large" />
                        <span>正在加载主机列表…</span>
                    </div>
                ) : Object.keys(hosts).length === 0 ? (
                    <EmptyState
                        icon={<CloudServerOutlined />}
                        title="暂无主机"
                        description="还没有纳管任何虚拟化主机。添加主机后即可在此查看资源占用并管理其实例。"
                        actions={<Button type="primary" onClick={handleAdd}>添加第一个主机</Button>}
                    />
                ) : Object.keys(filteredHosts).length === 0 ? (
                    <EmptyState icon={<SearchOutlined />} title="没有符合条件的主机" description="调整关键词，或清除搜索后重试。" />
                ) : viewMode === 'card' ? (
                    <div className="host-resource-grid">
                        {Object.entries(filteredHosts).map(([name, host]) => (
                            <div key={name}>{renderHostCard(name, host)}</div>
                        ))}
                    </div>
                ) : (
                    <div className="art-table-panel host-manage-table">
                        <div className="art-panel-body is-flush">
                            <HostTableView
                                hosts={filteredHosts}
                                hostsStatus={hostsStatus}
                                engineTypes={engineTypes}
                                navigate={navigate}
                                handleEdit={handleEdit}
                                handleToggle={handleToggle}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* 添加/编辑主机对话框 */}
            <Modal
                title={editMode === 'add' ? '添加主机' : '编辑主机'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width="min(920px, calc(100vw - 32px))"
                rootClassName="host-config-modal"
                okText="保存"
                cancelText="取消"
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Tabs
                        items={[
                            {
                                key: 'basic',
                                label: <span><SettingOutlined/> 基本配置</span>,
                                children: (
                                    <div className="host-config-tab-panel max-h-[min(65dvh,600px)] overflow-y-auto pr-2">
                                        <Row gutter={16}>
                                            <Col span={6}>
                                                <Form.Item name="name" label="服务器名称"
                                                           rules={[{required: true, message: '请输入服务器名称'}]}>
                                                    <Input placeholder="例如: host1" disabled={editMode === 'edit'}/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item name="type" label="服务器类型"
                                                           rules={[{required: true, message: '请选择服务器类型'}]}>
                                                    <Select
                                                        placeholder="请选择类型"
                                                        onChange={(value) => setSelectedHostType(value)}
                                                    >
                                                        {Object.entries(engineTypes).map(([type, config]) =>
                                                            config.enabled ? (
                                                                <Select.Option key={type} value={type}>
                                                                    {config.description} ({type})
                                                                </Select.Option>
                                                            ) : null
                                                        )}
                                                    </Select>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item name="server_addr" label="服务器地址">
                                                    <Input placeholder="例如: localhost:8697"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item name="server_user" label="服务器用户">
                                                    <Input placeholder="例如: root"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        {/* 主机类型信息提示 */}
                                        {selectedHostType && engineTypes[selectedHostType] && (
                                            <div className="mb-4">
                                                {engineTypes[selectedHostType].messages && engineTypes[selectedHostType].messages!.length > 0 && (
                                                    <div
                                                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                                        <h5 className="text-sm font-medium text-yellow-800 mb-2">注意事项</h5>
                                                        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                                                            {engineTypes[selectedHostType].messages!.map((msg, idx) => (
                                                                <li key={idx}>{msg}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {engineTypes[selectedHostType].options && Object.keys(engineTypes[selectedHostType].options!).length > 0 && (
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                        <h5 className="text-sm font-medium text-blue-800 mb-2">可选配置项</h5>
                                                        <div className="text-sm text-blue-700 space-y-1">
                                                            {Object.entries(engineTypes[selectedHostType].options!).map(([key, desc]) => (
                                                                <div key={key}>
                                                                    <strong>{key}:</strong> {desc}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <Row gutter={16}>
                                            <Col span={6}>
                                                <Form.Item name="server_pass" label="服务器密码">
                                                    <Input.Password placeholder="服务器密码"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item name="filter_name" label="虚拟机前缀"
                                                           extra="末尾的 “-” 由系统自动补全"
                                                           normalize={(value?: string) => (value || '').replace(/-+$/, '')}>
                                                    <Input placeholder="例如: web" addonAfter="-"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item name="server_port" label="服务访问端口">
                                                    <InputNumber placeholder="例如: 443" min={0} max={65535}
                                                                 className="w-full"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item name="public_addr" label="服务器公网IP">
                                                    <Input placeholder="例如: 192.168.1.1, 2001:db8::1"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={6}>
                                                <Form.Item name="limits_nums" label="虚拟机数量限制">
                                                    <InputNumber placeholder="例如: 100" min={0} className="w-full"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="proxy_mode" label="反向代理模式" initialValue="direct"
                                                             extra="直连：主控与虚拟机平台同一设备；中转：经爱快公网地址转发">
                                                    <Select options={[
                                                        {label: '直连虚拟机', value: 'direct'},
                                                        {label: '经爱快中转', value: 'relay'},
                                                    ]}/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="relay_addr" label="中转地址"
                                                           extra="中转模式下使用，留空则取服务器公网IP">
                                                    <Input placeholder="例如: 1.2.3.4"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="vnc_ip" label="VNC 反代IP"
                                                           extra="VNC 经反向代理时的目标地址，留空使用平台地址">
                                                    <Input placeholder="例如: vnc.example.com"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="vnc_wan" label="VNC 外网地址"
                                                           extra="填写后用户拿到的是该地址，可含端口">
                                                    <Input placeholder="例如: vnc.example.com:6080"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="network_nat" label="共享IP设备名">
                                                    <Input placeholder="例如: nat"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="network_pub" label="独立IP设备名">
                                                    <Input placeholder="例如: pub"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={8}>
                                                <Form.Item name="area_code" label="区域代码" extra="例如：CN、US、HK">
                                                    <Input placeholder="例如: CN"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={16}>
                                                <Form.Item name="area_name" label="区域名称" extra="例如：成都、华南区">
                                                    <Input placeholder="例如: 成都"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </div>
                                )
                            },
                            {
                                key: 'storage',
                                label: <span><FolderOutlined/> 存储路径</span>,
                                children: (
                                    <div className="host-config-tab-panel max-h-[min(65dvh,600px)] overflow-y-auto pr-2">
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="images_path" label="模板存储路径">
                                                    <Input placeholder="例如: /data/images"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="dvdrom_path" label="光盘存储路径">
                                                    <Input placeholder="例如: /data/iso"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="system_path" label="系统存储路径">
                                                    <Input placeholder="例如: /data/system"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="backup_path" label="备份存储路径">
                                                    <Input placeholder="例如: /data/backup"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="extern_path" label="数据存储路径">
                                                    <Input placeholder="例如: /data/extern"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="launch_path" label="程序启动路径">
                                                    <Input placeholder="虚拟化程序路径"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </div>
                                )
                            },
                            {
                                key: 'network',
                                label: <span><GlobalOutlined/> 网络配置</span>,
                                children: (
                                    <div className="host-config-tab-panel max-h-[min(65dvh,600px)] overflow-y-auto pr-2">
                                        <h4 className="font-medium mb-3">爱快OS配置</h4>
                                        <Row gutter={16}>
                                            <Col span={6}>
                                                <Form.Item name="i_kuai_addr" label="爱快OS地址">
                                                    <Input placeholder="例如: http://192.168.1.1"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item name="i_kuai_user" label="爱快OS用户名">
                                                    <Input placeholder="爱快OS管理员用户名"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item name="i_kuai_pass" label="爱快OS密码">
                                                    <Input.Password placeholder="爱快OS管理员密码"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item
                                                    name="i_kuai_token"
                                                    label="爱快 API Token"
                                                    tooltip="爱快 4.0 及以上已下线账号密码登录，必须填写：设备设置 → 登录管理 → 个人 API 令牌。3.x 可留空。"
                                                >
                                                    <Input placeholder="4.0+ 必填，3.x 可留空"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <h4 className="font-medium mb-3 mt-4">端口配置</h4>
                                        <Row gutter={16}>
                                            <Col span={8}>
                                                <Form.Item name="ports_start" label="TCP端口起始">
                                                    <InputNumber placeholder="例如: 10000" min={0} max={65535}
                                                                 className="w-full"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={8}>
                                                <Form.Item name="ports_close" label="TCP端口结束">
                                                    <InputNumber placeholder="例如: 20000" min={0} max={65535}
                                                                 className="w-full"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={8}>
                                                <Form.Item name="remote_port" label="VNC服务端口">
                                                    <InputNumber placeholder="例如: 5900" min={0} max={65535}
                                                                 className="w-full"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <h4 className="font-medium mb-3 mt-4">DNS服务器配置</h4>
                                        <Form.Item name="ipaddr_ddns" label="DNS服务器（多个用逗号分隔）">
                                            <Input placeholder="例如: 8.8.8.8, 8.8.4.4"/>
                                        </Form.Item>
                                    </div>
                                )
                            },
                            {
                                key: 'advanced',
                                label: <span><DatabaseOutlined/> 高级配置</span>,
                                children: (
                                    <div className="host-config-tab-panel max-h-[min(65dvh,600px)] overflow-y-auto pr-2">
                                        <h4 className="font-medium mb-3">售价配置</h4>
                                        <Row gutter={8} className="mb-4">
                                            <Col span={6}>
                                                <div className="text-xs text-gray-500 mb-1">处理器核心单价</div>
                                                <Form.Item name="n_cpu_price" noStyle>
                                                    <InputNumber min={0} step={0.01} className="w-full" placeholder="0.00"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <div className="text-xs text-gray-500 mb-1">虚拟机内存单价</div>
                                                <Form.Item name="n_mem_price" noStyle>
                                                    <InputNumber min={0} step={0.01} className="w-full" placeholder="0.00"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <div className="text-xs text-gray-500 mb-1">虚拟机硬盘单价</div>
                                                <Form.Item name="n_hdd_price" noStyle>
                                                    <InputNumber min={0} step={0.01} className="w-full" placeholder="0.00"/>
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <div className="text-xs text-gray-500 mb-1">虚拟机带宽单价</div>
                                                <Form.Item name="n_net_price" noStyle>
                                                    <InputNumber min={0} step={0.01} className="w-full" placeholder="0.00"/>
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <h4 className="font-medium mb-3">系统镜像配置</h4>
                                        <div className="space-y-2 mb-4">
                                            {systemMaps.map((row, index) => (
                                                <div key={row.id} className="p-3 rounded-lg">
                                                    <Row gutter={8}>
                                                        <Col span={6}>
                                                            <Input
                                                                placeholder="系统名称"
                                                                value={row.sys_name}
                                                                onChange={(e) => {
                                                                    const newMaps = [...systemMaps]
                                                                    newMaps[index].sys_name = e.target.value
                                                                    setSystemMaps(newMaps)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={8}>
                                                            <Input
                                                                placeholder="镜像文件"
                                                                value={row.sys_file}
                                                                onChange={(e) => {
                                                                    const newMaps = [...systemMaps]
                                                                    newMaps[index].sys_file = e.target.value
                                                                    setSystemMaps(newMaps)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={2}>
                                                            <Input
                                                                placeholder="最低大小(GB)"
                                                                value={row.sys_size}
                                                                onChange={(e) => {
                                                                    const newMaps = [...systemMaps]
                                                                    newMaps[index].sys_size = e.target.value
                                                                    setSystemMaps(newMaps)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={3}>
                                                            <Select
                                                                placeholder="类型"
                                                                value={row.sys_type || undefined}
                                                                onChange={(value) => {
                                                                    const newMaps = [...systemMaps]
                                                                    newMaps[index].sys_type = value
                                                                    setSystemMaps(newMaps)
                                                                }}
                                                                style={{width: '100%'}}
                                                                allowClear
                                                            >
                                                                <Select.Option value="WinNT">WinNT</Select.Option>
                                                                <Select.Option value="Linux">Linux</Select.Option>
                                                                <Select.Option value="macOS">macOS</Select.Option>
                                                            </Select>
                                                        </Col>
                                                        <Col span={3}>
                                                            <Select
                                                                value={row.sys_flag ? 1 : 0}
                                                                onChange={(value) => {
                                                                    const newMaps = [...systemMaps]
                                                                    newMaps[index].sys_flag = value === 1
                                                                    setSystemMaps(newMaps)
                                                                }}
                                                                style={{width: '100%'}}
                                                            >
                                                                <Select.Option value={1}>启用</Select.Option>
                                                                <Select.Option value={0}>禁用</Select.Option>
                                                            </Select>
                                                        </Col>
                                                        <Col span={2}>
                                                            <Button
                                                                danger
                                                                icon={<DeleteOutlined/>}
                                                                onClick={() => setSystemMaps(systemMaps.filter(m => m.id !== row.id))}
                                                            />
                                                        </Col>
                                                    </Row>
                                                </div>
                                            ))}
                                            <Button
                                                type="dashed"
                                                icon={<PlusOutlined/>}
                                                onClick={() => setSystemMaps([...systemMaps, {
                                                    id: Date.now().toString(),
                                                    sys_name: '',
                                                    sys_file: '',
                                                    sys_size: '',
                                                    sys_type: '',
                                                    sys_flag: true
                                                }])}
                                                block
                                            >
                                                添加系统镜像
                                            </Button>
                                        </div>

                                        <h4 className="font-medium mb-3 mt-4">光盘镜像配置</h4>
                                        <div className="space-y-2 mb-4">
                                            {imageMaps.map((row, index) => (
                                                <div key={row.id} className="p-3 rounded-lg">
                                                    <Row gutter={8}>
                                                        <Col span={6}>
                                                            <Input
                                                                placeholder="显示名称"
                                                                value={row.sys_name}
                                                                onChange={(e) => {
                                                                    const newMaps = [...imageMaps]
                                                                    newMaps[index].sys_name = e.target.value
                                                                    setImageMaps(newMaps)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={8}>
                                                            <Input
                                                                placeholder="ISO文件名"
                                                                value={row.sys_file}
                                                                onChange={(e) => {
                                                                    const newMaps = [...imageMaps]
                                                                    newMaps[index].sys_file = e.target.value
                                                                    setImageMaps(newMaps)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={2}>
                                                            <Input
                                                                placeholder="最低大小(GB)"
                                                                value={row.sys_size}
                                                                onChange={(e) => {
                                                                    const newMaps = [...imageMaps]
                                                                    newMaps[index].sys_size = e.target.value
                                                                    setImageMaps(newMaps)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={3}>
                                                            <Select
                                                                placeholder="类型"
                                                                value={row.sys_type || undefined}
                                                                onChange={(value) => {
                                                                    const newMaps = [...imageMaps]
                                                                    newMaps[index].sys_type = value
                                                                    setImageMaps(newMaps)
                                                                }}
                                                                style={{width: '100%'}}
                                                                allowClear
                                                            >
                                                                <Select.Option value="WinNT">WinNT</Select.Option>
                                                                <Select.Option value="Linux">Linux</Select.Option>
                                                                <Select.Option value="macOS">macOS</Select.Option>
                                                            </Select>
                                                        </Col>
                                                        <Col span={3}>
                                                            <Select
                                                                value={row.sys_flag ? 1 : 0}
                                                                onChange={(value) => {
                                                                    const newMaps = [...imageMaps]
                                                                    newMaps[index].sys_flag = value === 1
                                                                    setImageMaps(newMaps)
                                                                }}
                                                                style={{width: '100%'}}
                                                            >
                                                                <Select.Option value={1}>启用</Select.Option>
                                                                <Select.Option value={0}>禁用</Select.Option>
                                                            </Select>
                                                        </Col>
                                                        <Col span={2}>
                                                            <Button
                                                                danger
                                                                icon={<DeleteOutlined/>}
                                                                onClick={() => setImageMaps(imageMaps.filter(m => m.id !== row.id))}
                                                            />
                                                        </Col>
                                                    </Row>
                                                </div>
                                            ))}
                                            <Button
                                                type="dashed"
                                                icon={<PlusOutlined/>}
                                                onClick={() => setImageMaps([...imageMaps, {
                                                    id: Date.now().toString(),
                                                    sys_name: '',
                                                    sys_file: '',
                                                    sys_size: '',
                                                    sys_type: '',
                                                    sys_flag: true
                                                }])}
                                                block
                                            >
                                                添加光盘镜像
                                            </Button>
                                        </div>

                                        <h4 className="font-medium mb-3 mt-4">IP地址池配置</h4>
                                        <div className="space-y-2 mb-4">
                                            {ipaddrMaps.map((row, index) => (
                                                <div key={row.id} className="p-3 rounded-lg">
                                                    <Row gutter={8} className="mb-2">
                                                        <Col span={6}>
                                                            <Input
                                                                placeholder="配置名称"
                                                                value={row.setName}
                                                                onChange={(e) => {
                                                                    const newMaps = [...ipaddrMaps]
                                                                    newMaps[index].setName = e.target.value
                                                                    setIpaddrMaps(newMaps)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={4}>
                                                            <Select
                                                                value={row.vers}
                                                                onChange={(value) => {
                                                                    const newMaps = [...ipaddrMaps]
                                                                    newMaps[index].vers = value
                                                                    setIpaddrMaps(newMaps)
                                                                }}
                                                                className="w-full"
                                                            >
                                                                <Select.Option value="ipv4">IPv4</Select.Option>
                                                                <Select.Option value="ipv6">IPv6</Select.Option>
                                                            </Select>
                                                        </Col>
                                                        <Col span={4}>
                                                            <Select
                                                                value={row.type}
                                                                onChange={(value) => {
                                                                    const newMaps = [...ipaddrMaps]
                                                                    newMaps[index].type = value
                                                                    setIpaddrMaps(newMaps)
                                                                }}
                                                                className="w-full"
                                                            >
                                                                <Select.Option value="nat">NAT</Select.Option>
                                                                <Select.Option value="pub">PUB</Select.Option>
                                                            </Select>
                                                        </Col>
                                                        <Col span={8}>
                                                            <InputNumber
                                                                placeholder="数量"
                                                                value={row.nums}
                                                                onChange={(value) => {
                                                                    const newMaps = [...ipaddrMaps]
                                                                    newMaps[index].nums = value || 0
                                                                    setIpaddrMaps(newMaps)
                                                                }}
                                                                min={1}
                                                                className="w-full"
                                                            />
                                                        </Col>
                                                        <Col span={2}>
                                                            <Button
                                                                danger
                                                                icon={<DeleteOutlined/>}
                                                                onClick={() => setIpaddrMaps(ipaddrMaps.filter(m => m.id !== row.id))}
                                                            />
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={8}>
                                                        <Col span={8}>
                                                            <Input
                                                                placeholder="起始IP地址"
                                                                value={row.fromIp}
                                                                onChange={(e) => {
                                                                    const newMaps = [...ipaddrMaps]
                                                                    newMaps[index].fromIp = e.target.value
                                                                    setIpaddrMaps(newMaps)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={8}>
                                                            <Input
                                                                placeholder="网关地址"
                                                                value={row.gate}
                                                                onChange={(e) => {
                                                                    const newMaps = [...ipaddrMaps]
                                                                    newMaps[index].gate = e.target.value
                                                                    setIpaddrMaps(newMaps)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={8}>
                                                            <Input
                                                                placeholder="子网掩码"
                                                                value={row.mask}
                                                                onChange={(e) => {
                                                                    const newMaps = [...ipaddrMaps]
                                                                    newMaps[index].mask = e.target.value
                                                                    setIpaddrMaps(newMaps)
                                                                }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                </div>
                                            ))}
                                            <Button
                                                type="dashed"
                                                icon={<PlusOutlined/>}
                                                onClick={() => setIpaddrMaps([...ipaddrMaps, {
                                                    id: Date.now().toString(),
                                                    setName: '',
                                                    vers: 'ipv4',
                                                    type: 'nat',
                                                    gate: '',
                                                    mask: '',
                                                    fromIp: '',
                                                    nums: 0
                                                }])}
                                                block
                                            >
                                                添加IP地址池
                                            </Button>
                                        </div>

                                        <h4 className="font-medium mb-3 mt-4">API扩展选项</h4>
                                        <Form.Item name="extend_data" label="扩展数据 (JSON格式)">
                                            <Input.TextArea rows={4} placeholder='{"key": "value"}'/>
                                        </Form.Item>
                                    </div>
                                )
                            },
                            {
                                key: 'plan',
                                label: <span><DatabaseOutlined/> 套餐配置</span>,
                                children: (
                                    <div className="host-config-tab-panel max-h-[min(65dvh,600px)] overflow-y-auto pr-2">
                                        <h4 className="font-medium mb-3">套餐列表（套餐名称 → 虚拟机资源配置）</h4>
                                        <div className="space-y-3 mb-4">
                                            {serverPlans.map((row, index) => (
                                                <div key={row.id} className="border border-gray-200 rounded-lg p-3">
                                                    <Row gutter={8} className="mb-2">
                                                        <Col span={22}>
                                                            <Input
                                                                placeholder="套餐名称（例如：基础套餐）"
                                                                value={row.planName}
                                                                onChange={(e) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].planName = e.target.value
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={2}>
                                                            <Button
                                                                danger
                                                                icon={<DeleteOutlined/>}
                                                                onClick={() => setServerPlans(serverPlans.filter(p => p.id !== row.id))}
                                                            />
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={8}>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">CPU核心数</div>
                                                            <InputNumber
                                                                value={row.cpu_num}
                                                                min={1}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].cpu_num = v ?? 2
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">内存(MB)</div>
                                                            <InputNumber
                                                                value={row.mem_num}
                                                                min={512}
                                                                step={512}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].mem_num = v ?? 2048
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">硬盘(MB)</div>
                                                            <InputNumber
                                                                value={row.hdd_num}
                                                                min={1024}
                                                                step={1024}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].hdd_num = v ?? 8192
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">流量(MB)</div>
                                                            <InputNumber
                                                                value={row.flu_num}
                                                                min={0}
                                                                step={1024}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].flu_num = v ?? 102400
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={8} className="mt-2">
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">上行带宽(Mbps)</div>
                                                            <InputNumber
                                                                value={row.speed_u}
                                                                min={1}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].speed_u = v ?? 100
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">下行带宽(Mbps)</div>
                                                            <InputNumber
                                                                value={row.speed_d}
                                                                min={1}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].speed_d = v ?? 100
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">NAT端口数</div>
                                                            <InputNumber
                                                                value={row.nat_num}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].nat_num = v ?? 100
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">代理数量</div>
                                                            <InputNumber
                                                                value={row.web_num}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].web_num = v ?? 100
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={8} className="mt-2">
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">CPU可用比例(%)</div>
                                                            <InputNumber
                                                                value={row.cpu_per}
                                                                min={0}
                                                                max={100}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].cpu_per = v ?? 0
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">虚拟显存(MB)</div>
                                                            <InputNumber
                                                                value={row.gpu_mem}
                                                                min={0}
                                                                step={128}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].gpu_mem = v ?? 0
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">硬盘IOPS</div>
                                                            <InputNumber
                                                                value={row.hdd_iop}
                                                                min={0}
                                                                step={100}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].hdd_iop = v ?? 1000
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">备份数量</div>
                                                            <InputNumber
                                                                value={row.bak_num}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].bak_num = v ?? 1
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={8} className="mt-2">
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">光盘数量</div>
                                                            <InputNumber
                                                                value={row.iso_num}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].iso_num = v ?? 1
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">PCIe数量</div>
                                                            <InputNumber
                                                                value={row.pci_num}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].pci_num = v ?? 0
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">USB数量</div>
                                                            <InputNumber
                                                                value={row.usb_num}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].usb_num = v ?? 0
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">数据盘数量</div>
                                                            <InputNumber
                                                                value={row.dat_num}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].dat_num = v ?? 1
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={8} className="mt-2">
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">数据盘总容量(MB)</div>
                                                            <InputNumber
                                                                value={row.dat_all}
                                                                min={0}
                                                                step={1024}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].dat_all = v ?? 0
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">流量重置(天)</div>
                                                            <InputNumber
                                                                value={row.flu_rst?.[0] ?? 31}
                                                                min={1}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    const cur = Array.isArray(newPlans[index].flu_rst) ? [...newPlans[index].flu_rst] : [31, 10, 10]
                                                                    cur[0] = v ?? 31
                                                                    newPlans[index].flu_rst = [cur[0], cur[1] ?? 10, cur[2] ?? 10]
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">超限阈值(MB)</div>
                                                            <InputNumber
                                                                value={row.flu_rst?.[1] ?? 10}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    const cur = Array.isArray(newPlans[index].flu_rst) ? [...newPlans[index].flu_rst] : [31, 10, 10]
                                                                    cur[1] = v ?? 10
                                                                    newPlans[index].flu_rst = [cur[0] ?? 31, cur[1], cur[2] ?? 10]
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">上次重置时间戳</div>
                                                            <InputNumber
                                                                value={row.flu_rst?.[2] ?? 10}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    const cur = Array.isArray(newPlans[index].flu_rst) ? [...newPlans[index].flu_rst] : [31, 10, 10]
                                                                    cur[2] = v ?? 10
                                                                    newPlans[index].flu_rst = [cur[0] ?? 31, cur[1] ?? 10, cur[2]]
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={8} className="mt-2">
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">公网网卡数量</div>
                                                            <InputNumber
                                                                value={row.nic_pub}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].nic_pub = v ?? 0
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">内网网卡数量</div>
                                                            <InputNumber
                                                                value={row.nic_pri}
                                                                min={0}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].nic_pri = v ?? 1
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">IPv4最大数量</div>
                                                            <InputNumber
                                                                value={row.ip4_max}
                                                                min={0}
                                                                max={(row.nic_pub || 0) + (row.nic_pri || 0)}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].ip4_max = v ?? 1
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={6}>
                                                            <div className="text-xs text-gray-500 mb-1">IPv6最大数量</div>
                                                            <InputNumber
                                                                value={row.ip6_max}
                                                                min={0}
                                                                max={(row.nic_pub || 0) + (row.nic_pri || 0)}
                                                                className="w-full"
                                                                onChange={(v) => {
                                                                    const newPlans = [...serverPlans]
                                                                    newPlans[index].ip6_max = v ?? 0
                                                                    setServerPlans(newPlans)
                                                                }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                </div>
                                            ))}
                                            <Button
                                                type="dashed"
                                                icon={<PlusOutlined/>}
                                                onClick={() => setServerPlans([...serverPlans, {
                                                    id: Date.now().toString(),
                                                    planName: '',
                                                    cpu_num: 2,
                                                    cpu_per: 0,
                                                    gpu_mem: 0,
                                                    mem_num: 2048,
                                                    hdd_num: 8192,
                                                    hdd_iop: 1000,
                                                    bak_num: 1,
                                                    iso_num: 1,
                                                    pci_num: 0,
                                                    usb_num: 0,
                                                    dat_num: 1,
                                                    dat_all: 0,
                                                    speed_u: 100,
                                                    speed_d: 100,
                                                    nat_num: 100,
                                                    web_num: 100,
                                                    flu_num: 102400,
                                                    flu_rst: [31, 10, 10],
                                                    nic_pub: 0,
                                                    nic_pri: 1,
                                                    ip4_max: 1,
                                                    ip6_max: 0,
                                                }])}
                                                block
                                            >
                                                添加套餐
                                            </Button>
                                        </div>
                                    </div>
                                )
                            }
                        ]}
                    />
                </Form>
            </Modal>
        </div>
    )
}

export default HostManage