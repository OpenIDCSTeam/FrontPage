import React from 'react'
import { Card, Tag, Row, Col, Tooltip, Button, Progress } from 'antd'
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

/** 资源指标：标签 + 用量 + 细进度条 */
const Metric: React.FC<{ name: string; value: string; percent: number; color: string }> = ({
    name,
    value,
    percent,
    color,
}) => (
    <div className="art-metric">
        <div className="art-metric-head">
            <span className="art-metric-name">{name}</span>
            <span className="art-metric-value">{value}</span>
        </div>
        <Progress
            percent={Math.max(0, Math.min(100, percent))}
            size="small"
            strokeWidth={5}
            strokeColor={color}
            trailColor="var(--art-card-border)"
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
    const firstNic = Object.values(nicAll)[0] || {}
    // @ts-ignore
    const ipv4 = firstNic.ip4_addr || '-'
    // @ts-ignore
    const ipv6 = firstNic.ip6_addr || '-'
    // @ts-ignore
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
                return <PlayCircleOutlined className="text-green-600 dark:text-green-400" />
            case 'STOPPED':
                return <PoweroffOutlined className="text-red-600 dark:text-red-400" />
            case 'PAUSED':
                return <PauseCircleOutlined className="text-blue-600 dark:text-blue-400" />
            case 'STARTING':
            case 'STOPPING':
            case 'PAUSING':
            case 'RESUMING':
                return <LoadingOutlined className="text-yellow-600 dark:text-yellow-400" spin />
            default:
                return <QuestionCircleOutlined className="" />
        }
    }

    return (
        <Card
            hoverable
            className="glass-card h-full flex flex-col"
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
            {/* 头部区域 */}
            <div className="art-dockcard-head">
                <div className="art-icon-tile">
                    <DesktopOutlined />
                </div>
                <div className="art-dockcard-titles">
                    <div className="art-dockcard-name-row">
                        <Tooltip title={uuid}>
                            <h3 className="art-dockcard-name">{vm.display_name || uuid}</h3>
                        </Tooltip>
                        <Tag color={statusInfo.color} className={statusInfo.className} icon={getStatusIcon()}>
                            {statusInfo.text}
                        </Tag>
                    </div>
                    <div className="art-dockcard-sub">
                        <span className="art-dockcard-uuid">{uuid}</span>
                        <span>{config.os_name || '未知系统'}</span>
                        {hostName && (
                            <Tag icon={<CloudServerOutlined />} className="m-0" color="blue">{hostName}</Tag>
                        )}
                        {(() => {
                            const ownAll = config.own_all || {}
                            const ownerNames = Object.keys(ownAll)
                            if (ownerNames.length === 0) return null
                            return (
                                <Tooltip title={ownerNames.length > 1 ? `共享: ${ownerNames.join(', ')}` : undefined}>
                                    <Tag icon={<UserOutlined />} className="m-0" color="default">{ownerNames[0]}</Tag>
                                </Tooltip>
                            )
                        })()}
                    </div>
                </div>
            </div>

            {/* 主体内容区域 */}
            <div className="art-dockcard-body">
                {/* 资源配置 */}
                <div className="space-y-2">
                    <div className="art-subpanel-head">
                        <DatabaseOutlined />
                        资源配置
                    </div>
                    <Row gutter={[8, 8]}>
                        <Col span={12}>
                            <Metric
                                name="CPU"
                                value={`${cpuTotal} 核 · ${cpuPercent}%`}
                                percent={cpuPercent}
                                color="#5d87ff"
                            />
                        </Col>
                        <Col span={12}>
                            <Metric
                                name="内存"
                                value={`${formatMemory(memUsage)} / ${formatMemory(memTotal)}`}
                                percent={memPercent}
                                color="#12c48b"
                            />
                        </Col>
                        <Col span={12}>
                            <Metric
                                name="硬盘"
                                value={`${formatMemory(hddUsage)} / ${formatMemory(hddTotal)}`}
                                percent={diskUsage}
                                color="#7b6cff"
                            />
                        </Col>
                        <Col span={12}>
                            <Metric
                                name="显存"
                                value={`${formatMemory(Number(gpuUsageValue) || 0)} / ${formatMemory(config.gpu_mem || gpuTotal)}`}
                                percent={gpuPercent}
                                color="#f5a623"
                            />
                        </Col>
                    </Row>
                </div>

                {/* 流量 */}
                <div className="art-subpanel">
                    <div className="art-subpanel-head">
                        <ThunderboltOutlined />
                        流量
                    </div>
                    <div className="art-subpanel-row">
                        <span>
                            <span className="text-green-600 dark:text-green-400">↑ {formatDisk(firstStatus.bindbindwidth_up_usage || 0)}</span>
                            <span className="ml-2 text-blue-600 dark:text-blue-400">↓ {formatDisk(firstStatus.bindwidth_down_usage || 0)}</span>
                        </span>
                        <span className="art-subpanel-value">
                            {formatDisk(firstStatus.flu_usage || 0)} / {formatDisk(firstStatus.flu_total || 0)}
                        </span>
                    </div>
                    <Progress
                        percent={firstStatus.flu_total > 0 ? Math.round((firstStatus.flu_usage || 0) / firstStatus.flu_total * 100) : 0}
                        size="small"
                        strokeWidth={5}
                        strokeColor="#5d87ff"
                        trailColor="var(--art-card-border)"
                        showInfo={false}
                    />
                </div>

                {/* 网络端口 */}
                <div className="art-subpanel">
                    <div className="art-subpanel-head">
                        <ApiOutlined />
                        网络端口
                    </div>
                    <Row gutter={[8, 4]}>
                        <Col span={12}>
                            <div className="art-subpanel-row">
                                <span>NAT 端口</span>
                                <span className="art-subpanel-value">
                                    {(config.nat_all || []).length} / {config.nat_num || 100}
                                </span>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className="art-subpanel-row">
                                <span>Web 代理</span>
                                <span className="art-subpanel-value">
                                    {(config.web_all || []).length} / {config.web_num || 100}
                                </span>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* 网卡信息 */}
                <div className="art-subpanel">
                    <div className="art-subpanel-head">
                        <GlobalOutlined />
                        网卡信息
                    </div>
                    <Tooltip title={`IPv4: ${ipv4} | IPv6: ${ipv6 !== '-' ? ipv6 : '未配置'} | MAC: ${macAddr}`}>
                        <div className="art-subpanel-value art-dockcard-nic">
                            {ipv4} / {ipv6 !== '-' ? ipv6 : '未配置'}
                            <span className="art-dockcard-nic-mac">{macAddr}</span>
                        </div>
                    </Tooltip>
                </div>
            </div>

            {/* 底部操作栏 */}
            <div className="art-card-actions">
                <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => onDetail(uuid)}
                >
                    查看详情
                </Button>
                <span className="art-card-actions-spacer" />
                <Tooltip title={hostDisabled ? '主机已禁用' : !hasPermission(userPermissions, VM_PERMISSION.VNC_EDITS) ? '无VNC权限' : 'VNC控制台'}>
                    <Button
                        type="text"
                        size="small"
                        icon={<DesktopOutlined />}
                        onClick={() => onVnc(uuid)}
                        disabled={!isRunning || hostDisabled || !hasPermission(userPermissions, VM_PERMISSION.VNC_EDITS)}
                    />
                </Tooltip>
                <Tooltip title={hostDisabled ? '主机已禁用' : !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS) ? '无电源权限' : '电源操作'}>
                    <Button
                        type="text"
                        size="small"
                        icon={<PoweroffOutlined className={isRunning ? 'text-green-500' : ''} />}
                        onClick={() => onPower(uuid)}
                        disabled={hostDisabled || !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)}
                    />
                </Tooltip>
                <Tooltip title={hostDisabled ? '主机已禁用' : !canModify ? '无修改虚拟机权限' : !hasPermission(userPermissions, VM_PERMISSION.VM_MODIFY) ? '无编辑权限' : '编辑配置'}>
                    <Button
                        type="text"
                        size="small"
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
                        icon={<DeleteOutlined />}
                        onClick={() => onDelete(uuid)}
                        disabled={hostDisabled || !canDelete || !hasPermission(userPermissions, VM_PERMISSION.VM_DELETE)}
                    />
                </Tooltip>
            </div>
        </Card>
    )
}

export default DockCard
