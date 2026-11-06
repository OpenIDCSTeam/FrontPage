import React from 'react'
import { Card, Tag, Tooltip, Button, Progress } from 'antd'
import {
    DesktopOutlined,
    PoweroffOutlined,
    EditOutlined,
    DeleteOutlined,
    GlobalOutlined,
    EyeOutlined,
    DatabaseOutlined,
    ThunderboltOutlined,
    CloudServerOutlined,
    ApiOutlined,
    PlayCircleOutlined,
    QuestionCircleOutlined,
    LoadingOutlined,
    PauseCircleOutlined,
    UserOutlined,
} from '@ant-design/icons'
import { VM_STATUS_MAP } from '@/constants/status'
import { VM_PERMISSION, hasPermission } from '@/types'

interface DockCardProps {
    uuid: string
    vm: any // Using any for VM type for now to avoid duplicating interfaces
    hostName?: string
    hostDisabled?: boolean // 主机是否被禁用
    userPermissions?: number // 当前用户对此虚拟机的权限掩码
    canModify?: boolean // 用户级别是否允许修改虚拟机
    canDelete?: boolean // 用户级别是否允许删除虚拟机
    style?: React.CSSProperties
    onEdit: (uuid: string) => void
    onDelete: (uuid: string) => void
    onPower: (uuid: string) => void
    onVnc: (uuid: string) => void
    onDetail: (uuid: string) => void
}

const formatMemory = (mb?: number): string => {
    if (!mb) return '0 MB'
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb} MB`
}

const formatDisk = (mb?: number): string => {
    if (!mb) return '0 MB'
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb} MB`
}

/** 资源指标：标签、用量与统一强调色进度条 */
const Metric: React.FC<{ name: string; value: string; percent: number }> = ({
    name,
    value,
    percent,
}) => (
    <div className="vm-resource-metric">
        <span className="vm-resource-metric-name">{name}</span>
        <span className="vm-resource-metric-value">{value}</span>
        <Progress
            percent={Math.max(0, Math.min(100, percent))}
            size="small"
            strokeWidth={5}
            strokeColor="var(--main-color)"
            trailColor="var(--art-gray-200)"
            showInfo={false}
        />
    </div>
)

const DockCard: React.FC<DockCardProps> = ({
    uuid,
    vm,
    hostName,
    hostDisabled = false,
    userPermissions = VM_PERMISSION.FULL_MASK,
    canModify = true,
    canDelete = true,
    style,
    onEdit,
    onDelete,
    onPower,
    onVnc,
    onDetail
}) => {
    const config = vm.config || {}
    const statusList = vm.status || []
    const firstStatus = statusList.length > 0 ? statusList[0] : { ac_status: 'UNKNOWN' }
    const powerStatus = firstStatus.ac_status || 'UNKNOWN'
    const statusInfo = VM_STATUS_MAP[powerStatus] || VM_STATUS_MAP.UNKNOWN

    const nicAll = config.nic_all || {}
    const firstNic = (Object.values(nicAll)[0] || {}) as { ip4_addr?: string; ip6_addr?: string; mac_addr?: string }
    const ipv4 = firstNic.ip4_addr || '-'
    const ipv6 = firstNic.ip6_addr || '-'
    const macAddr = firstNic.mac_addr || '-'

    const isRunning = powerStatus === 'STARTED'

    // 从status中获取实际资源使用率
    const cpuTotal = firstStatus.cpu_total || config.cpu_num || 0
    const cpuUsage = firstStatus.cpu_usage || 0
    const cpuPercent = cpuTotal > 0 ? Math.round((cpuUsage / cpuTotal) * 100) : 0

    const memTotal = firstStatus.mem_total || config.mem_num || 0
    const memUsage = firstStatus.mem_usage || 0
    const memPercent = memTotal > 0 ? Math.round((memUsage / memTotal) * 100) : 0

    const hddTotal = firstStatus.hdd_total || config.hdd_num || 0
    const hddUsage = firstStatus.hdd_usage || 0
    const diskUsage = hddTotal > 0 ? Math.round((hddUsage / hddTotal) * 100) : 0

    // GPU使用率（如果有的话）
    const gpuTotal = firstStatus.gpu_total || 0
    const gpuUsageObj = firstStatus.gpu_usage || {}
    const gpuUsageValue = Object.values(gpuUsageObj)[0] || 0
    const gpuPercent = gpuTotal > 0 ? Math.round((Number(gpuUsageValue) / gpuTotal) * 100) : 0

    // 根据电源状态获取图标和颜色
    const getStatusIcon = () => {
        switch (powerStatus) {
            case 'STARTED':
                return <PlayCircleOutlined className="vm-resource-status-icon is-running" />
            case 'STOPPED':
                return <PoweroffOutlined className="vm-resource-status-icon is-stopped" />
            case 'PAUSED':
                return <PauseCircleOutlined className="vm-resource-status-icon is-paused" />
            case 'STARTING':
            case 'STOPPING':
            case 'PAUSING':
            case 'RESUMING':
                return <LoadingOutlined className="vm-resource-status-icon is-pending" spin />
            default:
                return <QuestionCircleOutlined className="vm-resource-status-icon" />
        }
    }

    return (
        <Card
            hoverable
            className="vm-resource-card"
            style={style}
            styles={{
                body: {
                    padding: 0,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }
            }}
        >
            <header className="vm-resource-head">
                <div className="vm-resource-identity">
                    <span className="vm-resource-icon" aria-hidden="true">
                        <DesktopOutlined />
                    </span>
                    <div className="vm-resource-title-block">
                        <div className="vm-resource-title-row">
                            <Tooltip title={uuid}>
                                <h3 className="vm-resource-name">{vm.display_name || uuid}</h3>
                            </Tooltip>
                            <Tag color={statusInfo.color} className={`vm-resource-status ${statusInfo.className}`} icon={getStatusIcon()}>
                                {statusInfo.text}
                            </Tag>
                        </div>
                        <div className="vm-resource-subtitle">
                            <span className="vm-resource-uuid" title={uuid}>{uuid}</span>
                            <span className="vm-resource-os">{config.os_name || '未知系统'}</span>
                        </div>
                    </div>
                </div>
                <div className="vm-resource-context">
                    {hostName && (
                        <span className="vm-resource-context-chip is-host" title={hostName}>
                            <CloudServerOutlined aria-hidden="true" />
                            {hostName}
                        </span>
                    )}
                    {(() => {
                        const ownerNames = Object.keys(config.own_all || {})
                        if (ownerNames.length === 0) return null
                        return (
                            <Tooltip title={ownerNames.length > 1 ? `共享: ${ownerNames.join(', ')}` : undefined}>
                                <span className="vm-resource-context-chip" title={ownerNames.length > 1 ? `共享: ${ownerNames.join(', ')}` : ownerNames[0]}>
                                    <UserOutlined aria-hidden="true" />
                                    {ownerNames[0]}
                                </span>
                            </Tooltip>
                        )
                    })()}
                </div>
            </header>

            <div className="vm-resource-body">
                <section className="vm-resource-section" aria-label="虚拟机资源配置">
                    <header className="vm-resource-section-head">
                        <h4><DatabaseOutlined aria-hidden="true" />资源配置</h4>
                    </header>
                    <div className="vm-resource-metrics">
                        <Metric name="CPU" value={`${cpuTotal} 核 · ${cpuPercent}%`} percent={cpuPercent} />
                        <Metric name="内存" value={`${formatMemory(memUsage)} / ${formatMemory(memTotal)}`} percent={memPercent} />
                        <Metric name="硬盘" value={`${formatMemory(hddUsage)} / ${formatMemory(hddTotal)}`} percent={diskUsage} />
                        <Metric name="显存" value={`${formatMemory(Number(gpuUsageValue) || 0)} / ${formatMemory(config.gpu_mem || gpuTotal)}`} percent={gpuPercent} />
                    </div>
                </section>

                <section className="vm-resource-panel vm-resource-traffic" aria-label="网络流量">
                    <header className="vm-resource-section-head">
                        <h4><ThunderboltOutlined aria-hidden="true" />流量</h4>
                        <span className="vm-resource-panel-note">上传与下载 / 已用总量</span>
                    </header>
                    <div className="vm-resource-traffic-values">
                        <div className="vm-resource-throughput">
                            <span className="is-upload"><b aria-hidden="true">↑</b>{formatDisk(firstStatus.bindbindwidth_up_usage || 0)}</span>
                            <span className="is-download"><b aria-hidden="true">↓</b>{formatDisk(firstStatus.bindwidth_down_usage || 0)}</span>
                        </div>
                        <span className="vm-resource-panel-value">
                            {formatDisk(firstStatus.flu_usage || 0)} <span>/</span> {formatDisk(firstStatus.flu_total || 0)}
                        </span>
                    </div>
                    <Progress
                        percent={firstStatus.flu_total > 0 ? Math.max(0, Math.min(100, Math.round((firstStatus.flu_usage || 0) / firstStatus.flu_total * 100))) : 0}
                        size="small"
                        strokeWidth={5}
                        strokeColor="var(--main-color)"
                        trailColor="var(--art-gray-200)"
                        showInfo={false}
                    />
                </section>

                <div className="vm-resource-detail-grid">
                    <section className="vm-resource-panel" aria-label="网络端口配额">
                        <header className="vm-resource-section-head">
                            <h4><ApiOutlined aria-hidden="true" />网络端口</h4>
                        </header>
                        <div className="vm-resource-quota-row">
                            <span>NAT 端口</span>
                            <span className="vm-resource-panel-value">{(config.nat_all || []).length}<i>/</i>{config.nat_num || 100}</span>
                        </div>
                        <div className="vm-resource-quota-row">
                            <span>Web 代理</span>
                            <span className="vm-resource-panel-value">{(config.web_all || []).length}<i>/</i>{config.web_num || 100}</span>
                        </div>
                    </section>

                    <section className="vm-resource-panel" aria-label="网卡信息">
                        <header className="vm-resource-section-head">
                            <h4><GlobalOutlined aria-hidden="true" />网卡信息</h4>
                        </header>
                        <Tooltip title={`IPv4: ${ipv4} | IPv6: ${ipv6 !== '-' ? ipv6 : '未配置'} | MAC: ${macAddr}`}>
                            <div className="vm-resource-nic">
                                <span className="vm-resource-nic-address">{ipv4}<i>/</i>{ipv6 !== '-' ? ipv6 : '未配置'}</span>
                                <span className="vm-resource-nic-mac">{macAddr}</span>
                            </div>
                        </Tooltip>
                    </section>
                </div>
            </div>

            <footer className="vm-resource-footer">
                <Button
                    className="vm-resource-detail-action"
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => onDetail(uuid)}
                >
                    查看详情
                </Button>
                <div className="vm-resource-actions" aria-label="虚拟机操作">
                    <Tooltip title={hostDisabled ? '主机已禁用' : !hasPermission(userPermissions, VM_PERMISSION.VNC_EDITS) ? '无VNC权限' : 'VNC控制台'}>
                        <Button
                            type="text"
                            size="small"
                            aria-label="VNC 控制台"
                            icon={<DesktopOutlined />}
                            onClick={() => onVnc(uuid)}
                            disabled={!isRunning || hostDisabled || !hasPermission(userPermissions, VM_PERMISSION.VNC_EDITS)}
                        />
                    </Tooltip>
                    <Tooltip title={hostDisabled ? '主机已禁用' : !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS) ? '无电源权限' : '电源操作'}>
                        <Button
                            type="text"
                            size="small"
                            aria-label="电源操作"
                            icon={<PoweroffOutlined className={isRunning ? 'vm-resource-power-on' : ''} />}
                            onClick={() => onPower(uuid)}
                            disabled={hostDisabled || !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)}
                        />
                    </Tooltip>
                    <Tooltip title={hostDisabled ? '主机已禁用' : !canModify ? '无修改虚拟机权限' : !hasPermission(userPermissions, VM_PERMISSION.VM_MODIFY) ? '无编辑权限' : '编辑配置'}>
                        <Button
                            type="text"
                            size="small"
                            aria-label="编辑配置"
                            icon={<EditOutlined />}
                            onClick={() => onEdit(uuid)}
                            disabled={hostDisabled || !canModify || !hasPermission(userPermissions, VM_PERMISSION.VM_MODIFY)}
                        />
                    </Tooltip>
                    <Tooltip title={hostDisabled ? '主机已禁用' : !canDelete ? '无删除虚拟机权限' : !hasPermission(userPermissions, VM_PERMISSION.VM_DELETE) ? '无删除权限' : '删除虚拟机'}>
                        <Button
                            type="text"
                            size="small"
                            danger
                            aria-label="删除虚拟机"
                            icon={<DeleteOutlined />}
                            onClick={() => onDelete(uuid)}
                            disabled={hostDisabled || !canDelete || !hasPermission(userPermissions, VM_PERMISSION.VM_DELETE)}
                        />
                    </Tooltip>
                </div>
            </footer>
        </Card>
    )
}

export default DockCard
