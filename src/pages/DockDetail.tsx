import {useEffect, useState, useMemo, useRef, type ReactNode} from 'react'
import {useParams, useNavigate, useLocation} from 'react-router-dom'
import {
    Card,
    Tabs,
    Button,
    Space,
    Tag,
    Progress,
    message,
    Modal,
    Form,
    Input,
    Select,
    InputNumber,
    Row,
    Col,
    Descriptions,
    Badge,
    Spin,
    Alert,
    Checkbox,
    Dropdown,
    MenuProps,
    Radio,
    Divider,
    Segmented,
    Table
} from 'antd'
import {
    ReloadOutlined,
    PoweroffOutlined,
    DeleteOutlined,
    DesktopOutlined,
    EyeOutlined,
    CopyOutlined,
    PlusOutlined,
    UsergroupAddOutlined,
    MoreOutlined,
    WindowsOutlined,
    AppleOutlined,
    CodeOutlined,
    CloudSyncOutlined,
    AreaChartOutlined,
    HddOutlined,
    GlobalOutlined,
    SafetyCertificateOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
    EditOutlined,
    KeyOutlined,
    DownOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    LoadingOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import VmDetailTopBar from '@/components/VmDetailTopBar'
import FirewallPanel from '@/components/FirewallPanel'
import SnapshotPanel from '@/components/SnapshotPanel'
import { useTheme } from '@/contexts/ThemeContext'
import { getThemePalette } from '@/config/theme.config'
import { getVMDetailLayoutKey, readVMDetailLayout, saveVMDetailLayout, type VMDetailLayout } from '@/utils/vmDetailLayout'
import api from '@/utils/apis.ts'
import { useUserStore } from '@/utils/data'
import { startTaskWithNotification, getTaskList } from '@/utils/taskPoller'
import {VM_PERMISSION, hasPermission, TAB_PERMISSION_MAP, VM_PERMISSION_LABELS, PERMISSION_FIELD_MASK, HIDDEN_TABS, OWNER_ONLY_TABS, getTabQuota, isQuotaExhausted} from '@/types'

const VM_DETAIL_TAB_ORDER = ['overview', 'ip', 'hdd', 'iso', 'nat', 'firewall', 'proxy', 'pci', 'usb', 'snapshot', 'backup', 'efi', 'owners', 'access']

/** 详情卡片：标题可点击折叠，移动端用于收起低频信息 */
function FoldCard({ title, defaultOpen = true, className = '', children }: {
    title: ReactNode
    defaultOpen?: boolean
    className?: string
    children: ReactNode
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <Card
            size="small"
            variant="borderless"
            className={`shadow-sm glass-card-transparent vm-classic-fold-card${className ? ` ${className}` : ''}${open ? '' : ' is-collapsed'}`}
            title={(
                <button
                    type="button"
                    className="vm-classic-fold-trigger"
                    aria-expanded={open}
                    onClick={() => setOpen(value => !value)}
                >
                    <span>{title}</span>
                    <DownOutlined className={open ? 'is-open' : ''} />
                </button>
            )}
        >
            {open && children}
        </Card>
    )
}

function isVMDetailTabVisible(
    key: string,
    config: Record<string, any>,
    permissions: { isAdminUser: boolean; isOwnerOrAdmin: boolean; canManageAccessKey: boolean; userPermissions: number; firewallSupported: boolean; snapshotSupported: boolean },
): boolean {
    // 平台不支持对应能力时隐藏入口（与用户权限无关，避免点进去只能报错）
    if (key === 'firewall' && !permissions.firewallSupported) return false
    if (key === 'snapshot' && !permissions.snapshotSupported) return false
    if (key === 'access') return permissions.canManageAccessKey
    if (OWNER_ONLY_TABS.has(key)) return permissions.isOwnerOrAdmin
    const requiredPermission = TAB_PERMISSION_MAP[key]
    if (!requiredPermission || permissions.isAdminUser) return true
    if (getTabQuota(config, key) === 0) return false
    return !HIDDEN_TABS.has(key) || hasPermission(permissions.userPermissions, requiredPermission)
}

interface VGConfig {
    gpu_uuid: string
    gpu_mdev: string
    gpu_hint: string
}

/**
 * 虚拟机详情数据接口
 */
interface DockDetail {
    vm_uuid: string
    vm_name: string
    os_name: string
    os_pass: string
    vnc_pass: string
    status: any[]
    cpu_num: number
    mem_num: number
    hdd_num: number
    pci_all?: Record<string, VGConfig>
    gpu_mem?: number // 显存大小
    speed_up: number
    speed_down: number
    nat_num: number
    web_num: number
    flu_num: number // 流量限制
    traffic: number
    ipv4_address?: string
    ipv6_address?: string
    public_address?: string
    cpu_usage?: number
    mem_usage?: number
    hdd_usage?: number
    gpu_usage?: number
    net_usage?: number
    nat_usage?: number
    web_usage?: number
    traffic_usage?: number
    config?: any
}

interface VMStatus {
    ac_status: string
    mem_total: number
    mem_usage: number
    hdd_total: number
    hdd_usage: number
    gpu_total: number
    gpu_usage: number
    cpu_usage: number
    network_u: number
    network_d: number
    network_rx?: number
    network_tx?: number
    flu_usage?: number
    ext_usage?: Record<string, [number, number]>
    on_update: number

    [key: string]: any
}


interface NATRule {
    id: number
    protocol: string
    public_port: number
    private_port: number
    internal_ip?: string
    description?: string
    // 老前端字段名兼容
    wan_port?: number | string
    lan_port?: number | string
    lan_addr?: string
    nat_tips?: string
}

interface IPAddress {
    nic_name: string
    ip_address: string
    ip6_address?: string
    ip_type: string
    subnet_mask?: string
    gateway?: string
}

interface ProxyRule {
    id?: number
    domain: string
    backend_port: number
    ssl_enabled: boolean
    backend_ip?: string
    description?: string
}

interface HDDInfo {
    hdd_index?: number
    hdd_num: number
    hdd_path: string
    hdd_type?: number
    hdd_flag?: number
    hdd_size?: number
}

interface ISOInfo {
    iso_index?: number
    iso_path?: string
    iso_name?: string
    iso_file?: string
    iso_hint?: string
    iso_key?: string
}

interface BackupInfo {
    backup_index?: number
    backup_name: string
    backup_path?: string
    created_time: string
    size?: string
    backup_time?: number
    backup_hint?: string
}

interface OwnerInfo {
    username: string
    role: string
    is_admin?: boolean
    email?: string
    permission?: number
}

interface OSConfigItem {
    sys_name: string
    sys_file: string
    sys_size: string
    sys_type: string
    sys_flag?: boolean
}

interface HostCapabilities {
    /** 挂载/卸载光盘是否免重启 */
    hot_iso?: boolean
    /** 增删网卡是否免重启 */
    hot_nic?: boolean
    /** 数据盘/PCI/USB 是否必须关机 */
    offline_only?: boolean
    /** 平台是否支持虚拟机防火墙（不支持时隐藏防火墙页签） */
    firewall?: boolean
    /** 平台是否支持虚拟机快照（不支持时隐藏快照页签） */
    snapshot?: boolean
}

interface HostConfig {
    system_maps: OSConfigItem[]
    images_maps?: OSConfigItem[]
    tab_lock?: string[]
    server_type?: string
    enable_host?: boolean
    ipaddr_maps?: Record<string, any>
    ipaddr_ddns?: string[]
    public_addr?: string[]
    capabilities?: HostCapabilities
}

function VMDetail() {
    const {hostName, uuid} = useParams<{ hostName: string; uuid: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useUserStore()
    const isRestrictedSession = Boolean((user as any)?.temp_login || ((user as any)?.temp_hs_name && (user as any)?.temp_vm_uuid))
    const detailLayoutPreferenceKey = getVMDetailLayoutKey(user?.username)
    const [layoutPreference, setLayoutPreference] = useState<{ key: string; mode: VMDetailLayout }>(() => ({
        key: detailLayoutPreferenceKey,
        mode: readVMDetailLayout(user?.username),
    }))
    const detailLayout = isRestrictedSession
        ? 'horizontal'
        : layoutPreference.key === detailLayoutPreferenceKey
            ? layoutPreference.mode
            : readVMDetailLayout(user?.username)
    const changeDetailLayout = (mode: VMDetailLayout) => {
        if (isRestrictedSession) return
        saveVMDetailLayout(user?.username, mode)
        setLayoutPreference({ key: detailLayoutPreferenceKey, mode })
        if (mode === 'vertical' && hostName && uuid) {
            navigate({
                pathname: `/hosts/${hostName}/vms/${uuid}/v2`,
                search: location.search,
                hash: location.hash,
            })
        }
    }
    const { theme, themePreset, transparentMode } = useTheme()
    const themePalette = getThemePalette(themePreset, theme === 'dark', transparentMode)

    useEffect(() => {
        if (isRestrictedSession) return
        if (detailLayout !== 'vertical' || location.pathname.endsWith('/v2') || !hostName || !uuid) return
        navigate({
            pathname: `/hosts/${hostName}/vms/${uuid}/v2`,
            search: location.search,
            hash: location.hash,
        }, { replace: true })
    }, [detailLayout, hostName, uuid, location.pathname, location.search, location.hash, navigate])

    // 状态管理
    const [vm, setVM] = useState<DockDetail | null>(null)
    const vmRef = useRef<DockDetail | null>(null)
    const hostConfigRef = useRef<HostConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')
    const [showPassword, setShowPassword] = useState(false)
    const [showVncPassword, setShowVncPassword] = useState(false)
    const [natRules, setNatRules] = useState<NATRule[]>([])
    const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([])
    const [proxyRules, setProxyRules] = useState<ProxyRule[]>([])
    const [timeRange, setTimeRange] = useState(30) // 默认30分钟
    const [chartView, setChartView] = useState<'performance' | 'resource' | 'network'>('performance') // 默认性能视图
    const [monitorData, setMonitorData] = useState<any>({
        cpu: [], memory: [], disk: [], gpu: [], netUp: [], netDown: [], traffic: [], nat: [], proxy: [], labels: []
    })
    const [hostConfig, setHostConfig] = useState<HostConfig | null>(null)
    const [hostEnabled, setHostEnabled] = useState<boolean>(true) // 主机是否启用
    // 用ref跟踪最新hostConfig，避免setInterval闭包读到陈旧值
    const [userPermissions, setUserPermissions] = useState<number>(VM_PERMISSION.FULL_MASK) // 当前用户权限掩码

    // 模态框状态
    const [editModalVisible, setEditModalVisible] = useState(false)
    const [passwordModalVisible, setPasswordModalVisible] = useState(false)
    const [passwordActionType, setPasswordActionType] = useState<'os_password' | 'vnc_password' | 'vnc_port'>('os_password')
    const [randomVncPort, setRandomVncPort] = useState<number>(Math.floor(Math.random() * 1000) + 6000)
    const [vncPortConfirmChecked, setVncPortConfirmChecked] = useState(false)
    const [natModalVisible, setNatModalVisible] = useState(false)
    const [natViewMode, setNatViewMode] = useState<'card' | 'table'>('card')
    const [nicViewMode, setNicViewMode] = useState<'card' | 'table'>('card')
    const [hddViewMode, setHddViewMode] = useState<'card' | 'table'>('card')
    const [isoViewMode, setIsoViewMode] = useState<'card' | 'table'>('card')
    const [proxyViewMode, setProxyViewMode] = useState<'card' | 'table'>('card')
    const [pciViewMode, setPciViewMode] = useState<'card' | 'table'>('card')
    const [usbViewMode, setUsbViewMode] = useState<'card' | 'table'>('card')
    const [backupViewMode, setBackupViewMode] = useState<'card' | 'table'>('card')
    const [efiViewMode, setEfiViewMode] = useState<'card' | 'table'>('card')
    const [ownerViewMode, setOwnerViewMode] = useState<'card' | 'table'>('card')
    const [ipModalVisible, setIpModalVisible] = useState(false)
    const [proxyModalVisible, setProxyModalVisible] = useState(false)
    const [gpuModalVisible, setGpuModalVisible] = useState(false)
    const [hddModalVisible, setHddModalVisible] = useState(false)
    const [isoModalVisible, setIsoModalVisible] = useState(false)
    const [backupModalVisible, setBackupModalVisible] = useState(false)
    const [ownerModalVisible, setOwnerModalVisible] = useState(false)
    const [reinstallModalVisible, setReinstallModalVisible] = useState(false)
    const [transferHddModalVisible, setTransferHddModalVisible] = useState(false)
    const [transferOwnershipModalVisible, setTransferOwnershipModalVisible] = useState(false)
    const [mountHddModalVisible, setMountHddModalVisible] = useState(false)
    const [editPermModalVisible, setEditPermModalVisible] = useState(false)
    const [editPermOwner, setEditPermOwner] = useState('')
    const [editPermMask, setEditPermMask] = useState<number>(VM_PERMISSION.FULL_MASK)
    const [unmountHddModalVisible, setUnmountHddModalVisible] = useState(false)
    const [remoteModalVisible, setRemoteModalVisible] = useState(false) // 远程桌面模态框

    const [ipQuota, setIpQuota] = useState<any>(null)
    const [hdds, setHdds] = useState<HDDInfo[]>([])
    const [currentTransferHdd, setCurrentTransferHdd] = useState<HDDInfo | null>(null)
    const [currentMountHdd, setCurrentMountHdd] = useState<HDDInfo | null>(null)
    const [currentUnmountHdd, setCurrentUnmountHdd] = useState<HDDInfo | null>(null)
    const [transferTargetUuid, setTransferTargetUuid] = useState('')
    const [transferOwnerUsername, setTransferOwnerUsername] = useState('')
    const [transferOwnerConfirmChecked, setTransferOwnerConfirmChecked] = useState(false)
    const [keepAccessChecked, setKeepAccessChecked] = useState(false)

    const [saveConfirmModalVisible, setSaveConfirmModalVisible] = useState(false)
    const [saveConfirmChecked, setSaveConfirmChecked] = useState(false)
    const [pendingEditValues, setPendingEditValues] = useState<any>(null)

    // 通用确认动作状态
    const [actionConfirmModalVisible, setActionConfirmModalVisible] = useState(false)
    const [currentAction, setCurrentAction] = useState<{
        title: string;
        content: string;
        onConfirm: (confirmInput?: string) => Promise<void>;
        requireShutdown?: boolean;
        confirmChecked?: boolean;
        requireInput?: boolean;
        confirmInput?: string;
        expectedInput?: string;
    } | null>(null)

    const [isos, setIsos] = useState<ISOInfo[]>([])
    const [backups, setBackups] = useState<BackupInfo[]>([])
    const [owners, setOwners] = useState<OwnerInfo[]>([])

    // 访问密钥（16 位字母数字长期凭据，登录/URL 跳转后权限与临时凭据一致）
    const [accessKeyInfo, setAccessKeyInfo] = useState<{enabled: boolean; access_key: string; login_url: string}>(
        {enabled: false, access_key: '', login_url: ''}
    )
    const [accessKeyLoading, setAccessKeyLoading] = useState(false)
    const [accessKeyVisible, setAccessKeyVisible] = useState(false)

    const [form] = Form.useForm()
    const [ipForm] = Form.useForm()
    const [proxyForm] = Form.useForm()
    const [hddForm] = Form.useForm()
    const [isoForm] = Form.useForm()
    const [ownerForm] = Form.useForm()
    const [reinstallForm] = Form.useForm()
    const [backupForm] = Form.useForm()
    const [editVmForm] = Form.useForm()

    const [editNicList, setEditNicList] = useState<any[]>([])
    
    // USB State
    const [usbList, setUsbList] = useState<any[]>([])
    const [usbModalVisible, setUsbModalVisible] = useState(false)
    const [usbActionLoading, setUsbActionLoading] = useState(false)

    // PCI/USB 设备列表State（直通选择用）
    const [pciDeviceList, setPciDeviceList] = useState<Record<string, any>>({})
    const [usbDeviceList, setUsbDeviceList] = useState<Record<string, any>>({})
    const [pciListLoading, setPciListLoading] = useState(false)
    const [usbListLoading, setUsbListLoading] = useState(false)
    const [selectedPciKey, setSelectedPciKey] = useState<string>('')
    const [selectedUsbKey, setSelectedUsbKey] = useState<string>('')
    const [pciShutdownConfirmVisible, setPciShutdownConfirmVisible] = useState(false)
    const [pciShutdownConfirmChecked, setPciShutdownConfirmChecked] = useState(false)
    const [addPciConfirmChecked, setAddPciConfirmChecked] = useState(false)
    const [pendingPciAction, setPendingPciAction] = useState<(() => Promise<void>) | null>(null)
    const [addHddConfirmChecked, setAddHddConfirmChecked] = useState(false)
    const [usbShutdownConfirmChecked, setUsbShutdownConfirmChecked] = useState(false)

    // EFI State
    const [efiList, setEfiList] = useState<{efi_type: boolean; efi_name: string}[]>([])
    // 启动顺序首屏只自动加载一次（详情页有轮询，避免每次轮询都请求）
    const efiLoadedRef = useRef(false)
    const [efiEditing, setEfiEditing] = useState(false)
    const [efiEditList, setEfiEditList] = useState<{efi_type: boolean; efi_name: string}[]>([])
    const [efiLoading, setEfiLoading] = useState(false)
    const [efiActionLoading, setEfiActionLoading] = useState(false)

    // 当前用户是否为管理员（跳过权限和配额检查）
    const [isAdminUser, setIsAdminUser] = useState(false)
    // 当前用户是否为主所有者或管理员（用于控制owners tab可见性）
    const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false)

    useEffect(() => {
        const permissions = {
            isAdminUser,
            isOwnerOrAdmin,
            canManageAccessKey: isAdminUser || (isOwnerOrAdmin && !(user as any)?.temp_login),
            userPermissions,
            firewallSupported: hostConfig?.capabilities?.firewall === true,
            snapshotSupported: hostConfig?.capabilities?.snapshot === true,
        }
        const config = vm?.config || {}
        const fallbackTab = VM_DETAIL_TAB_ORDER.find(key => isVMDetailTabVisible(key, config, permissions))
        if (fallbackTab && !isVMDetailTabVisible(activeTab, config, permissions)) {
            setActiveTab(fallbackTab)
        }
    }, [activeTab, isAdminUser, isOwnerOrAdmin, userPermissions, user, vm?.config, hostConfig])

    // New Confirmation States
    const [isoMountConfirmChecked, setIsoMountConfirmChecked] = useState(false)
    const [unmountIsoConfirmVisible, setUnmountIsoConfirmVisible] = useState(false)
    const [currentUnmountIso, setCurrentUnmountIso] = useState<string>('')
    const [unmountIsoConfirmChecked, setUnmountIsoConfirmChecked] = useState(false)

    const [unmountHddConfirmChecked, setUnmountHddConfirmChecked] = useState(false)
    const [mountHddConfirmChecked, setMountHddConfirmChecked] = useState(false)
    const [transferHddConfirmChecked, setTransferHddConfirmChecked] = useState(false)

    const [backupCreateConfirmChecked, setBackupCreateConfirmChecked] = useState(false)
    const [restoreConfirmChecked1, setRestoreConfirmChecked1] = useState(false)
    const [restoreConfirmChecked2, setRestoreConfirmChecked2] = useState(false)
    const [currentRestoreBackup, setCurrentRestoreBackup] = useState<string>('')
    const [restoreBackupModalVisible, setRestoreBackupModalVisible] = useState(false)

    const [reinstallConfirmChecked, setReinstallConfirmChecked] = useState(false)

    // Loading States
    const [isoActionLoading, setIsoActionLoading] = useState(false)
    const [hddActionLoading, setHddActionLoading] = useState(false)
    const [backupActionLoading, setBackupActionLoading] = useState(false)
    const [ownerActionLoading, setOwnerActionLoading] = useState(false)
    const [reinstallActionLoading, setReinstallActionLoading] = useState(false)
    // 端口转发和反向代理操作加载状态
    const [natActionLoading, setNatActionLoading] = useState(false)
    const [proxyActionLoading, setProxyActionLoading] = useState(false)
    const [gpuActionLoading, setGpuActionLoading] = useState(false)
    // 截图状态
    const [vmScreenshot, setVmScreenshot] = useState<string>('')
    const [loadingScreenshot, setLoadingScreenshot] = useState<boolean>(false)
    const [screenshotError, setScreenshotError] = useState<boolean>(false)
    const isFirstScreenshotLoadRef = useRef<boolean>(true)

    // 当前虚拟机状态 - 用于避免使用未初始化的变量
    const [currentStatus, setCurrentStatus] = useState<VMStatus>({
        ac_status: 'UNKNOWN',
        mem_total: 0,
        mem_usage: 0,
        hdd_total: 0,
        hdd_usage: 0,
        gpu_total: 0,
        gpu_usage: 0,
        cpu_usage: 0,
        network_u: 0,
        network_d: 0,
        ext_usage: {},
        on_update: 0
    })

    // 临时状态管理 - 用于显示操作中的状态
    const [tempStatus, setTempStatus] = useState<string | null>(null)

    // 平台能力：决定是否提示“需重启”，以及操作后是否真的重启。
    // 之前所有平台都提示「需重启/同意强制关机」，但 PVE 换光盘是热生效；
    // 而真正需要重启的操作又只提示不执行，导致勾选了也没重启。
    const hotISO = hostConfig?.capabilities?.hot_iso === true
    const hotNIC = hostConfig?.capabilities?.hot_nic === true
    const vmRunning = currentStatus.ac_status === 'STARTED'

    // 需要重启才生效的操作：操作成功后真的执行重启，避免“勾选了却没重启”
    const restartVMForApply = async (reason: string) => {
        if (!hostName || !uuid) return
        try {
            await api.vmPower(hostName, uuid, 'S_RESET')
            message.success(`${reason}，已重启虚拟机使其生效`)
        } catch {
            message.warning(`${reason}，请手动重启虚拟机使其生效`)
        }
    }

    // 必须关机才能执行的配置变更：关机 → 执行 → 恢复运行。
    // 原来每个确认框都写着「我已同意强制关机」，但代码里根本没有关机，
    // 用户勾选后什么也没发生，配置自然不生效。
    const withVmOffline = async (label: string, action: () => Promise<void>) => {
        if (!hostName || !uuid) return
        const wasRunning = vmRunning
        if (wasRunning) {
            const hide = message.loading('正在关闭虚拟机...', 0)
            try {
                await api.vmPower(hostName, uuid, 'H_CLOSE')
                hide()
            } catch (e: any) {
                hide()
                message.error(e?.message || '关闭虚拟机失败，请手动关机后重试')
                return
            }
            await new Promise((resolve) => setTimeout(resolve, 3000))
        }
        try {
            await action()
        } finally {
            if (wasRunning) {
                try {
                    await api.vmPower(hostName, uuid, 'S_START')
                    message.success(`${label}已完成，虚拟机已重新启动`)
                } catch {
                    message.warning(`${label}已完成，请手动启动虚拟机`)
                }
            }
        }
    }
    
    // 操作锁定状态 - 执行操作时禁用所有按钮
    const [operationLocked, setOperationLocked] = useState<boolean>(false)
const [operationTimeoutId, setOperationTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)

    // 异步任务提交包装：自动锁定操作，任务完成/失败后解锁
    //
    // 注意：部分后端接口（数据盘/ISO/备份/直通等）是同步实现的，
    // 成功时只返回 code=200 而不返回 task_id。此前这类响应会让
    // startTaskWithNotification 直接 return false，既不会触发 onCompleted
    // 也不会触发 onFailed，导致 operationLocked 永远为 true ——
    // 用户点一次按钮后整页按钮失效，只能刷新页面。
    // 这里在缺少 task_id 时立即解锁，并给出成功/失败提示。
    const submitAsyncTask = (
        result: { code: number; msg?: string; data?: { task_id?: string } },
        taskLabel: string,
        options: { onCompleted?: () => void; onFailed?: () => void } = {}
    ) => {
        if (!result?.data?.task_id) {
            // 同步接口：不进入锁定状态
            if (result?.code === 200) {
                message.success(`${taskLabel}完成`)
                options.onCompleted?.()
            } else {
                message.error(result?.msg || `${taskLabel}失败`)
                options.onFailed?.()
            }
            return
        }

        setOperationLocked(true)
        startTaskWithNotification(result, taskLabel, {
            onCompleted: (_task) => {
                setOperationLocked(false)
                options.onCompleted?.()
            },
            onFailed: (_task) => {
                setOperationLocked(false)
                options.onFailed?.()
            },
        })
    }

    // 页面加载时检查当前虚拟机是否有正在执行的异步任务
    const checkRunningTasks = async () => {
        if (!uuid) return
        try {
            const taskList = await getTaskList({ vm_uuid: uuid, status: 'running', page: 1, page_size: 1 })
            if (taskList && taskList.items && taskList.items.length > 0) {
                const runningTask = taskList.items[0]
                setOperationLocked(true)
                // 启动轮询跟踪该任务
                startTaskWithNotification(
                    { code: 200, data: { task_id: runningTask.task_id } },
                    runningTask.task_type ? (runningTask.task_type.replace(/_/g, ' ')) : '异步任务',
                    {
                        onCompleted: () => { setOperationLocked(false); loadVMDetail() },
                        onFailed: () => { setOperationLocked(false); loadVMDetail() },
                    }
                )
            } else {
                // 再检查pending状态
                const pendingList = await getTaskList({ vm_uuid: uuid, status: 'pending', page: 1, page_size: 1 })
                if (pendingList && pendingList.items && pendingList.items.length > 0) {
                    const pendingTask = pendingList.items[0]
                    setOperationLocked(true)
                    startTaskWithNotification(
                        { code: 200, data: { task_id: pendingTask.task_id } },
                        pendingTask.task_type ? (pendingTask.task_type.replace(/_/g, ' ')) : '异步任务',
                        {
                            onCompleted: () => { setOperationLocked(false); loadVMDetail() },
                            onFailed: () => { setOperationLocked(false); loadVMDetail() },
                        }
                    )
                }
            }
        } catch (e) {
            // 检查失败不影响页面正常使用
        }
    }

    // 计算所有可用的IP地址
    const availableIPs = useMemo(() => {
        if (!vm || !vm.config || typeof vm.config !== 'object') return []
        const ipList: string[] = []

        // 优先从网卡配置获取确定的IP
        if (vm.config.nic_all) {
            Object.values(vm.config.nic_all).forEach((nic: any) => {
                if (nic.ip4_addr && nic.ip4_addr !== '-' && nic.ip4_addr !== '0.0.0.0') ipList.push(nic.ip4_addr)
                if (nic.ip6_addr && nic.ip6_addr !== '-' && nic.ip6_addr !== '::') ipList.push(nic.ip6_addr)
            })
        }

        // 补充ip_all
        if (vm.config.ip_all && Array.isArray(vm.config.ip_all)) {
            vm.config.ip_all.forEach((ip: any) => {
                if (ip.address) ipList.push(ip.address)
            })
        }

        return Array.from(new Set(ipList))
    }, [vm])

    // 获取OS图标
    const getOSIcon = (osName: string) => {
        const name = (osName || '').toLowerCase()
        const iconStyle = {fontSize: '60px', marginRight: '0px'}
        const isDark = theme === 'dark'

        if (name.includes('windows')) return <WindowsOutlined style={{...iconStyle, color: themePalette.primary}}/>
        if (name.includes('macos')) return <AppleOutlined style={{...iconStyle, color: themePalette.gray[900]}}/>
        if (name.includes('ubuntu')) return <span className="anticon" style={{...iconStyle, color: '#E95420'}}><i
            className="fab fa-ubuntu"></i><CodeOutlined/></span>
        if (name.includes('centos')) return <span className="anticon"
                                                  style={{...iconStyle, color: isDark ? '#7B7FFF' : '#262577'}}><CodeOutlined/></span>
        if (name.includes('debian')) return <span className="anticon"
                                                  style={{...iconStyle, color: isDark ? '#FF6B8A' : '#A81D33'}}><CodeOutlined/></span>
        if (name.includes('fedora')) return <span className="anticon"
                                                  style={{...iconStyle, color: isDark ? '#6B9FFF' : '#294172'}}><CodeOutlined/></span>
        if (name.includes('linux')) return <span className="anticon"
                                                 style={{...iconStyle, color: isDark ? '#999' : '#333'}}><DesktopOutlined/></span>

        return <DesktopOutlined style={{...iconStyle, color: isDark ? '#999' : undefined}}/>
    }

    // 获取操作系统显示名称
    const getOSDisplayName = (osName: string) => {
        if (!hostConfig || !hostConfig.system_maps) return osName;
        const list: any[] = Array.isArray(hostConfig.system_maps)
            ? hostConfig.system_maps
            : Object.entries(hostConfig.system_maps as any).map(([name, val]: [string, any]) => (
                Array.isArray(val)
                    ? { sys_name: name, sys_file: val[0] }
                    : (val && typeof val === 'object' ? { sys_name: name, ...val } : { sys_name: name, sys_file: val })
            ));
        for (const it of list) {
            if (it && it.sys_file === osName) {
                return it.sys_name || osName;
            }
        }
        return osName;
    }

    // 加载数据
    const loadHostInfo = async () => {
        if (!hostName) return
        try {
            // 加载主机配置（含enable_host等用户态必要字段）
            const result = await api.getOSImages(hostName)
            if (result.code === 200) {
                const config = result.data as unknown as HostConfig
                setHostConfig(config)
                hostConfigRef.current = config
                // 从同一接口获取主机启用状态
                const enabled = config.enable_host !== false
                setHostEnabled(enabled)
            }
        } catch (error: any) {
            console.error('加载主机配置失败:', error)
            // 主机不存在时不显示错误消息，避免重复提示
        }
    }

    // 获取虚拟机截图
    const loadVMScreenshot = async () => {
        const currentVm = vmRef.current
        if (!hostName || !uuid || !currentVm) return

        const serverType = (hostConfigRef.current ?? hostConfig)?.server_type || '';
        if (serverType === 'OCInterface' || serverType === 'LxContainer') return;

        // 直接从vm对象获取最新状态，而不是依赖currentStatus
        const latestStatus = currentVm.status && currentVm.status.length > 0 ? currentVm.status[currentVm.status.length - 1] : null;
        if (latestStatus && latestStatus.ac_status === 'STARTED') {
            // 只在首次加载时显示加载状态
            if (isFirstScreenshotLoadRef.current) {
                setLoadingScreenshot(true);
            }
            setScreenshotError(false);
            try {
                const response = await api.getVMScreenshot(hostName, uuid);
                if (response.data && response.data.screenshot) {
                    setVmScreenshot(`data:image/png;base64,${response.data.screenshot}`);
                    setScreenshotError(false);
                } else {
                    setScreenshotError(true);
                    setVmScreenshot('');
                }
            } catch (error) {
                console.error('获取截图失败:', error);
                setScreenshotError(true);
                setVmScreenshot('');
            } finally {
                if (isFirstScreenshotLoadRef.current) {
                    setLoadingScreenshot(false);
                    isFirstScreenshotLoadRef.current = false;
                }
            }
        }
    }

    const loadVMDetail = async (isPolling = false) => {
        if (!hostName || !uuid) return
        try {
            // 不显示全屏loading，只在首次加载显示
            if (!isPolling && !vm) setLoading(true)

            const [detailRes, statusRes] = await Promise.all([
                api.getVMDetail(hostName, uuid),
                api.getVMStatus(hostName, uuid)
            ])

            if (detailRes.data) {
                const vmData = detailRes.data as unknown as DockDetail
                if (statusRes.data) {
                    // 新API返回格式: {power_status: "STARTED", history: [...]}
                    if (statusRes.data.power_status && statusRes.data.history) {
                        // 使用历史数据作为status数组
                        vmData.status = Array.isArray(statusRes.data.history) ? statusRes.data.history : []
                        // 如果历史数据为空或最新状态与power_status不一致，添加当前电源状态
                        if (vmData.status.length === 0 || vmData.status[vmData.status.length - 1]?.ac_status !== statusRes.data.power_status) {
                            vmData.status.push({
                                ac_status: statusRes.data.power_status,
                                mem_total: 0,
                                mem_usage: 0,
                                hdd_total: 0,
                                hdd_usage: 0,
                                gpu_total: 0,
                                gpu_usage: 0,
                                cpu_usage: 0,
                                network_u: 0,
                                network_d: 0,
                                ext_usage: {},
                                on_update: Date.now() / 1000
                            })
                        }
                    } else {
                        // 兼容旧API格式
                        const statusData = Array.isArray(statusRes.data) ? statusRes.data : [statusRes.data]
                        vmData.status = statusData
                    }
                }

                // 修正IPv4显示
                if (!vmData.ipv4_address || vmData.ipv4_address === '-') {
                    if (vmData.config?.nic_all) {
                        const firstNic: any = Object.values(vmData.config.nic_all)[0]
                        if (firstNic) vmData.ipv4_address = firstNic.ip4_addr
                    }
                }

                // Load USB List
                if (vmData.config && vmData.config.usb_all) {
                    setUsbList(Object.entries(vmData.config.usb_all).map(([key, value]: [string, any]) => ({
                        key: key,
                        ...value
                    })))
                } else {
                    setUsbList([])
                }

                setVM(vmData)
                vmRef.current = vmData

                // 获取用户权限掩码
                if (detailRes.data && typeof (detailRes.data as any).user_permissions === 'number') {
                    setUserPermissions((detailRes.data as any).user_permissions)
                }

                // 判断当前用户是否为主所有者或管理员（用于控制owners tab可见性）
                const isAdmin = !!(detailRes.data as any)?.is_admin
                const ownerList = vmData.config?.own_all || {}
                const currentUsername = (detailRes.data as any)?.current_user || ''
                const ownerNames = Object.keys(ownerList)
                const isFirst = ownerNames.length > 0 && ownerNames[0] === currentUsername
                setIsAdminUser(isAdmin)
                setIsOwnerOrAdmin(isAdmin || isFirst)
            }
        } catch (error: any) {
            console.error('加载虚拟机详情失败:', error)
            if (!isPolling) {
                // 只在首次加载时显示错误消息
                message.error(error?.message || '加载虚拟机详情失败')
                // 如果是主机不存在，可以考虑跳转回列表页
                if (error?.message?.includes('主机不存在')) {
                    setTimeout(() => {
                        navigate('/hosts')
                    }, 2000)
                }
            }
        } finally {
            if (!isPolling) setLoading(false)
        }
    }

    // 加载各种列表
    const loadNATRules = async () => {
        if (!hostName || !uuid) return
        try {
            const response = await api.getNATRules(hostName, uuid)
            if (response.data) setNatRules(Array.isArray(response.data) ? response.data as unknown as NATRule[] : [])
        } catch (error: any) {
            console.error('加载NAT规则失败:', error)
            // 主机不存在时不显示错误消息
        }
    }

    const loadIPAddresses = async () => {
        if (!hostName || !uuid) return
        try {
            const response = await api.getVMIPAddresses(hostName, uuid)
            if (response.data) setIpAddresses(Array.isArray(response.data) ? response.data as unknown as IPAddress[] : [])
            const userResponse = await api.getCurrentUser()
            if (userResponse.data) {
                const user = userResponse.data
                setIpQuota({
                    ip_num: user.quota_nat_ports || 0,
                    ip_used: 0,
                    user_data: user
                })
            }
        } catch (error: any) {
            console.error('加载IP地址失败:', error)
            // 主机不存在时不显示错误消息
        }
    }

    const loadProxyRules = async () => {
        if (!hostName || !uuid) return
        try {
            const response = await api.getProxyConfigs(hostName, uuid)
            if (response.data) setProxyRules(Array.isArray(response.data) ? response.data as unknown as ProxyRule[] : [])
        } catch (error: any) {
            console.error('加载代理规则失败:', error)
            // 主机不存在时不显示错误消息
        }
    }

    // 加载EFI启动项列表。
    // useCache=true 时先用本地缓存渲染（避免首屏空白/占位），
    // 缓存不存在才发请求；请求成功始终回写缓存。
    const loadEFIList = async (useCache = false) => {
        if (!hostName || !uuid) return
        const cacheKey = `vm_efi_order:${hostName}:${uuid}`
        if (useCache) {
            const raw = localStorage.getItem(cacheKey)
            if (raw) {
                try {
                    const cached = JSON.parse(raw)
                    if (Array.isArray(cached) && cached.length > 0) {
                        setEfiList(cached)
                        return
                    }
                } catch {
                    localStorage.removeItem(cacheKey)
                }
            }
        }
        setEfiLoading(true)
        try {
            const response = await api.getEFIList(hostName, uuid)
            if (response.data && Array.isArray(response.data)) {
                setEfiList(response.data)
                localStorage.setItem(cacheKey, JSON.stringify(response.data))
            } else {
                setEfiList([])
            }
        } catch (error: any) {
            console.error('加载启动项列表失败:', error)
        } finally {
            setEfiLoading(false)
        }
    }

    // 进入详情页即加载启动项：有本地缓存先用缓存，没有则自动获取一次。
    // 之前只在「保存后」才加载，首屏启动顺序是空的。
    useEffect(() => {
        if (efiLoadedRef.current || !hostName || !uuid) return
        efiLoadedRef.current = true
        void loadEFIList(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hostName, uuid])

    // 保存EFI启动项顺序
    const handleSaveEFI = async () => {
        if (!hostName || !uuid) return
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setEfiActionLoading(true)
        try {
            const response = await api.setupEFI(hostName, uuid, efiEditList)
            if (response.code === 200) {
                message.success('启动顺序保存成功')
                setEfiEditing(false)
                await loadEFIList()
            } else {
                message.error(response.msg || '保存启动顺序失败')
            }
        } catch (error: any) {
            message.error(error?.message || '保存启动顺序失败')
        } finally {
            setEfiActionLoading(false)
        }
    }

    // EFI启动项上移
    const handleEfiMoveUp = (index: number) => {
        if (index <= 0) return
        const newList = [...efiEditList]
        const temp = newList[index - 1]
        newList[index - 1] = newList[index]
        newList[index] = temp
        setEfiEditList(newList)
    }

    // EFI启动项下移
    const handleEfiMoveDown = (index: number) => {
        if (index >= efiEditList.length - 1) return
        const newList = [...efiEditList]
        const temp = newList[index + 1]
        newList[index + 1] = newList[index]
        newList[index] = temp
        setEfiEditList(newList)
    }

    const handleAddUSB = async () => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        try {
            if (!selectedUsbKey) {
                message.error('请选择一个USB 设备')
                return
            }
            const device = usbDeviceList[selectedUsbKey]
            if (!device) {
                message.error('所选USB 设备无效')
                return
            }
            setUsbActionLoading(true)
            const result = await api.setupUSB(hostName!, uuid!, {
                usb_key: selectedUsbKey,
                vid_uuid: device.vid_uuid,
                pid_uuid: device.pid_uuid,
                usb_hint: device.usb_hint,
                action: 'add'
            })
            setUsbModalVisible(false)
            setSelectedUsbKey('')
            submitAsyncTask(result, '添加USB 设备', {
                onCompleted: () => loadVMDetail(),
                onFailed: () => loadVMDetail(),
            })
        } catch (error: any) {
            console.error('添加USB 设备失败:', error)
            message.error(error.message || '添加USB 设备失败')
        } finally {
            setUsbActionLoading(false)
        }
    }

    const handleDeleteUSB = async (usbKey: string) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        const usbConfig = vm?.config?.usb_all?.[usbKey]
        showConfirmAction(
            '删除USB 设备确认',
            `确定要移除USB直通设备 "${usbConfig?.usb_hint || usbKey}" 吗？此操作需要关闭虚拟机。`,
            async () => {
                try {
                    setUsbActionLoading(true)
                    await withVmOffline('移除USB 设备', async () => {
                        const result = await api.setupUSB(hostName!, uuid!, {
                            usb_key: usbKey,
                            vid_uuid: usbConfig?.vid_uuid || '',
                            pid_uuid: usbConfig?.pid_uuid || '',
                            usb_hint: usbConfig?.usb_hint || '',
                            action: 'remove'
                        })
                        submitAsyncTask(result, '移除USB 设备', {
                            onCompleted: () => loadVMDetail(),
                            onFailed: () => loadVMDetail(),
                        })
                    })
                } catch (error: any) {
                    console.error('删除USB 设备失败:', error)
                    message.error(error.message || '删除USB 设备失败')
                } finally {
                    setUsbActionLoading(false)
                }
            },
            true
        )
    }

    // 打开USB 设备添加Modal时加载可用设备列表
    const handleOpenUsbModal = async () => {
        setUsbModalVisible(true)
        setUsbListLoading(true)
        setSelectedUsbKey('')
        try {
            const res = await api.getUSBList(hostName!)
            if (res.code === 200 && res.data) {
                setUsbDeviceList(res.data)
            } else {
                setUsbDeviceList({})
            }
        } catch (e) {
            setUsbDeviceList({})
            message.error('获取USB 设备列表失败')
        } finally {
            setUsbListLoading(false)
        }
    }

    // 处理监控数据
    const processMonitorData = (statusList: any[], timeRangeMinutes: number) => {
        const data = {
            cpu: [],
            memory: [],
            disk: [],
            gpu: [],
            netUp: [],
            netDown: [],
            traffic: [],
            nat: [],
            proxy: [],
            labels: []
        } as any
        if (!statusList || statusList.length === 0) return data

        let latestTimestamp = 0
        statusList.forEach(status => {
            if (status.on_update && status.on_update > latestTimestamp) latestTimestamp = status.on_update
        })
        if (!latestTimestamp) latestTimestamp = Math.floor(Date.now() / 1000)

        const latestMinuteTimestamp = Math.floor(latestTimestamp / 60) * 60
        let sampleInterval = 1
        if (timeRangeMinutes > 60 && timeRangeMinutes <= 360) sampleInterval = 5
        else if (timeRangeMinutes > 360 && timeRangeMinutes <= 1440) sampleInterval = 10
        else if (timeRangeMinutes > 1440 && timeRangeMinutes <= 4320) sampleInterval = 30
        else if (timeRangeMinutes > 4320 && timeRangeMinutes <= 10080) sampleInterval = 60
        else if (timeRangeMinutes > 10080 && timeRangeMinutes <= 21600) sampleInterval = 120
        else if (timeRangeMinutes > 21600) sampleInterval = 240

        const totalPoints = Math.ceil(timeRangeMinutes / sampleInterval)
        const dataMap = new Map()
        statusList.forEach(status => {
            if (status.on_update) {
                const minuteTimestamp = Math.floor(status.on_update / 60) * 60
                dataMap.set(minuteTimestamp, status)
            }
        })

        for (let i = 0; i < totalPoints; i++) {
            const minuteOffset = (totalPoints - 1 - i) * sampleInterval
            const minuteTimestamp = latestMinuteTimestamp - minuteOffset * 60
            const status = dataMap.get(minuteTimestamp)

            const time = new Date(minuteTimestamp * 1000)
            const hours = String(time.getHours()).padStart(2, '0')
            const minutes = String(time.getMinutes()).padStart(2, '0')
            data.labels.push(`${hours}:${minutes}`)

            if (status) {
                data.cpu.push(status.cpu_usage || 0)
                data.memory.push(Number((status.mem_total > 0 ? (status.mem_usage / status.mem_total * 100) : 0).toFixed(2)))
                data.disk.push(Number((status.hdd_total > 0 ? (status.hdd_usage / status.hdd_total * 100) : 0).toFixed(2)))
                data.gpu.push(status.gpu_total || 0)
                data.netUp.push(status.network_u || 0)
                data.netDown.push(status.network_d || 0)
                data.traffic.push(Number(((status.flu_usage || 0) / 1024).toFixed(2)))
                data.nat.push(status.nat_usage || 0)
                data.proxy.push(status.web_usage || 0)
            } else {
                data.cpu.push(0);
                data.memory.push(0);
                data.disk.push(0);
                data.gpu.push(0);
                data.netUp.push(0);
                data.netDown.push(0)
                data.traffic.push(0);
                data.nat.push(0);
                data.proxy.push(0)
            }
        }
        return data
    }

    const loadMonitorData = async () => {
        if (!hostName || !uuid) return
        try {
            const response = await api.getVMMonitorData(hostName, uuid, timeRange)
            const history = response.data?.history
            if (history && Array.isArray(history)) {
                setMonitorData(processMonitorData(history, timeRange))
            }
        } catch (error: any) {
            console.error('加载监控数据失败:', error)
            // 主机不存在时不显示错误消息
        }
    }

    const loadHDDs = async () => {
        if (!hostName || !uuid) return
        try {
            const response = await api.getVMDetail(hostName, uuid)
            if (response.data && (response.data as any).config) {
                const data = response.data as any
                const hddAll = data.config.hdd_all || {}
                // 注意展开顺序：hdd_all 的 **map key 才是磁盘标识**（挂载/卸载/删除都按它定位），
                // 因此必须放在 ...value 之后，否则会被 value.hdd_path（Go 侧存的镜像绝对路径 /
                // 文件名）覆盖 —— 表现为「磁盘名称」显示成 vm-xxx.qcow2，
                // 且卸载/删除会拿这个路径去查 hdd_all 导致找不到磁盘。
                // Python 版没有 hdd_path 字段，此处行为与 Python 一致。
                const hddList = Object.entries(hddAll).map(([key, value]: [string, any]) => ({
                    ...value,
                    hdd_path: key,
                    hdd_size: value.hdd_size || 0,
                    hdd_type: value.hdd_type || 0,
                    hdd_flag: value.hdd_flag || 0,
                    hdd_num: value.hdd_size || 0
                }))
                setHdds(hddList)
            }
        } catch (error: any) {
            console.error('加载硬盘信息失败:', error)
            // 主机不存在时不显示错误消息
        }
    }

    const loadISOs = async () => {
        if (!hostName || !uuid) return
        try {
            const response = await api.getVMDetail(hostName, uuid)
            if (response.data && (response.data as any).config) {
                const data = response.data as any
                const isoAll = data.config.iso_all || {}
                // 同上：iso_name 以 map key 为准（卸载接口按 iso_name 定位）
                const isoList = Object.entries(isoAll).map(([key, value]: [string, any]) => ({
                    ...value,
                    iso_name: key,
                    iso_file: value.iso_file || '',
                    iso_hint: value.iso_hint || ''
                }))
                setIsos(isoList)
            }
        } catch (error: any) {
            console.error('加载ISO信息失败:', error)
            // 主机不存在时不显示错误消息
        }
    }

    const loadBackups = async () => {
        if (!hostName || !uuid) return
        try {
            const response = await api.getVMBackups(hostName, uuid)
            if (response.data) {
                const data = response.data as any
                // 处理不同的数据结构
                if (Array.isArray(data)) {
                    // 如果直接返回数组
                    setBackups(data)
                } else if (data.config && Array.isArray(data.config.backups)) {
                    // 旧的数据结构，包含config.backups
                    setBackups(data.config.backups)
                } else if (Array.isArray(data.backups)) {
                    // 新的数据结构，直接包含backups数组
                    setBackups(data.backups)
                } else {
                    // 其他情况，使用空数组
                    setBackups([])
                }
            } else {
                setBackups([])
            }
        } catch (error: any) {
            console.error('加载备份失败:', error)
            setBackups([])
            // 主机不存在时不显示错误消息
        }
    }

    const loadOwners = async () => {
        if (!hostName || !uuid) return
        try {
            const response = await api.getVMOwners(hostName, uuid)
            if (response.data) {
                const data = response.data as any
                // 处理不同的数据结构
                if (Array.isArray(data)) {
                    // 如果直接返回数组
                    setOwners(data)
                } else if (data.owners && Array.isArray(data.owners)) {
                    // 如果返回的是包含owners数组的对象
                    setOwners(data.owners)
                } else {
                    // 其他情况，使用空数组
                    setOwners([])
                }
            } else {
                setOwners([])
            }
        } catch (error: any) {
            console.error('加载用户失败:', error)
            setOwners([])
            // 主机不存在时不显示错误消息
        }
    }

    // 加载访问密钥（仅管理员/主所有者有权读取，非授权身份静默忽略）
    const loadAccessKey = async () => {
        if (!hostName || !uuid) return
        try {
            const response = await api.getVMAccessKey(hostName, uuid)
            const data: any = response.data || {}
            setAccessKeyInfo({
                enabled: !!data.enabled,
                access_key: data.access_key || '',
                login_url: data.login_url || '',
            })
        } catch (error: any) {
            // 403（非主所有者）等场景不打扰用户，保持「未启用」展示
            setAccessKeyInfo({enabled: false, access_key: '', login_url: ''})
        }
    }

    // 生成（重置）访问密钥：旧密钥立即失效，需二次确认
    const handleGenerateAccessKey = async () => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        const hasKey = accessKeyInfo.enabled
        showConfirmAction(
            hasKey ? '重置访问密钥确认' : '生成访问密钥确认',
            hasKey
                ? '重置后旧密钥将立即失效，使用旧密钥的链接与登录将无法再访问该虚拟机。确定要重置吗？'
                : '将为该虚拟机生成一个 16 位访问密钥，持有该密钥的用户可直接登录并管理此虚拟机。确定要生成吗？',
            async () => {
                setAccessKeyLoading(true)
                try {
                    const response = await api.generateVMAccessKey(hostName!, uuid!)
                    const data: any = response.data || {}
                    setAccessKeyInfo({
                        enabled: !!data.enabled,
                        access_key: data.access_key || '',
                        login_url: data.login_url || '',
                    })
                    setAccessKeyVisible(true)
                    message.success(hasKey ? '访问密钥已重置' : '访问密钥生成成功')
                } catch (error: any) {
                    message.error(error?.message || '生成访问密钥失败')
                } finally {
                    setAccessKeyLoading(false)
                }
            },
        )
    }

    // 撤销访问密钥
    const handleDeleteAccessKey = async () => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        showConfirmAction(
            '撤销访问密钥确认',
            '撤销后该密钥立即失效，使用该密钥的登录与跳转链接将无法再访问该虚拟机。确定要撤销吗？',
            async () => {
                setAccessKeyLoading(true)
                try {
                    await api.deleteVMAccessKey(hostName!, uuid!)
                    setAccessKeyInfo({enabled: false, access_key: '', login_url: ''})
                    setAccessKeyVisible(false)
                    message.success('访问密钥已撤销')
                } catch (error: any) {
                    message.error(error?.message || '撤销访问密钥失败')
                } finally {
                    setAccessKeyLoading(false)
                }
            },
        )
    }

    // 复制访问密钥 / 登录链接
    const handleCopyText = async (text: string, tip: string) => {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            message.success(tip)
        } catch (e) {
            message.error('复制失败，请手动选择复制')
        }
    }

    // 完整登录链接（用于分享给他人直接跳转）
    const accessKeyLoginURL = accessKeyInfo.access_key
        ? `${window.location.origin}/api/client/keylogin?key=${accessKeyInfo.access_key}`
        : ''

    useEffect(() => {
        loadHostInfo();
        loadVMDetail();
        loadMonitorData()
        checkRunningTasks()
        
        // 智能轮询：根据状态调整轮询频率
        const getPollingInterval = () => {
            const status = currentStatus.ac_status;
            // 中间状态（停止中、启动中、暂停中、唤醒中、已暂停）加快轮询
            const intermediateStates = ['ON_STOP', 'ON_OPEN', 'ON_SAVE', 'ON_WAKE', 'SUSPEND'];
            if (intermediateStates.includes(status) || operationLocked) {
                return 2000; // 2秒轮询
            }
            return 10000; // 稳定状态10秒轮询
        };
        
        let currentInterval = setInterval(() => {
            loadVMDetail(true);
            loadMonitorData()
        }, getPollingInterval())
        
        // 动态更新轮询间隔
        const adjustInterval = setInterval(() => {
            clearInterval(currentInterval);
            currentInterval = setInterval(() => {
                loadVMDetail(true);
                loadMonitorData()
            }, getPollingInterval());
        }, 5000); // 每5秒检查一次是否需要调整轮询频率
        
        // 截图独立30秒轮询
        const screenshotInterval = setInterval(() => {
            loadVMScreenshot()
        }, 30000)
        return () => { clearInterval(currentInterval); clearInterval(screenshotInterval); clearInterval(adjustInterval) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hostName, uuid, currentStatus.ac_status, operationLocked])

    // 当虚拟机状态变为运行中时，获取截图
    useEffect(() => {
        if (currentStatus.ac_status === 'STARTED') {
            loadVMScreenshot();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStatus.ac_status])

    // 更新当前状态
    useEffect(() => {
        if (vm && vm.status && vm.status.length > 0) {
            setCurrentStatus(vm.status[vm.status.length - 1])
        }
    }, [vm])

    useEffect(() => {
        // 无论切换到哪个标签页，都预加载所有数据，确保切换时数据已准备好
        loadNATRules()
        loadIPAddresses()
        loadProxyRules()
        loadHDDs()
        loadISOs()
        loadBackups()
        loadOwners()
        loadAccessKey()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        // 标签页切换时刷新对应数据
        if (activeTab === 'nat') loadNATRules()
        else if (activeTab === 'ip') loadIPAddresses()
        else if (activeTab === 'proxy') loadProxyRules()
        else if (activeTab === 'hdd') loadHDDs()
        else if (activeTab === 'iso') loadISOs()
        else if (activeTab === 'backup') loadBackups()
        else if (activeTab === 'owners') loadOwners()
        else if (activeTab === 'access') loadAccessKey()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])

    useEffect(() => {
        loadMonitorData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeRange])

    useEffect(() => {
        if (natModalVisible && ipAddresses.length === 0) loadIPAddresses()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [natModalVisible])

    // 通用确认弹窗逻辑
    const showConfirmAction = (
        title: string,
        content: string,
        onConfirm: (confirmInput?: string) => Promise<void>,
        requireShutdown: boolean = false,
        requireInput: boolean = false,
        expectedInput: string = ''
    ) => {
        setCurrentAction({
            title,
            content,
            onConfirm,
            requireShutdown,
            confirmChecked: false,
            requireInput,
            confirmInput: '',
            expectedInput
        })
        setActionConfirmModalVisible(true)
    }

    const executeAction = async () => {
        if (!currentAction) return
        
        // 如果需要输入验证，检查输入是否匹配
        if (currentAction.requireInput && currentAction.confirmInput !== currentAction.expectedInput) {
            message.error('输入内容不匹配')
            return
        }
        
        setActionConfirmModalVisible(false)
        
        // 锁定操作
        setOperationLocked(true)
        
        try {
            await currentAction.onConfirm(currentAction.confirmInput)
            message.success('操作成功')
            // 操作成功后刷新状态
            setTimeout(loadVMDetail, 1500)
        } catch (error: any) {
            message.error(error.message || '操作失败')
            // 操作失败也刷新状态
            setTimeout(loadVMDetail, 1000)
        } finally {
            // 解锁操作
            setOperationLocked(false)
            // 清除超时定时器
            if (operationTimeoutId) {
                clearTimeout(operationTimeoutId)
                setOperationTimeoutId(null)
            }
        }
    }

    // 操作处理函数
    const handlePowerAction = async (action: string) => {
        if (!hostName || !uuid) return
        
        // 检查主机是否被禁用
        if (!hostEnabled) {
            message.error('该主机已被禁用，无法控制虚拟机电源')
            return
        }
        
        const actionMap: any = {
            stop: '软关机',
            hard_stop: '强制关机',
            hard_reset: '强制重启',
            reset: '软重启',
            start: '启动',
            pause: '暂停',
            resume: '恢复'
        }
        const statusMap: any = {
            start: 'ON_OPEN',
            stop: 'ON_STOP',
            hard_stop: 'ON_STOP',
            reset: 'ON_STOP',
            hard_reset: 'ON_STOP',
            pause: 'ON_SAVE',
            resume: 'ON_WAKE'
        }
        const requireShutdown = ['stop', 'hard_stop', 'hard_reset'].includes(action)

        showConfirmAction(
            `${actionMap[action]}确认`,
            `确定要执行${actionMap[action]}操作吗？${requireShutdown ? '此操作可能导致数据丢失！' : ''}`,
            async () => {
                // 设置临时状态为中间状态
                setTempStatus(statusMap[action])
                
                // 设置10分钟超时
                const timeoutId = setTimeout(() => {
                    setTempStatus(null)
                    setOperationLocked(false)
                    message.error('操作超时，请检查虚拟机状态')
                    loadVMDetail()
                }, 10 * 60 * 1000) // 10分钟
                setOperationTimeoutId(timeoutId)
                
                try {
                    await api.vmPower(hostName, uuid, action as any)
                    // 操作成功后，清除临时状态，让真实状态重新显示
                    setTempStatus(null)
                } catch (error) {
                    // 操作失败，清除临时状态
                    setTempStatus(null)
                    throw error
                }
            },
            requireShutdown
        )
    }

    const handleDelete = () => {
        // 检查主机是否被禁用
        if (!hostEnabled) {
            message.error('该主机已被禁用，无法删除虚拟机')
            return
        }

        // 判断管理员是否在删除非自己的虚拟机
        const ownerList = vm?.config?.own_all || {}
        const ownerNames = Object.keys(ownerList)
        const primaryOwner = ownerNames.length > 0 ? ownerNames[0] : ''
        const currentUsername = user?.username || ''
        const isOwnVM = primaryOwner === currentUsername

        if (isAdminUser && !isOwnVM && primaryOwner) {
            // 管理员删除非自己的虚拟机，需要输入主所有者用户名确认
            showConfirmAction(
                '确认删除',
                `此操作将永久删除虚拟机 "${uuid}" 且不可恢复。该虚拟机属于用户 "${primaryOwner}"，请输入主所有者用户名以确认删除：`,
                async (confirmInput) => {
                    await api.deleteVM(hostName!, uuid!, false, confirmInput)
                    navigate(`/hosts/${hostName}/vms`)
                },
                true,
                true,
                primaryOwner
            )
        } else {
            // 普通删除流程，输入虚拟机名称确认
            showConfirmAction(
                '确认删除',
                `此操作将永久删除虚拟机 "${uuid}" 且不可恢复，请输入虚拟机名称以确认删除：`,
                async () => {
                    await api.deleteVM(hostName!, uuid!)
                    navigate(`/hosts/${hostName}/vms`)
                },
                true,
                true,
                uuid || ''
            )
        }
    }

    const handleOpenVNC = async () => {
        if (!hostName || !uuid) return
        if (!hostEnabled) { message.error('该主机已被禁用，无法打开控制台'); return }
        const hide = message.loading('正在获取控制台地址...', 0)
        try {
            const response = await api.getVMConsole(hostName, uuid)
            hide()

            const url = response.data?.console_url || (typeof response.data === 'string' ? response.data : null)
            if (url && url.startsWith('http')) {
                window.open(url, '_blank')
            } else {
                message.error(response.data?.console_error || '获取的控制台地址无效')
            }
        } catch (error) {
            hide()
            message.error('打开控制台失败')
        }
    }

    const handleCopyPassword = (password: string, type: string) => {
        navigator.clipboard.writeText(password);
        message.success(`${type}密码已复制`)
    }

    const handleChangePassword = async (_values: any) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法修改密码'); return }
        const actionLabels: Record<string, string> = { os_password: '修改系统密码', vnc_password: '修改VNC密码', vnc_port: '修改VNC端口' }
        const actionLabel = actionLabels[passwordActionType] || '操作'

        // 立即关闭模态框，显示执行中
        setPasswordModalVisible(false)
        form.resetFields()
        setTempStatus('ON_PASSWD')
        message.loading({ content: `${actionLabel}执行中...`, key: 'pwd_action', duration: 0 })

        // 构建请求数据
        const requestData: any = { type: passwordActionType }
        if (passwordActionType === 'os_password') {
            requestData.password = _values.new_password
        } else if (passwordActionType === 'vnc_password') {
            requestData.vnc_password = _values.new_password
        } else if (passwordActionType === 'vnc_port') {
            requestData.vnc_port = randomVncPort
        }

        // 后台异步执行
        try {
            await api.changeVMPassword(hostName!, uuid!, requestData)
            setTempStatus(null)
            message.success({ content: `${actionLabel}成功`, key: 'pwd_action' })
            loadVMDetail()
        } catch (error: any) {
            setTempStatus(null)
            message.error({ content: `${actionLabel}失败: ${error?.message || '未知错误'}`, key: 'pwd_action' })
            loadVMDetail()
        }
    }

    const handleAddIPAddress = async (_values: any) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        // 显示确认对话框，提示需要重启虚拟机
        Modal.confirm({
            title: '添加网卡确认',
            content: (
                <div>
                    <p className="mb-3">确定要添加网卡吗？</p>
                    <Alert
                        message={hotNIC
                            ? '当前平台支持网卡热插拔，添加后立即生效'
                            : '添加网卡后需要重启虚拟机才能生效，确认后将自动重启'}
                        type={hotNIC ? 'info' : 'warning'} showIcon className="mb-3"/>
                <div className="p-3 rounded">
                        <p className="text-sm mb-1">网卡类型：{_values.nic_type === 'pub' ? '公网' : '内网'}</p>
                        {_values.ip4_addr && <p className="text-sm mb-1">IPv4地址：{_values.ip4_addr}</p>}
                        {_values.ip6_addr && <p className="text-sm">IPv6地址：{_values.ip6_addr}</p>}
                    </div>
                </div>
            ),
            okText: '确认添加',
            cancelText: '取消',
            mask: false,
            onOk: async () => {
                // 设置临时状态为配置中
                setTempStatus('configuring')
                const hide = message.loading('正在添加网卡...', 0)
                try {
                    const addRes = await api.addIPAddress(hostName!, uuid!, _values)
                    hide()
                    const assigned = (addRes.data as any)?.nic?.ip4_addr
                    if (hotNIC) {
                        message.success(assigned
                            ? `网卡添加成功，已分配 IP ${assigned}（无需重启）`
                            : '网卡添加成功（无需重启）')
                    } else {
                        message.success(assigned ? `网卡添加成功，已分配 IP ${assigned}` : '网卡添加成功')
                        if (vmRunning) {
                            await restartVMForApply('网卡已添加')
                        } else {
                            message.info('请启动虚拟机后新网卡才会生效')
                        }
                    }
                    setIpModalVisible(false);
                    ipForm.resetFields();
                    loadIPAddresses()
                    loadVMDetail() // 刷新虚拟机信息以更新网卡列表
                    // 操作完成后，清除临时状态
                    setTimeout(() => {
                        setTempStatus(null)
                    }, 1500)
                } catch (error) {
                    // 操作失败，清除临时状态
                    setTempStatus(null)
                    hide()
                    message.error('添加失败')
                }
            }
        })
    }

    const handleDeleteIPAddress = async (nicName: string) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        Modal.confirm({
            title: '删除网卡确认',
            content: (
                <div>
                    <p className="mb-3">确定要删除网卡 "{nicName}" 吗？</p>
                    <Alert
                        message={hotNIC
                            ? '当前平台支持网卡热插拔，删除后立即生效'
                            : '删除网卡后需要重启虚拟机才能生效，确认后将自动重启'}
                        type={hotNIC ? 'info' : 'warning'} showIcon/>
                </div>
            ),
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            mask: false,
            onOk: async () => {
                // 设置临时状态为配置中
                setTempStatus('configuring')
                const hide = message.loading('正在删除网卡...', 0)
                try {
                    await api.deleteIPAddress(hostName!, uuid!, nicName)
                    hide()
                    if (hotNIC) {
                        message.success('网卡删除成功（无需重启）')
                    } else {
                        message.success('网卡删除成功')
                        if (vmRunning) {
                            await restartVMForApply('网卡已删除')
                        } else {
                            message.info('请启动虚拟机后变更才会生效')
                        }
                    }
                    loadIPAddresses()
                    loadVMDetail() // 刷新虚拟机信息以更新网卡列表
                    // 操作完成后，清除临时状态
                    setTimeout(() => {
                        setTempStatus(null)
                    }, 1500)
                } catch (error) {
                    // 操作失败，清除临时状态
                    setTempStatus(null)
                    hide()
                    message.error('删除失败')
                }
            }
        })
    }

    const handleAddProxy = async (_values: any) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setProxyActionLoading(true)
        setOperationLocked(true)
        const hide = message.loading('正在添加反向代理...', 0)
        try {
            const data = {
                domain: _values.domain,
                backend_ip: _values.backend_ip || '',
                backend_port: parseInt(_values.backend_port),
                ssl_enabled: _values.ssl_enabled || false,
                description: _values.description || ''
            }
            await api.addProxyConfig(hostName!, uuid!, data)
            message.success('反向代理添加成功')
            setProxyModalVisible(false)
            proxyForm.resetFields()
            loadProxyRules()
        } catch (error: any) {
            message.error(error?.message || '添加失败')
        } finally {
            hide()
            setProxyActionLoading(false)
            setOperationLocked(false)
        }
    }

    const handleDeleteProxy = async (proxyId: number) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        showConfirmAction('删除代理确认', '确定要删除这个反向代理吗？', async () => {
            setProxyActionLoading(true)
            setOperationLocked(true)
            const hide = message.loading('正在删除反向代理...', 0)
            try {
                await api.deleteProxyConfig(hostName!, uuid!, proxyId)
                message.success('反向代理已删除')
                loadProxyRules()
            } catch (error: any) {
                message.error(error?.message || '删除失败')
            } finally {
                hide()
                setProxyActionLoading(false)
                setOperationLocked(false)
            }
        }, true)
    }

    const handleAddNATRule = async (_values: any) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setNatActionLoading(true)
        setOperationLocked(true)
        const hide = message.loading('正在添加NAT规则...', 0)
        try {
            const data: any = {
                // 留空表示自动分配：传 0 而不是空串，避免后端 int 字段解析失败
                wan_port: Number(_values.wan_port) || 0,
                lan_port: parseInt(_values.lan_port),
                lan_addr: _values.lan_addr || '',
                nat_tips: _values.nat_tips || ''
            }

            await api.addNATRule(hostName!, uuid!, data)
            message.success('NAT规则添加成功')
            setNatModalVisible(false)
            form.resetFields()
            loadNATRules()
        } catch (error: any) {
            message.error(error?.message || '添加失败')
        } finally {
            hide()
            setNatActionLoading(false)
            setOperationLocked(false)
        }
    }

    const handleDeleteNAT = async (index: number) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        showConfirmAction('删除NAT规则', '确定要删除该规则吗？', async () => {
            setNatActionLoading(true)
            setOperationLocked(true)
            const hide = message.loading('正在删除NAT规则...', 0)
            try {
                await api.deleteNATRule(hostName!, uuid!, index)
                message.success('NAT规则已删除')
                loadNATRules()
            } catch (error: any) {
                message.error(error?.message || '删除失败')
            } finally {
                hide()
                setNatActionLoading(false)
                setOperationLocked(false)
            }
        }, false)
    }

    const handleAddHDD = async (_values: any) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        const regex = /^[a-zA-Z0-9_]+$/
        if (!regex.test(_values.hdd_name)) {
            message.error('磁盘名称只能包含数字、字母和下划线');
            return
        }
        // 设置临时状态为配置中
        setTempStatus('configuring')
        setHddActionLoading(true)
        try {
            const result = await api.addHDD(hostName!, uuid!, {
                hdd_size: _values.hdd_size * 1024,
                hdd_type: _values.hdd_type
            })
            setHddModalVisible(false);
            hddForm.resetFields();
            submitAsyncTask(result, '添加数据盘', {
                onCompleted: () => loadHDDs(),
                onFailed: () => loadHDDs(),
            })
        } catch (error) {
            message.error('添加失败')
        } finally {
            setHddActionLoading(false)
        }
    }

    const handleMountHDD = async () => {
        if (!currentMountHdd) return
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setHddActionLoading(true)
        try {
            await withVmOffline('挂载数据盘', async () => {
                const result = await api.post(`/api/client/hdd/mount/${hostName}/${uuid}`, {
                    hdd_name: currentMountHdd.hdd_path,
                    hdd_size: currentMountHdd.hdd_num,
                    hdd_type: currentMountHdd.hdd_type
                })
                setMountHddModalVisible(false);
                setMountHddConfirmChecked(false);
                submitAsyncTask(result, '挂载数据盘', {
                    onCompleted: () => loadHDDs(),
                    onFailed: () => loadHDDs(),
                })
            })
        } catch (error) {
            message.error('挂载失败')
        } finally {
            setHddActionLoading(false)
        }
    }

    const handleUnmountHDD = async () => {
        if (!currentUnmountHdd) return
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setHddActionLoading(true)
        try {
            await withVmOffline('卸载数据盘', async () => {
                const result = await api.post(`/api/client/hdd/unmount/${hostName}/${uuid}`, {hdd_name: currentUnmountHdd.hdd_path})
                setUnmountHddModalVisible(false);
                setUnmountHddConfirmChecked(false);
                submitAsyncTask(result, '卸载数据盘', {
                    onCompleted: () => loadHDDs(),
                    onFailed: () => loadHDDs(),
                })
            })
        } catch (error) {
            message.error('卸载失败')
        } finally {
            setHddActionLoading(false)
        }
    }

    const handleDeleteHDD = async (hddPath: string) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        showConfirmAction('删除数据盘确认', `确定要删除数据盘 "${hddPath}" 吗？此操作不可恢复！`, async () => {
            const result = await api.delete(`/api/client/hdd/delete/${hostName}/${uuid}`, {data: {hdd_name: hddPath}})
            submitAsyncTask(result, '删除数据盘', {
                onCompleted: () => loadHDDs(),
                onFailed: () => loadHDDs(),
            })
        }, true)
    }

    const handleAddGpu = async (_values: any) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        // PCI直通需要关机检查
        const isRunning = vm?.config?.vm_flag === 'ON_START' || currentStatus?.ac_status === 'RUNNING'
        if (isRunning) {
            // 弹出关机确认
            setPendingPciAction(() => async () => {
                await executePciAdd(_values)
            })
            setPciShutdownConfirmChecked(false)
            setPciShutdownConfirmVisible(true)
            return
        }
        await executePciAdd(_values)
    }

    const executePciAdd = async (_values: any) => {
        setGpuActionLoading(true)
        try {
            const pciKey = _values.pci_key || selectedPciKey
            const device = pciDeviceList[pciKey]
            if (!device) {
                message.error('请选择一个PCI 设备')
                setGpuActionLoading(false)
                return
            }
            const result = await api.setupPCI(hostName!, uuid!, {
                pci_key: pciKey,
                gpu_uuid: device.gpu_uuid,
                gpu_mdev: device.gpu_mdev,
                gpu_hint: device.gpu_hint,
                action: 'add'
            })
            setGpuModalVisible(false)
            setSelectedPciKey('')
            submitAsyncTask(result, '添加PCI直通设备', {
                onCompleted: () => loadVMDetail(),
                onFailed: () => loadVMDetail(),
            })
        } catch (error: any) {
            message.error(error?.message || 'PCI直通添加失败')
        } finally {
            setGpuActionLoading(false)
        }
    }

    const handleDeleteGpu = async (gpuKey: string) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        const gpuConfig = vm?.config?.pci_all?.[gpuKey]
        const isRunning = vm?.config?.vm_flag === 'ON_START' || currentStatus?.ac_status === 'RUNNING'
        if (isRunning) {
            setPendingPciAction(() => async () => {
                await executePciRemove(gpuKey, gpuConfig)
            })
            setPciShutdownConfirmChecked(false)
            setPciShutdownConfirmVisible(true)
            return
        }
        showConfirmAction('删除PCI 设备确认', `确定要移除PCI直通设备 "${gpuConfig?.gpu_hint || gpuKey}" 吗？`, async () => {
            await executePciRemove(gpuKey, gpuConfig)
        }, true)
    }

    const executePciRemove = async (gpuKey: string, gpuConfig: any) => {
        try {
            const result = await api.setupPCI(hostName!, uuid!, {
                pci_key: gpuKey,
                gpu_uuid: gpuConfig?.gpu_uuid || '',
                gpu_mdev: gpuConfig?.gpu_mdev || '',
                gpu_hint: gpuConfig?.gpu_hint || '',
                action: 'remove'
            })
            submitAsyncTask(result, '移除PCI直通设备', {
                onCompleted: () => loadVMDetail(),
                onFailed: () => loadVMDetail(),
            })
        } catch (error: any) {
            message.error(error?.message || '移除失败')
        }
    }

    // 打开PCI 设备添加Modal时加载可用设备列表
    const handleOpenPciModal = async () => {
        setGpuModalVisible(true)
        setPciListLoading(true)
        setSelectedPciKey('')
        try {
            const res = await api.getPCIList(hostName!)
            if (res.code === 200 && res.data) {
                setPciDeviceList(res.data)
            } else {
                setPciDeviceList({})
            }
        } catch (e) {
            setPciDeviceList({})
            message.error('获取PCI 设备列表失败')
        } finally {
            setPciListLoading(false)
        }
    }

    // PCI关机确认后执行：关机 → 下发直通 → 重新启动
    const handlePciShutdownConfirm = async () => {
        setPciShutdownConfirmVisible(false)
        setPciShutdownConfirmChecked(false)
        const action = pendingPciAction
        setPendingPciAction(null)
        if (!action) return
        await withVmOffline('PCI直通配置', action)
    }

    const handleOpenTransferHDD = (hdd: HDDInfo) => {
        setCurrentTransferHdd(hdd);
        setTransferTargetUuid('');
        setTransferHddConfirmChecked(false);
        setTransferHddModalVisible(true)
    }

    const handleTransferHDD = async () => {
        if (!currentTransferHdd) return
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setHddActionLoading(true)
        const hide = message.loading('正在移交数据盘，请稍候...', 0)
        try {
            await api.post(`/api/client/hdd/transfer/${hostName}/${uuid}`, {
                hdd_name: currentTransferHdd.hdd_path,
                target_vm: transferTargetUuid
            })
            hide()
            message.success('数据盘移交成功，页面将自动刷新')
            setTransferHddModalVisible(false);
            setTransferHddConfirmChecked(false);
            // 移交成功后刷新页面
            setTimeout(() => {
                loadHDDs()
                loadVMDetail()
            }, 1500)
        } catch (error) {
            hide()
            message.error('数据盘移交失败')
        } finally {
            setHddActionLoading(false)
        }
    }

    const handleAddISO = async (_values: any) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setIsoActionLoading(true)
        try {
            // 名称由后端自动生成（iso-年月日时分秒）
            const result = await api.addISO(hostName!, uuid!, {
                iso_file: _values.iso_file,
                iso_hint: _values.iso_hint
            })
            setIsoModalVisible(false);
            isoForm.resetFields();
            setIsoMountConfirmChecked(false);
            submitAsyncTask(result, '挂载ISO镜像', {
                onCompleted: () => loadISOs(),
                onFailed: () => loadISOs(),
            })
            // 平台不支持热挂载时，必须真的重启，否则“提示了需重启”等于没做
            if (!hotISO && vmRunning) {
                await restartVMForApply('光盘已挂载')
            }
        } catch (error) {
            message.error('挂载失败')
        } finally {
            setIsoActionLoading(false)
        }
    }

    const executeUnmountISO = async () => {
        if (!currentUnmountIso) return
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setIsoActionLoading(true)
        try {
            const result = await api.deleteISO(hostName!, uuid!, currentUnmountIso)
            setUnmountIsoConfirmVisible(false);
            setUnmountIsoConfirmChecked(false);
            submitAsyncTask(result, '卸载ISO镜像', {
                onCompleted: () => loadISOs(),
                onFailed: () => loadISOs(),
            })
            if (!hotISO && vmRunning) {
                await restartVMForApply('光盘已卸载')
            }
        } catch (error) {
            message.error('卸载失败')
        } finally {
            setIsoActionLoading(false)
        }
    }

    const handleCreateBackup = async (_values: any) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setBackupActionLoading(true)
        setBackupModalVisible(false)
        backupForm.resetFields()
        setBackupCreateConfirmChecked(false)
        try {
            // 备份名：<虚拟机名>-backup-年月日时分秒（与后端兜底规则一致）
            const now = new Date()
            const pad = (n: number) => String(n).padStart(2, '0')
            const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
            const result = await api.createVMBackup(hostName!, uuid!, {vm_tips: `${uuid}-backup-${stamp}`})
            // 备份是分钟级长任务：后端已立即返回受理结果，
            // 真正的完成状态通过稍后刷新列表体现。
            message.success(result?.msg || '备份任务已提交，正在后台执行')
            setTimeout(() => loadBackups(), 5000)
        } catch (error) {
            message.error('创建备份失败')
        } finally {
            setBackupActionLoading(false)
        }
    }

    const executeRestoreBackup = async () => {
        if (!currentRestoreBackup) return
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        
        setBackupActionLoading(true)
        setRestoreBackupModalVisible(false)
        setRestoreConfirmChecked1(false)
        setRestoreConfirmChecked2(false)
        try {
            const result = await api.restoreVMBackup(hostName!, uuid!, currentRestoreBackup)
            submitAsyncTask(result, '还原备份', {
                onCompleted: () => {
                    loadBackups()
                    loadVMDetail()
                },
                onFailed: () => loadVMDetail(),
            })
        } catch (error) {
            message.error('还原备份失败')
        } finally {
            setBackupActionLoading(false)
        }
    }

    const handleDeleteBackup = async (backupName: string) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        showConfirmAction('删除备份确认', '确定要删除这个备份吗？此操作不可恢复！', async () => {
            await api.deleteVMBackup(hostName!, uuid!, backupName)
            loadBackups()
        }, true)
    }

    const handleAddOwner = async (_values: any) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setOwnerActionLoading(true)
        try {
            await api.addVMOwner(hostName!, uuid!, {username: _values.username})
            message.success('用户添加成功')
            setOwnerModalVisible(false);
            ownerForm.resetFields();
            loadOwners()
        } catch (error) {
            message.error('添加失败')
        } finally {
            setOwnerActionLoading(false)
        }
    }

    const handleDeleteOwner = async (username: string) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        showConfirmAction('删除用户确认', `确定要移除用户 "${username}" 吗？`, async () => {
            await api.deleteVMOwner(hostName!, uuid!, username)
            loadOwners()
        }, false)
    }

    // 更新用户虚拟机权限
    const handleUpdatePermission = async () => {
        if (!editPermOwner || !hostEnabled) return
        setOwnerActionLoading(true)
        try {
            await api.updateVMOwnerPermission(hostName!, uuid!, editPermOwner, editPermMask)
            message.success('权限更新成功')
            setEditPermModalVisible(false)
            loadOwners()
        } catch (error: any) {
            message.error(error?.message || '权限更新失败')
        } finally {
            setOwnerActionLoading(false)
        }
    }

    const handleTransferOwnership = async () => {
        if (!transferOwnerUsername) return
        if (!hostEnabled) { message.error('该主机已被禁用，无法操作'); return }
        setOwnerActionLoading(true)
        const hide = message.loading('正在移交所有权，请稍候...', 0)
        try {
            await api.post(`/api/client/owners/${hostName}/${uuid}/transfer`, {
                new_owner: transferOwnerUsername,
                keep_access: keepAccessChecked,
                confirm_transfer: transferOwnerConfirmChecked
            })
            hide()
            message.success('所有权移交成功，页面将自动刷新')
            setTransferOwnershipModalVisible(false);
            setTransferOwnerUsername('');
            setKeepAccessChecked(false);
            setTransferOwnerConfirmChecked(false);
            setTimeout(() => window.location.reload(), 1500)
        } catch (error: any) {
            hide()
            message.error(error?.message || '移交失败')
        } finally {
            setOwnerActionLoading(false)
        }
    }

    const handleReinstall = async (values: any) => {
        if (!hostEnabled) { message.error('该主机已被禁用，无法重装系统'); return }
        showConfirmAction('重装系统确认', '确定要重装系统吗？此操作将清空所有数据！', async () => {
            // 设置临时状态为安装中
            setTempStatus('ON_INSTALL')
            setReinstallActionLoading(true)
            
            // 设置10分钟超时
            const timeoutId = setTimeout(() => {
                setTempStatus(null)
                setOperationLocked(false)
                setReinstallActionLoading(false)
                message.error('操作超时，请检查虚拟机状态')
                loadVMDetail()
            }, 10 * 60 * 1000)
            setOperationTimeoutId(timeoutId)
            
            try {
                await api.reinstallVM(hostName!, uuid!, values)
                // 操作完成后，清除临时状态
                setTempStatus(null)
                setReinstallModalVisible(false);
                reinstallForm.resetFields()
            } catch (error) {
                // 操作失败，清除临时状态
                setTempStatus(null)
                throw error
            } finally {
                setReinstallActionLoading(false)
            }
        }, true)
    }

    const handleUpdateVM = async (values: any) => {
        // 检查主机是否被禁用
        if (!hostEnabled) {
            message.error('该主机已被禁用，无法修改虚拟机配置')
            return
        }
        
        if (values.os_pass && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(values.os_pass)) {
            message.error('系统密码必须至少8位，且包含字母和数字');
            return
        }
        if (values.vc_pass && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(values.vc_pass)) {
            message.error('VNC密码必须至少8位，且包含字母和数字');
            return
        }
        setPendingEditValues(values);
        setSaveConfirmChecked(false);
        setSaveConfirmModalVisible(true)
    }

    const handleConfirmUpdateVM = async () => {
        if (!pendingEditValues) return
        
        // 设置临时状态为修改中
        setTempStatus('ON_CONFIG')
        setOperationLocked(true)
        
        try {
            const nicAll: any = {}
            editNicList.forEach(nic => {
                if (nic.name) nicAll[nic.name] = {nic_type: nic.type, ip4_addr: nic.ip, ip6_addr: nic.ip6}
            })
            const updateData = {
                ...pendingEditValues,
                speed_u: pendingEditValues.speed_up,
                speed_d: pendingEditValues.speed_down,
                nic_all: nicAll
            }
            delete updateData.speed_up;
            delete updateData.speed_down
            const result = await api.updateVM(hostName!, uuid!, updateData)
            
            // 异步任务模式：收到task_id后启动轮询并锁定操作
            setSaveConfirmModalVisible(false);
            setEditModalVisible(false);
            setPendingEditValues(null);
            submitAsyncTask(result, '修改虚拟机配置', {
                onCompleted: () => {
                    setTempStatus(null)
                    loadVMDetail()
                },
                onFailed: () => {
                    setTempStatus(null)
                },
            })
        } catch (error) {
            setTempStatus(null)
            setOperationLocked(false)
            message.error('配置更新失败')
        }
    }

    const addEditNic = () => {
        const newId = editNicList.length > 0 ? Math.max(...editNicList.map(n => n.id)) + 1 : 0
        setEditNicList([...editNicList, {id: newId, name: `ethernet${newId}`, type: 'nat', ip: '', ip6: ''}])
    }
    const removeEditNic = (id: number) => setEditNicList(editNicList.filter(n => n.id !== id))
    const updateEditNic = (id: number, field: string, value: any) => setEditNicList(editNicList.map(n => n.id === id ? {
        ...n,
        [field]: value
    } : n))

    const getStatusText = (status: string | undefined) => {
        if (!status) return '未知'
        return ({
            running: '运行中', started: '运行中', STARTED: '运行中',
            stopped: '已停止', STOPPED: '已停止',
            paused: '已暂停', suspend: '已暂停', SUSPEND: '已暂停',
            starting: '启动中',
            stopping: '关机中',
            restarting: '重启中',
            resuming: '恢复中',
            pausing: '暂停中',
            configuring: '配置中',
            backing_up: '备份中',
            restoring: '还原中',
            reinstalling: '重装中',
            error: '错误',
            unknown: '未知', UNKNOWN: '未知',
            // 新的中间状态
            ON_OPEN: '启动中',
            ON_STOP: '关机中',
            ON_SAVE: '暂停中',
            ON_WAKE: '唤醒中',
            ON_PASSWD: '改密中',
            ON_CONFIG: '修改中',
            ON_INSTALL: '安装中',
            ON_BACKUP: '备份中',
            ON_RESTORE: '还原中',
            // 旧的中间状态（兼容）
            on_open: '启动中',
            on_stop: '关机中',
            on_save: '暂停中',
            on_wake: '唤醒中'
        }[status] || status)
    }

    // 根据状态获取Badge颜色
    const getStatusColor = (status: string | undefined) => {
        if (!status) return 'default'
        const lowerStatus = status.toLowerCase()
        // 中间状态显示黄色（processing）
        if (['starting', 'stopping', 'restarting', 'resuming', 'pausing', 'configuring', 'backing_up', 'restoring',
             'on_open', 'on_stop', 'on_save', 'on_wake',
             'ON_OPEN', 'ON_STOP', 'ON_SAVE', 'ON_WAKE', 'ON_PASSWD', 'ON_CONFIG', 'ON_INSTALL', 'ON_BACKUP', 'ON_RESTORE'].includes(status)) {
            return 'processing'
        }
        // 已关机显示灰色
        if (['stopped', 'STOPPED'].includes(status)) {
            return 'default'
        }
        // 重装中显示红色
        if (['reinstalling'].includes(status)) {
            return 'error'
        }
        // 运行中显示绿色
        if (['running', 'started'].includes(lowerStatus)) {
            return 'success'
        }
        // 已暂停显示灰色
        if (['paused', 'suspend'].includes(lowerStatus)) {
            return 'default'
        }
        // 错误显示红色
        if (['error'].includes(lowerStatus)) {
            return 'error'
        }
        // 其他状态显示灰色
        return 'default'
    }

    const getChartOption = (title: string, data: number[], color: string, labels?: string[], unit: string = '%') => {
        return ({
        backgroundColor: 'transparent',
        title: {text: title, left: 'center', textStyle: {fontSize: 12, fontWeight: 'normal', color: themePalette.gray[600]}},
        tooltip: {
            backgroundColor: themePalette.elevatedBg,
            borderColor: themePalette.cardBorder,
            textStyle: {color: themePalette.gray[900]},
            trigger: 'axis',
            formatter: (params: any[]) => `${params[0].axisValue}<br/>${params[0].marker}${params[0].seriesName}: ${params[0].value}${unit}`
        },
        grid: {left: '3%', right: '4%', bottom: '3%', top: '30px', containLabel: true},
        xAxis: {
            type: 'category', boundaryGap: false, data: labels,
            axisLabel: {color: themePalette.gray[600]},
            axisLine: {lineStyle: {color: themePalette.cardBorder}},
            axisTick: {show: false},
        },
        yAxis: {
            type: 'value',
            max: unit === '%' ? 100 : undefined,
            axisLabel: {formatter: `{value}${unit}`, fontSize: 10, color: themePalette.gray[600]},
            splitLine: {lineStyle: {color: themePalette.cardBorder}},
        },
        series: [{
            name: title,
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: data,
            areaStyle: {
                color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [{offset: 0, color: color + '80'}, {offset: 1, color: color + '10'}]
                }
            },
            lineStyle: {color: color, width: 2},
            itemStyle: {color: color}
        }]
    })}

    // 计算最终显示的状态，优先使用临时状态
    const displayStatus = tempStatus || currentStatus.ac_status
    
    // 判断当前状态是否允许操作
    const isIntermediateState = () => {
        const status = displayStatus || currentStatus.ac_status;
        // 中间状态：停止中、启动中、暂停中、唤醒中
        return ['ON_STOP', 'ON_OPEN', 'ON_SAVE', 'ON_WAKE'].includes(status);
    };
    
    // 判断是否为暂停状态（只允许恢复）
    const isSuspendedState = () => {
        const status = displayStatus || currentStatus.ac_status;
        return status === 'SUSPEND';
    };

    if (loading || !vm) return <div className="p-20 flex justify-center"><Spin size="large">
        <div style={{marginTop: 8}}>加载虚拟机详情...</div>
    </Spin></div>

    const config = vm.config || {}

    const actionMenu: MenuProps = {
        items: [
            {
                key: 'power', label: '电源操作', icon: <PoweroffOutlined/>, children: [
                    {
                        key: 'start',
                        label: '启动系统',
                        onClick: () => handlePowerAction('start'),
                        disabled: currentStatus.ac_status === 'STARTED' || !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)
                    },
                    {
                        key: 'stop',
                        label: '关闭系统',
                        onClick: () => handlePowerAction('stop'),
                        disabled: currentStatus.ac_status !== 'STARTED' || !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)
                    },
                    {
                        key: 'pause',
                        label: '暂停运行',
                        onClick: () => handlePowerAction('pause'),
                        disabled: currentStatus.ac_status !== 'STARTED' || !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)
                    },
                    {
                        key: 'resume',
                        label: '恢复运行',
                        onClick: () => handlePowerAction('resume'),
                        disabled: currentStatus.ac_status !== 'SUSPEND' || !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)
                    },
                    {key: 'force_stop', label: '强制关机', onClick: () => handlePowerAction('hard_stop'), danger: true, disabled: !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)},
                    {
                        key: 'force_reset',
                        label: '强制重启',
                        onClick: () => handlePowerAction('hard_reset'),
                        danger: true,
                        disabled: !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)
                    },
                ]
            },
{key: 'delete', label: '删除实例', icon: <DeleteOutlined/>, danger: true, onClick: handleDelete, disabled: !hasPermission(userPermissions, VM_PERMISSION.VM_DELETE) || !user?.can_delete_vm}
        ]
    };

    const ResourceCard = ({title, icon, value, percent, color}: any) => (
        <div className="art-metric">
            <div className="art-metric-head">
                <span className="art-metric-name" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{icon}{title}</span>
                <span className="art-metric-value">{value} · {percent}%</span>
            </div>
            <Progress percent={Math.min(percent, 100)} size="small" showInfo={false} strokeColor={color}/>
        </div>
    )

    const formatMemory = (mb: number) => {
        if (mb < 1024) return mb + ' MB'
        if (mb < 1024 * 1024) return (mb / 1024).toFixed(2) + ' GB'
        return (mb / 1024 / 1024).toFixed(2) + ' TB'
    }

    const formatDisk = (mb: number) => {
        if (mb < 1024) return mb + ' MB'
        if (mb < 1024 * 1024) return (mb / 1024).toFixed(2) + ' GB'
        return (mb / 1024 / 1024).toFixed(2) + ' TB'
    }

    const getProgressBarColor = (percent: number) => {
        if (percent < 50) return themePalette.success
        if (percent < 70) return themePalette.warning
        if (percent < 90) return themePalette.chartColors[2]
        return themePalette.danger
    }

    const infoField = (label: string, content: ReactNode, options?: { mono?: boolean }) => (
        <div className="vm-classic-property" key={label}>
            <span className="vm-classic-property-label">{label}</span>
            <div className={`vm-classic-property-value${options?.mono ? ' is-mono' : ''}`}>{content}</div>
        </div>
    )

    const powerLocked = isIntermediateState() || !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)
    const powerToggleLabel = currentStatus.ac_status === 'STOPPED' ? '启动' : '关机'
    const pauseToggleLabel = currentStatus.ac_status === 'SUSPEND' ? '恢复' : '暂停'
    const pauseToggleDisabled = powerLocked
    const restartDisabled = powerLocked || (currentStatus.ac_status !== 'STARTED' && currentStatus.ac_status !== 'SUSPEND')
    const hardPowerDisabled = restartDisabled

    const isCompactViewport = window.innerWidth < 768

    const overviewTab = (
        <Row className="vm-classic-overview-row" gutter={[16, 16]}>
            {/* 左侧面板：信息 + 配置 */}
            <Col xs={24} xxl={16}>
                <div className="space-y-6">
                    {/* 机器信息区域 */}
                    <FoldCard title="实例信息" defaultOpen={!isCompactViewport}>
                        <Row gutter={[16, 16]} className="vm-classic-instance-details-row">
                            <Col xs={24}>
                                <div className="vm-classic-property-grid">
                                    {infoField('实例名称', config.vm_uuid, { mono: true })}
                                    {infoField('实例状态', <Badge status={getStatusColor(displayStatus)} text={getStatusText(displayStatus)} />)}
                                    {infoField('系统密码',
                                        hasPermission(userPermissions, VM_PERMISSION.PWD_EDITS) ? (
                                            <div className="vm-classic-secret-control">
                                                <span className="vm-classic-secret-text font-mono">{showPassword ? config.os_pass : '••••••••'}</span>
                                                <span className="vm-classic-secret-actions">
                                                    <EyeOutlined aria-label={showPassword ? '隐藏系统密码' : '显示系统密码'} className="cursor-pointer" onClick={() => setShowPassword(!showPassword)}/>
                                                    <CopyOutlined aria-label="复制系统密码" className="cursor-pointer" onClick={() => handleCopyPassword(config.os_pass || '', '系统')}/>
                                                    <EditOutlined aria-label="修改系统密码" className="cursor-pointer text-blue-500" onClick={() => { setPasswordActionType('os_password'); setPasswordModalVisible(true) }}/>
                                                </span>
                                            </div>
                                        ) : <span className="vm-classic-property-muted">无权限查看</span>
                                    )}
                                    {infoField('远程密码',
                                        hasPermission(userPermissions, VM_PERMISSION.VNC_EDITS) ? (
                                            <div className="vm-classic-secret-control">
                                                <span className="vm-classic-secret-text font-mono">{showVncPassword ? config.vc_pass : '••••••••'}</span>
                                                <span className="vm-classic-secret-actions">
                                                    <EyeOutlined aria-label={showVncPassword ? '隐藏远程密码' : '显示远程密码'} className="cursor-pointer" onClick={() => setShowVncPassword(!showVncPassword)}/>
                                                    <CopyOutlined aria-label="复制远程密码" className="cursor-pointer" onClick={() => handleCopyPassword(config.vc_pass || '', 'VNC')}/>
                                                    <EditOutlined aria-label="修改远程密码" className="cursor-pointer text-blue-500" onClick={() => { setPasswordActionType('vnc_password'); setPasswordModalVisible(true) }}/>
                                                </span>
                                            </div>
                                        ) : <span className="vm-classic-property-muted">无权限查看</span>
                                    )}
                                    {infoField('主机名称', hostName, { mono: true })}
                                    {infoField('操作系统', getOSDisplayName(config.os_name || ''))}
                                    {infoField('IPv4 地址', vm.ipv4_address || '未分配', { mono: true })}
                                    {infoField('IPv6 地址', vm.ipv6_address || '未分配', { mono: true })}
                                    {infoField('VNC 端口', config.vc_port || '未设置', { mono: true })}
                                    {infoField('端口数量', `${config.nat_num || 0} 个`)}
                                    {infoField('上行带宽', `${config.speed_u || 0} Mbps`)}
                                    {infoField('下行带宽', `${config.speed_d || 0} Mbps`)}
                                </div>
                            </Col>
                        </Row>
                    </FoldCard>

                    <div className="vm-classic-info-visual vm-classic-info-visual--standalone">
                                <div className="vm-classic-info-screenshot">
                                    {(() => {
                                        const serverType = hostConfig?.server_type || '';
                                        if (serverType === 'OCInterface' || serverType === 'LxContainer') {
                                            return (
                                                <div className="text-center flex flex-col items-center justify-center">
                                                    <div style={{
                                                        width: 240, height: 120,
                                                        background: 'var(--art-sunken-bg)',
                                                        borderRadius: 8,
                                                        display: 'flex', flexDirection: 'column',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        border: '2px solid var(--art-card-border)',
                                                        position: 'relative',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            position: 'absolute', top: 0, left: 0, right: 0,
                                                            height: 16, background: 'var(--art-card-border)',
                                                            display: 'flex', alignItems: 'center', paddingLeft: 6, gap: 3
                                                        }}>
                                                            <span style={{width: 6, height: 6, borderRadius: '50%', background: '#ff5f57'}}/>
                                                            <span style={{width: 6, height: 6, borderRadius: '50%', background: '#febc2e'}}/>
                                                            <span style={{width: 6, height: 6, borderRadius: '50%', background: '#28c840'}}/>
                                                        </div>
                                                        <CodeOutlined style={{fontSize: 28, color: 'var(--art-success)', marginTop: 8}}/>
                                                        <div style={{fontSize: 9, color: 'var(--art-success)', fontFamily: 'monospace', marginTop: 2}}>Shell</div>
                                                    </div>
                                                    <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>此虚拟机所属的物理机不提供桌面截图</div>
                                                </div>
                                            );
                        } else if (currentStatus.ac_status === 'STARTED') {
                            return (
                                <div
                                    className="w-full h-full flex items-center justify-center relative overflow-hidden">
                                    <Spin spinning={loadingScreenshot} tip={<span style={{whiteSpace: 'nowrap'}}>获取截图中...</span>}>
                                        {screenshotError ? (
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">📷</div>
                                                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>无法获取截图</div>
                                            </div>
                                        ) : (
                                            vmScreenshot && (
                                                <img
                                                    src={vmScreenshot}
                                                    alt="虚拟机截图"
                                                    style={{
                                                        maxWidth: '320px',
                                                        maxHeight: '180px',
                                                        aspectRatio: '16/9',
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            )
                                        )}
                                    </Spin>
                                </div>
                            );
                                        } else {
                                            return (
                                                <div className="text-center">
                                                    <div
                                                        className="text-4xl mb-2">{getOSIcon(config.os_name || '')}</div>
                                                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>虚拟机未运行，无法获取截图
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                                <div className="vm-classic-action-groups">
                                  <section className="vm-classic-action-group">
                                    <div className="vm-classic-power-grid">
                                      <Dropdown
                                        trigger={['click']}
                                        menu={{
                                          items: [
                                            { key: 'start', label: '启动', icon: <PlayCircleOutlined/>, disabled: powerLocked, onClick: () => handlePowerAction('start') },
                                            { key: 'stop', label: '关机', icon: <PoweroffOutlined/>, danger: true, disabled: powerLocked, onClick: () => handlePowerAction('stop') },
                                          ],
                                        }}
                                      >
                                        <Button size="small" className="vm-classic-split-btn" icon={currentStatus.ac_status === 'STOPPED' ? <PlayCircleOutlined/> : <PoweroffOutlined/>} block disabled={powerLocked}>
                                          <span className="vm-classic-action-label">{powerToggleLabel}</span>
                                          <DownOutlined className="vm-classic-split-caret"/>
                                        </Button>
                                      </Dropdown>

                                      <Dropdown
                                        trigger={['click']}
                                        menu={{
                                          items: [
                                            { key: 'reset', label: '重启', icon: <ReloadOutlined/>, disabled: restartDisabled, onClick: () => handlePowerAction('reset') },
                                            { key: 'hard_reset', label: '强制重启', icon: <ReloadOutlined/>, danger: true, disabled: restartDisabled, onClick: () => handlePowerAction('hard_reset') },
                                          ],
                                        }}
                                      >
                                        <Button size="small" className="vm-classic-split-btn" icon={<ReloadOutlined/>} block disabled={restartDisabled}>
                                          <span className="vm-classic-action-label">重启</span>
                                          <DownOutlined className="vm-classic-split-caret"/>
                                        </Button>
                                      </Dropdown>

                                      <Button size="small" danger icon={<PoweroffOutlined/>} block disabled={hardPowerDisabled}
                                              onClick={() => handlePowerAction('hard_stop')}>
                                        <span className="vm-classic-action-label">强制关机</span>
                                      </Button>

                                      <Dropdown
                                        trigger={['click']}
                                        menu={{
                                          items: [
                                            { key: 'pause', label: '暂停', icon: <PauseCircleOutlined/>, disabled: powerLocked, onClick: () => handlePowerAction('pause') },
                                            { key: 'resume', label: '恢复', icon: <PlayCircleOutlined/>, disabled: powerLocked, onClick: () => handlePowerAction('resume') },
                                          ],
                                        }}
                                      >
                                        <Button size="small" className="vm-classic-split-btn" icon={currentStatus.ac_status === 'SUSPEND' ? <PlayCircleOutlined/> : <PauseCircleOutlined/>} block disabled={pauseToggleDisabled}>
                                          <span className="vm-classic-action-label">{pauseToggleLabel}</span>
                                          <DownOutlined className="vm-classic-split-caret"/>
                                        </Button>
                                      </Dropdown>

                                      <Button size="small" danger icon={<CloudSyncOutlined/>} block
                                              disabled={!hasPermission(userPermissions, VM_PERMISSION.SYS_EDITS)}
                                              onClick={() => setReinstallModalVisible(true)}>
                                        <span className="vm-classic-action-label">重装</span>
                                      </Button>

                                      <Button size="small" danger icon={<DeleteOutlined/>} block
                                              disabled={!hasPermission(userPermissions, VM_PERMISSION.VM_DELETE) || !user?.can_delete_vm}
                                              onClick={handleDelete}>
                                        <span className="vm-classic-action-label">删除</span>
                                      </Button>

                                      <Button size="small" type="primary" icon={<DesktopOutlined/>} block
                                              disabled={!hasPermission(userPermissions, VM_PERMISSION.VNC_EDITS)}
                                              onClick={handleOpenVNC}>
                                        <span className="vm-classic-action-label">VNC</span>
                                      </Button>

                                      <Button size="small" icon={<EditOutlined/>} block
                                              disabled={operationLocked || isIntermediateState() || isSuspendedState() ||
                                                        !hasPermission(userPermissions, VM_PERMISSION.VM_MODIFY) || !user?.can_modify_vm}
                                              onClick={() => setEditModalVisible(true)}>
                                        <span className="vm-classic-action-label">编辑</span>
                                      </Button>

                                      <Button size="small" icon={<KeyOutlined/>} block
                                              disabled={!hasPermission(userPermissions, VM_PERMISSION.PWD_EDITS)}
                                              onClick={() => setPasswordModalVisible(true)}>
                                        <span className="vm-classic-action-label">改密</span>
                                      </Button>
                                    </div>
                                  </section>
                                </div>
                    </div>

                    {/* 实例配置区域 */}
                    <FoldCard title="实例配置" defaultOpen={!isCompactViewport} className="vm-classic-resource-config">
                        <Row gutter={[16, 16]} className="vm-classic-resource-grid">
                            <Col xs={24} sm={12} xl={8} className="vm-classic-resource-group">
                                <div className="space-y-4 vm-classic-resource-stack">
                                    <ResourceCard title="CPU" icon={<AreaChartOutlined className="text-blue-500"/>}
                                                  value={`${config.cpu_num || 0} 核`} subValue="利用率"
                                                  percent={currentStatus.cpu_usage || 0}
                                                  color={getProgressBarColor(currentStatus.cpu_usage || 0)}/>
                                    <ResourceCard title="RAM" icon={<DesktopOutlined className="text-green-500"/>}
                                                  value={`已用 ${formatMemory(currentStatus.mem_usage || 0)} / ${formatMemory(config.mem_num || 0)}`}
                                                  subValue="使用率"
                                                  percent={config.mem_num > 0 ? Math.round((currentStatus.mem_usage || 0) / config.mem_num * 100) : 0}
                                                  color={getProgressBarColor(config.mem_num > 0 ? Math.round((currentStatus.mem_usage || 0) / config.mem_num * 100) : 0)}/>
                                    <ResourceCard title="GPU" icon={<DesktopOutlined className="text-purple-500"/>}
                                                  value={`已用 ${formatMemory(currentStatus.gpu_total || 0)} / ${formatMemory(config.gpu_mem || 0)}`}
                                                  subValue="使用率"
                                                  percent={config.gpu_mem > 0 ? Math.round((currentStatus.gpu_total || 0) / config.gpu_mem * 100) : 0}
                                                  color={getProgressBarColor(config.gpu_mem > 0 ? Math.round((currentStatus.gpu_total || 0) / config.gpu_mem * 100) : 0)}/>
                                </div>
                            </Col>
                            <Col xs={24} sm={12} xl={8} className="vm-classic-resource-group">
                                <div className="space-y-4 vm-classic-resource-stack">
                                    <ResourceCard title="系统盘" icon={<HddOutlined className="text-yellow-500"/>}
                                                  value={`已用 ${formatDisk(currentStatus.hdd_usage || 0)} / ${formatDisk(config.hdd_num || 0)}`}
                                                  subValue="使用率"
                                                  percent={config.hdd_num > 0 ? Math.round((currentStatus.hdd_usage || 0) / config.hdd_num * 100) : 0}
                                                  color={getProgressBarColor(config.hdd_num > 0 ? Math.round((currentStatus.hdd_usage || 0) / config.hdd_num * 100) : 0)}/>
                                    <ResourceCard title="流量" icon={<AreaChartOutlined className="text-red-500"/>}
                                                  value={`已用 ${formatDisk(currentStatus.flu_usage || 0)} / ${config.flu_num > 0 ? formatDisk(config.flu_num) : '∞'}`}
                                                  subValue="使用率"
                                                  percent={config.flu_num > 0 ? Math.round((currentStatus.flu_usage || 0) / config.flu_num * 100) : 0}
                                                  color={getProgressBarColor(config.flu_num > 0 ? Math.round((currentStatus.flu_usage || 0) / config.flu_num * 100) : 0)}/>
                                    <ResourceCard title="端口" icon={<GlobalOutlined className="text-indigo-500"/>}
                                                  value={`已用 ${config.nat_all ? Object.keys(config.nat_all).length : 0} / ${config.nat_num || 0} 个`}
                                                  subValue="使用率"
                                                  percent={config.nat_num > 0 ? Math.round((config.nat_all ? Object.keys(config.nat_all).length : 0) / config.nat_num * 100) : 0}
                                                  color={getProgressBarColor(config.nat_num > 0 ? Math.round((config.nat_all ? Object.keys(config.nat_all).length : 0) / config.nat_num * 100) : 0)}/>
                                </div>
                            </Col>
                            <Col xs={24} sm={12} xl={8} className="vm-classic-resource-group">
                                <div className="space-y-4 vm-classic-resource-stack">
                                    <ResourceCard title="上行带宽" icon={<CloudSyncOutlined className="text-cyan-500"/>}
                                                  value={`已用 ${currentStatus.network_u || 0} / ${config.speed_u || 0} Mbps`}
                                                  subValue="使用率"
                                                  percent={config.speed_u > 0 ? Math.round((currentStatus.network_u || 0) / config.speed_u * 100) : 0}
                                                  color={getProgressBarColor(config.speed_u > 0 ? Math.round((currentStatus.network_u || 0) / config.speed_u * 100) : 0)}/>
                                    <ResourceCard title="下行带宽" icon={<CloudSyncOutlined className="text-cyan-600"/>}
                                                  value={`已用 ${currentStatus.network_d || 0} / ${config.speed_d || 0} Mbps`}
                                                  subValue="使用率"
                                                  percent={config.speed_d > 0 ? Math.round((currentStatus.network_d || 0) / config.speed_d * 100) : 0}
                                                  color={getProgressBarColor(config.speed_d > 0 ? Math.round((currentStatus.network_d || 0) / config.speed_d * 100) : 0)}/>
                                    <ResourceCard title="反向代理" icon={<GlobalOutlined className="text-pink-500"/>}
                                                  value={`已用 ${config.web_all ? Object.keys(config.web_all).length : 0} / ${config.web_num || 0} 个`}
                                                  subValue="使用率"
                                                  percent={config.web_num > 0 ? Math.round((config.web_all ? Object.keys(config.web_all).length : 0) / config.web_num * 100) : 0}
                                                  color={getProgressBarColor(config.web_num > 0 ? Math.round((config.web_all ? Object.keys(config.web_all).length : 0) / config.web_num * 100) : 0)}/>
                                </div>
                            </Col>
                        </Row>

                        {/* 网络配置 */}
                        <Divider style={{margin: '12px 0 8px'}}/>
                        <Descriptions className="vm-classic-properties vm-classic-network-properties" title="网络配置" size="small" column={{ xs: 1, sm: 2, xl: 3 }} bordered>
                            <Descriptions.Item label="上行带宽">{config.speed_u || 0} Mbps</Descriptions.Item>
                            <Descriptions.Item label="下行带宽">{config.speed_d || 0} Mbps</Descriptions.Item>
                            <Descriptions.Item label="端口配额">{config.nat_num || 0} 个</Descriptions.Item>
                            <Descriptions.Item label="代理配额">{config.web_num || 0} 个</Descriptions.Item>
                            <Descriptions.Item label="流量配额">{config.flu_num > 0 ? formatDisk(config.flu_num) : '无限制'}</Descriptions.Item>
                            <Descriptions.Item label="重置周期">{config.flu_rst?.[0] || 31} 天</Descriptions.Item>
                            <Descriptions.Item label="超限速率">{config.flu_rst?.[1] || 0} Mbps</Descriptions.Item>
                            <Descriptions.Item label="上次重置">{config.flu_rst?.[2] ? (config.flu_rst[2] > 100 ? new Date(config.flu_rst[2] * 1000).toLocaleDateString() : '-') : '-'}</Descriptions.Item>
                        </Descriptions>
                        <br></br>
                        {/* 配额配置 */}
                        <Divider style={{margin: '12px 0 8px'}}/>
                        <Descriptions className="vm-classic-properties vm-classic-quota-properties" title="配额配置" size="small" column={{ xs: 1, sm: 2, xl: 3 }} bordered>
                            <Descriptions.Item label="备份配额">{config.bak_num ?? 1}</Descriptions.Item>
                            <Descriptions.Item label="光盘配额">{config.iso_num ?? 1}</Descriptions.Item>
                            <Descriptions.Item label="PCI 配额">{config.pci_num ?? 0}</Descriptions.Item>
                            <Descriptions.Item label="USB 配额">{config.usb_num ?? 0}</Descriptions.Item>
                            <Descriptions.Item label="数据盘配额">{config.dat_num ?? 1}</Descriptions.Item>
                            <Descriptions.Item label="数据盘容量">{config.dat_all ? formatDisk(config.dat_all) : 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="处理器配额">{config.cpu_per ? `${config.cpu_per}%` : 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="系统盘IOPS">{config.hdd_iop || 0}</Descriptions.Item>
                        </Descriptions>
                    </FoldCard>
                </div>
            </Col>

            {/* 右侧面板：历史资源用量 */}
            <Col xs={24} xxl={8} style={{padding: 0}}>
                <Card title="资源用量" size="small" variant="borderless" className="shadow-sm glass-card-transparent h-full vm-classic-resource-history" style={{padding: '0'}}
                      extra={
                          <Radio.Group value={timeRange} onChange={e => setTimeRange(e.target.value)} size="small"
                                       optionType="button" buttonStyle="solid">
                              <Radio.Button value={30}>30分</Radio.Button>
                              <Radio.Button value={180}>3时</Radio.Button>
                              <Radio.Button value={360}>6时</Radio.Button>
                              <Radio.Button value={1440}>24时</Radio.Button>
                              <Radio.Button value={4320}>3天</Radio.Button>
                              <Radio.Button value={10080}>7天</Radio.Button>
                              <Radio.Button value={21600}>15天</Radio.Button>
                              <Radio.Button value={43200}>30天</Radio.Button>
                          </Radio.Group>
                      }
                >
                    <div className="mb-4 text-center">
                        <Radio.Group value={chartView} onChange={e => setChartView(e.target.value)} size="small">
                            <Radio.Button value="performance">性能</Radio.Button>
                            <Radio.Button value="resource">资源</Radio.Button>
                            <Radio.Button value="network">网络</Radio.Button>
                        </Radio.Group>
                    </div>

                    <div className="space-y-4 flex flex-col" style={{padding: '0'}}>
                        {chartView === 'performance' && (
                            <>
                                <div className="dock-detail-chart-panel vm-classic-history-chart">
                                    <ReactECharts
                                        option={getChartOption('CPU使用率', monitorData.cpu, themePalette.chartColors[0], monitorData.labels)}
                                        style={{height: '100%', width: '100%'}}
                                        notMerge={true}
                                    />
                                </div>
                                <div className="dock-detail-chart-panel vm-classic-history-chart">
                                    <ReactECharts
                                        option={getChartOption('RAM使用率', monitorData.memory, themePalette.chartColors[2], monitorData.labels)}
                                        style={{height: '100%', width: '100%'}}
                                        notMerge={true}
                                    />
                                </div>
                                <div className="dock-detail-chart-panel vm-classic-history-chart">
                                    <ReactECharts
                                        option={getChartOption('GPU使用率', monitorData.gpu, themePalette.chartColors[3], monitorData.labels, 'MB')}
                                        style={{height: '100%', width: '100%'}}
                                        notMerge={true}
                                    />
                                </div>
                            </>
                        )}
                        {chartView === 'resource' && (
                            <>
                                <div className="dock-detail-chart-panel vm-classic-history-chart">
                                    <ReactECharts
                                        option={getChartOption('硬盘使用率', monitorData.disk, themePalette.chartColors[1], monitorData.labels)}
                                        style={{height: '100%', width: '100%'}}
                                        notMerge={true}
                                    />
                                </div>
                                <div className="dock-detail-chart-panel vm-classic-history-chart">
                                    <ReactECharts
                                        option={getChartOption('流量使用率', monitorData.traffic, themePalette.chartColors[5], monitorData.labels, 'GB')}
                                        style={{height: '100%', width: '100%'}}
                                        notMerge={true}
                                    />
                                </div>
                                <div className="dock-detail-chart-panel vm-classic-history-chart">
                                    <ReactECharts
                                        option={getChartOption('端口使用数', monitorData.nat, themePalette.chartColors[4], monitorData.labels, '个')}
                                        style={{height: '100%', width: '100%'}}
                                        notMerge={true}
                                    />
                                </div>
                            </>
                        )}
                        {chartView === 'network' && (
                            <>
                                <div className="dock-detail-chart-panel vm-classic-history-chart">
                                    <ReactECharts
                                        option={getChartOption('上行带宽率', monitorData.netUp, themePalette.chartColors[6], monitorData.labels, 'Mbps')}
                                        style={{height: '100%', width: '100%'}}
                                        notMerge={true}
                                    />
                                </div>
                                <div className="dock-detail-chart-panel vm-classic-history-chart">
                                    <ReactECharts
                                        option={getChartOption('下行带宽率', monitorData.netDown, themePalette.chartColors[7], monitorData.labels, 'Mbps')}
                                        style={{height: '100%', width: '100%'}}
                                        notMerge={true}
                                    />
                                </div>
                                <div className="dock-detail-chart-panel vm-classic-history-chart">
                                    <ReactECharts
                                        option={getChartOption('反向代理数', monitorData.proxy, themePalette.chartColors[3], monitorData.labels, '个')}
                                        style={{height: '100%', width: '100%'}}
                                        notMerge={true}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </Col>
        </Row>
    );

    // 访问密钥等价于该虚拟机的长期登录凭据：仅管理员与主所有者可管理，
    // 且受限临时身份（临时凭据/访问密钥登录）一律不可见，避免被再次转授。
    const canManageAccessKey = isAdminUser || (isOwnerOrAdmin && !(user as any)?.temp_login)

    const tabItems = [
        {key: 'overview', label: '实例概览', children: overviewTab},
        {
            key: 'ip',
            label: '网卡管理',
            children: <Card title="网卡列表" extra={<Space>
                                <Segmented
                                    value={nicViewMode}
                                    onChange={(val) => setNicViewMode(val as 'card' | 'table')}
                                    options={[
                                        { value: 'card', icon: <AppstoreOutlined /> },
                                        { value: 'table', icon: <UnorderedListOutlined /> },
                                    ]}
                                    size="small"
                                />
                                <Button type="primary" icon={<PlusOutlined/>}
                                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.NIC_EDITS) || isQuotaExhausted(config.nic_num, config.nic_all ? Object.keys(config.nic_all).length : 0)}
                                                            onClick={() => setIpModalVisible(true)}>添加网卡</Button>
                            </Space>}
                            variant="borderless">
                {vm && vm.config && vm.config.nic_all && Object.keys(vm.config.nic_all).length > 0 ? (
                    nicViewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(vm.config.nic_all).map(([nicName, nicConfig]: [string, any]) => (
                            <div key={nicName} className="glass-card">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded">
                                            {nicName}
                                        </span>
                                        <Tag color={nicConfig.nic_type === 'pub' ? 'blue' : 'green'}>
                                            {nicConfig.nic_type === 'pub' ? '公网' : '内网'}
                                        </Tag>
                                    </div>
                                    <Button danger size="small"
                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.NIC_EDITS)}
                                            onClick={() => handleDeleteIPAddress(nicName)}>删除</Button>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>IPv4</span>
                                        <span className="font-mono">{nicConfig.ip4_addr || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>IPv6</span>
                                        <span className="font-mono text-xs break-all">{nicConfig.ip6_addr || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>MAC</span>
                                        <span className="font-mono text-xs">{nicConfig.mac_addr || '-'}</span>
                                    </div>
                                    {nicConfig.nic_bridge && (
                                        <div className="flex items-center justify-between">
                                            <span style={{ color: 'var(--text-secondary)' }}>网桥</span>
                                            <span className="font-mono text-xs">{nicConfig.nic_bridge}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    ) : (
                    <Table
                        dataSource={Object.entries(vm.config.nic_all).map(([nicName, nicConfig]: [string, any]) => ({ key: nicName, nicName, ...nicConfig }))}
                        pagination={false}
                        size="small"
                        columns={[
                            { title: '网卡名称', dataIndex: 'nicName', key: 'nicName', render: (text: string) => <code className="text-xs">{text}</code> },
                            { title: '类型', dataIndex: 'nic_type', key: 'nic_type', render: (text: string) => <Tag color={text === 'pub' ? 'blue' : 'green'}>{text === 'pub' ? '公网' : '内网'}</Tag> },
                            { title: 'IPv4', dataIndex: 'ip4_addr', key: 'ip4_addr', render: (text: string) => <span className="font-mono text-xs">{text || '-'}</span> },
                            { title: 'IPv6', dataIndex: 'ip6_addr', key: 'ip6_addr', render: (text: string) => <span className="font-mono text-xs">{text || '-'}</span> },
                            { title: 'MAC', dataIndex: 'mac_addr', key: 'mac_addr', render: (text: string) => <span className="font-mono text-xs">{text || '-'}</span> },
                            { title: '操作', key: 'action', render: (_: any, record: any) => (
                                <Button danger size="small" disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.NIC_EDITS)} onClick={() => handleDeleteIPAddress(record.nicName)}>删除</Button>
                            )},
                        ]}
                    />
                    )
                ) : (
                    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>暂无网卡配置</div>
                )}
            </Card>
        },
        {
            key: 'hdd',
            label: '数据磁盘',
            children: <Card title="数据盘管理" extra={<Space>
                                <Segmented
                                    value={hddViewMode}
                                    onChange={(val) => setHddViewMode(val as 'card' | 'table')}
                                    options={[
                                        { value: 'card', icon: <AppstoreOutlined /> },
                                        { value: 'table', icon: <UnorderedListOutlined /> },
                                    ]}
                                    size="small"
                                />
                                <Button type="primary" icon={<PlusOutlined/>}
                                                              disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS) || isQuotaExhausted(config.dat_num, hdds.length)}
                                                              onClick={() => setHddModalVisible(true)}>挂载数据盘</Button>
                            </Space>}
                            variant="borderless">
                {hdds && hdds.length > 0 ? (
                    hddViewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {hdds.map((hdd, index) => {
                            const hddName = hdd.hdd_path || `hdd-${index}`
                            const isMounted = hdd.hdd_flag === 1
                            const sizeGB = ((hdd.hdd_size || 0) / 1024).toFixed(1)
                            const typeText = hdd.hdd_type === 1 ? 'SSD' : 'HDD'
                            return (
                                <div key={hddName}
                                     className="glass-card">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex gap-2">
                                            <span
                                                className="px-2 py-0.5 text-xs font-medium text-blue-700 rounded">
                                                {typeText}
                                            </span>
                                            <Tag color={isMounted ? 'green' : 'orange'}>
                                                {isMounted ? '已挂载' : '未挂载'}
                                            </Tag>
                                        </div>
                                        <Space>
                                            {isMounted ? (
                                                <>
                                                    <Button size="small" disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS)} onClick={() => {
                                                        setCurrentUnmountHdd(hdd);
                                                        setUnmountHddConfirmChecked(false);
                                                        setUnmountHddModalVisible(true)
                                                    }}>卸载</Button>
                                                    <Button danger size="small"
                                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS)}
                                                            onClick={() => handleDeleteHDD(hddName)}>删除</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button type="primary" size="small" disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS)} onClick={() => {
                                                        setCurrentMountHdd(hdd);
                                                        setMountHddConfirmChecked(false);
                                                        setMountHddModalVisible(true)
                                                    }}>挂载</Button>
                                                    <Button size="small"
                                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS)}
                                                            onClick={() => handleOpenTransferHDD(hdd)}>移交</Button>
                                                    <Button danger size="small"
                                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS)}
                                                            onClick={() => handleDeleteHDD(hddName)}>删除</Button>
                                                </>
                                            )}
                                        </Space>
                                    </div>
                                    <div className="rounded-lg p-3 mb-2">
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>磁盘名称</p>
                                        <code className="text-sm font-mono break-all">{hddName}</code>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span style={{ color: 'var(--text-secondary)' }}>容量</span>
                                        <code
                                            className="px-2 py-0.5 font-medium font-mono dark:bg-gray-700/50 rounded">{sizeGB} GB</code>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    ) : (
                    <Table
                        dataSource={hdds.map((hdd, index) => ({ key: hdd.hdd_path || `hdd-${index}`, ...hdd, _index: index }))}
                        pagination={false}
                        size="small"
                        columns={[
                            { title: '磁盘名称', dataIndex: 'hdd_path', key: 'hdd_path', render: (text: string, _r: any, i: number) => <code className="text-xs font-mono">{text || `hdd-${i}`}</code> },
                            { title: '类型', dataIndex: 'hdd_type', key: 'hdd_type', render: (val: number) => <Tag color={val === 1 ? 'blue' : 'default'}>{val === 1 ? 'SSD' : 'HDD'}</Tag> },
                            { title: '容量', dataIndex: 'hdd_size', key: 'hdd_size', render: (val: number) => <span className="font-mono text-xs">{((val || 0) / 1024).toFixed(1)} GB</span> },
                            { title: '状态', dataIndex: 'hdd_flag', key: 'hdd_flag', render: (val: number) => <Tag color={val === 1 ? 'green' : 'orange'}>{val === 1 ? '已挂载' : '未挂载'}</Tag> },
                            { title: '操作', key: 'action', render: (_: any, record: any) => {
                                const hddName = record.hdd_path || `hdd-${record._index}`
                                const isMounted = record.hdd_flag === 1
                                return (
                                    <Space size="small">
                                        {isMounted ? (
                                            <>
                                                <Button size="small" disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS)} onClick={() => { setCurrentUnmountHdd(record); setUnmountHddConfirmChecked(false); setUnmountHddModalVisible(true) }}>卸载</Button>
                                                <Button danger size="small" disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS)} onClick={() => handleDeleteHDD(hddName)}>删除</Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button type="primary" size="small" disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS)} onClick={() => { setCurrentMountHdd(record); setMountHddConfirmChecked(false); setMountHddModalVisible(true) }}>挂载</Button>
                                                <Button size="small" disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS)} onClick={() => handleOpenTransferHDD(record)}>移交</Button>
                                                <Button danger size="small" disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.HDD_EDITS)} onClick={() => handleDeleteHDD(hddName)}>删除</Button>
                                            </>
                                        )}
                                    </Space>
                                )
                            }},
                        ]}
                    />
                    )
                ) : (
                    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>暂无数据盘</div>
                )}
            </Card>
        },
        {
            key: 'iso',
            label: '光盘镜像',
            children: <Card title="ISO镜像管理" extra={<Space>
                                <Segmented
                                    value={isoViewMode}
                                    onChange={(val) => setIsoViewMode(val as 'card' | 'table')}
                                    options={[
                                        { value: 'card', icon: <AppstoreOutlined /> },
                                        { value: 'table', icon: <UnorderedListOutlined /> },
                                    ]}
                                    size="small"
                                />
                                <Button type="primary" icon={<PlusOutlined/>}
                                                               disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.ISO_EDITS) || isQuotaExhausted(config.iso_num, isos.length)}
                                                               onClick={() => setIsoModalVisible(true)}>挂载ISO</Button>
                            </Space>}
                            variant="borderless">
                {isos && isos.length > 0 ? (
                    isoViewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {isos.map((iso, index) => (
                            <div key={iso.iso_name || `iso-${index}`}
                                 className="glass-card">
                                <div className="flex items-center justify-between mb-3">
                                    <span
                                        className="px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 rounded">
                                        ISO
                                    </span>
                                    <Button danger size="small" icon={<span className="iconify" data-icon="mdi:eject"/>}
                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.ISO_EDITS)}
                                            onClick={() => {
                                                setCurrentUnmountIso(iso.iso_name!);
                                                setUnmountIsoConfirmChecked(false);
                                                setUnmountIsoConfirmVisible(true)
                                            }}>卸载</Button>
                                </div>
                                <div className="space-y-2">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>挂载名称</p>
                                        <code
                                            className="text-sm font-mono break-all">{iso.iso_name || '-'}</code>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>文件名</p>
                                        <code
                                            className="text-sm font-mono break-all">{iso.iso_file || '-'}</code>
                                    </div>
                                    {iso.iso_hint && (
                                        <div className=" rounded-lg p-3">
                                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>备注</p>
                                            <p className="text-sm">{iso.iso_hint}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    ) : (
                    <Table
                        dataSource={isos.map((iso, index) => ({ key: iso.iso_name || `iso-${index}`, ...iso, _index: index }))}
                        pagination={false}
                        size="small"
                        columns={[
                            { title: '挂载名称', dataIndex: 'iso_name', key: 'iso_name', render: (text: string) => <code className="text-xs font-mono">{text || '-'}</code> },
                            { title: '文件名', dataIndex: 'iso_file', key: 'iso_file', render: (text: string) => <code className="text-xs font-mono break-all">{text || '-'}</code> },
                            { title: '备注', dataIndex: 'iso_hint', key: 'iso_hint', render: (text: string) => <span>{text || '-'}</span> },
                            { title: '操作', key: 'action', render: (_: any, record: any) => (
                                <Button danger size="small" icon={<span className="iconify" data-icon="mdi:eject"/>}
                                        disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.ISO_EDITS)}
                                        onClick={() => {
                                            setCurrentUnmountIso(record.iso_name!);
                                            setUnmountIsoConfirmChecked(false);
                                            setUnmountIsoConfirmVisible(true)
                                        }}>卸载</Button>
                            )},
                        ]}
                    />
                    )
                ) : (
                    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>暂无ISO挂载</div>
                )}
            </Card>
        },
        {
            key: 'nat',
            label: '端口映射',
            children: <Card title="NAT端口转发规则"
                            extra={<Space>
                                <Segmented
                                    value={natViewMode}
                                    onChange={(val) => setNatViewMode(val as 'card' | 'table')}
                                    options={[
                                        { value: 'card', icon: <AppstoreOutlined /> },
                                        { value: 'table', icon: <UnorderedListOutlined /> },
                                    ]}
                                    size="small"
                                />
                                <Button type="primary" icon={<PlusOutlined/>} disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.NET_EDITS) || isQuotaExhausted(config.nat_num, natRules.length)} onClick={() => {
                                    setNatModalVisible(true);
                                    form.setFieldsValue({lan_addr: availableIPs[0]})
                                }}>添加规则</Button>
                            </Space>} variant="borderless">
                {natRules && natRules.length > 0 ? (
                    natViewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {natRules.map((rule, index) => (
                            <div key={`nat-${index}`}
                                 className="glass-card">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded">
                                        端口转发
                                    </span>
                                    <Button danger size="small"
                                            icon={<DeleteOutlined/>}
                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.NET_EDITS)}
                                            onClick={() => handleDeleteNAT(index)}>删除</Button>
                                </div>
                                <div className="space-y-2">
                                    {/* 外网信息 */}
                                    <div className="rounded-lg p-3" style={{ background: 'var(--bg-secondary, rgba(59,130,246,0.08))' }}>
                                        <p className="text-xs mb-1 font-medium text-blue-600 dark:text-blue-400">外网 (WAN)</p>
                                        <div className="flex items-center justify-between text-sm">
                                            <code className="font-mono text-blue-700 dark:text-blue-300">{hostConfig?.public_addr?.[0] || hostName || '-'}</code>
                                            <span className="font-mono font-medium">:{rule.wan_port || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
                                        <span className="iconify" data-icon="mdi:arrow-down" style={{width: '20px', height: '20px'}}></span>
                                    </div>
                                    {/* 内网信息 */}
                                    <div className="rounded-lg p-3" style={{ background: 'var(--bg-secondary, rgba(34,197,94,0.08))' }}>
                                        <p className="text-xs mb-1 font-medium text-green-600 dark:text-green-400">内网 (LAN)</p>
                                        <div className="flex items-center justify-between text-sm">
                                            <code className="font-mono text-green-700 dark:text-green-300">{rule.lan_addr || '-'}</code>
                                            <span className="font-mono font-medium">:{rule.lan_port || '-'}</span>
                                        </div>
                                    </div>
                                    {rule.nat_tips && (
                                        <div className="rounded-lg p-3 mt-2" style={{ background: 'var(--bg-secondary, rgba(234,179,8,0.08))' }}>
                                            <p className="text-xs mb-1">备注</p>
                                            <p className="text-sm">{rule.nat_tips}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    ) : (
                    <Table
                        dataSource={natRules.map((rule, index) => ({ ...rule, _index: index }))}
                        rowKey={(record) => `nat-${record._index}`}
                        pagination={false}
                        size="small"
                        columns={[
                            {
                                title: '外网IP',
                                key: 'wan_ip',
                                render: () => <code className="px-1.5 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">{hostConfig?.public_addr?.[0] || hostName || '-'}</code>,
                            },
                            {
                                title: '外网端口',
                                dataIndex: 'wan_port',
                                key: 'wan_port',
                                render: (text: any) => <span className="font-mono">{text || '-'}</span>,
                            },
                            {
                                title: '内网IP',
                                dataIndex: 'lan_addr',
                                key: 'lan_addr',
                                render: (text: string) => <code className="px-1.5 py-0.5 text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">{text || '-'}</code>,
                            },
                            {
                                title: '内网端口',
                                dataIndex: 'lan_port',
                                key: 'lan_port',
                                render: (text: any) => <span className="font-mono">{text || '-'}</span>,
                            },
                            {
                                title: '备注',
                                dataIndex: 'nat_tips',
                                key: 'nat_tips',
                                render: (text: string) => <span>{text || '-'}</span>,
                            },
                            {
                                title: '操作',
                                key: 'action',
                                render: (_: any, record: any) => (
                                    <Button danger size="small" icon={<DeleteOutlined/>}
                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.NET_EDITS)}
                                            onClick={() => handleDeleteNAT(record._index)}>删除</Button>
                                ),
                            },
                        ]}
                    />
                    )
                ) : (
                    <div className="text-center  py-8">暂无NAT端口转发规则</div>
                )}
            </Card>
        },
        {
            key: 'firewall',
            label: '防火墙',
            children: (
                <FirewallPanel
                    hostName={hostName || ''}
                    vmUuid={uuid || ''}
                    canEdit={isAdminUser || hasPermission(userPermissions, VM_PERMISSION.FIREWALLS)}
                    hostEnabled={hostEnabled}
                />
            ),
        },
        {
            key: 'proxy',
            label: '反向代理',
            children: <Card title="反向代理配置" extra={<Space>
                <Segmented
                    value={proxyViewMode}
                    onChange={(val) => setProxyViewMode(val as 'card' | 'table')}
                    options={[
                        { value: 'card', icon: <AppstoreOutlined /> },
                        { value: 'table', icon: <UnorderedListOutlined /> },
                    ]}
                    size="small"
                />
                <Button type="primary" icon={<PlusOutlined/>} disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.WEB_EDITS) || isQuotaExhausted(config.web_num, proxyRules.length)} onClick={() => {
                setProxyModalVisible(true);
                proxyForm.setFieldsValue({backend_ip: availableIPs[0]})
            }}>添加代理</Button>
            </Space>} variant="borderless">
                {proxyRules && proxyRules.length > 0 ? (
                    proxyViewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {proxyRules.map((proxy, index) => (
                            <div key={proxy.id || `proxy-${index}`}
                                 className="glass-card">
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                        proxy.ssl_enabled
                                            ? 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40'
                                            : 'bg-gray-100 dark:bg-gray-700/40'
                                    }`}>
                                        {proxy.ssl_enabled ? 'HTTPS' : 'HTTP'}
                                    </span>
                                    <Button danger size="small"
                                            icon={<DeleteOutlined/>}
                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.WEB_EDITS)}
                                            onClick={() => handleDeleteProxy(index)}>删除</Button>
                                </div>
                                <div className="rounded-lg p-3 mb-2">
                                    <p className="text-xs mb-1">域名</p>
                                    <code className="text-sm font-mono break-all">{proxy.domain}</code>
                                </div>
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="">后端地址</span>
                                    <code className="px-2 py-0.5 font-medium font-mono dark:bg-gray-700/50 rounded">
                                        {proxy.backend_ip || '默认'}:{proxy.backend_port}
                                    </code>
                                </div>
                                {proxy.description && (
                                    <p className="text-xs  mt-2">{proxy.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                    ) : (
                    <Table
                        dataSource={proxyRules.map((proxy, index) => ({ ...proxy, _index: index }))}
                        rowKey={(record) => `proxy-${record._index}`}
                        pagination={false}
                        size="small"
                        columns={[
                            {
                                title: '域名',
                                dataIndex: 'domain',
                                key: 'domain',
                                render: (text: string) => <code className="text-sm font-mono break-all">{text}</code>,
                            },
                            {
                                title: '协议',
                                key: 'protocol',
                                render: (_: any, record: any) => (
                                    <Tag color={record.ssl_enabled ? 'green' : 'default'}>
                                        {record.ssl_enabled ? 'HTTPS' : 'HTTP'}
                                    </Tag>
                                ),
                            },
                            {
                                title: '后端地址',
                                key: 'backend',
                                render: (_: any, record: any) => <code className="font-mono text-xs">{record.backend_ip || '默认'}:{record.backend_port}</code>,
                            },
                            {
                                title: '描述',
                                dataIndex: 'description',
                                key: 'description',
                                render: (text: string) => <span>{text || '-'}</span>,
                            },
                            {
                                title: '操作',
                                key: 'action',
                                render: (_: any, record: any) => (
                                    <Button danger size="small" icon={<DeleteOutlined/>}
                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.WEB_EDITS)}
                                            onClick={() => handleDeleteProxy(record._index)}>删除</Button>
                                ),
                            },
                        ]}
                    />
                    )
                ) : (
                    <div className="text-center  py-8">暂无反向代理配置</div>
                )}
            </Card>
        },
        {
            key: 'pci',
            label: 'PCI 设备',
            children: <Card title="PCI 设备直通" extra={<Space>
                <Segmented
                    value={pciViewMode}
                    onChange={(val) => setPciViewMode(val as 'card' | 'table')}
                    options={[
                        { value: 'card', icon: <AppstoreOutlined /> },
                        { value: 'table', icon: <UnorderedListOutlined /> },
                    ]}
                    size="small"
                />
                <Button type="primary" icon={<PlusOutlined/>}
                                                            disabled={operationLocked || isQuotaExhausted(config.pci_num, vm?.config?.pci_all ? Object.keys(vm.config.pci_all).length : 0)}
                                                            onClick={handleOpenPciModal}>添加PCI 设备</Button>
            </Space>}
                            variant="borderless">
                {vm && vm.config && vm.config.pci_all && Object.keys(vm.config.pci_all).length > 0 ? (
                    pciViewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(vm.config.pci_all).map(([gpuKey, gpuConfig]: [string, any]) => (
                            <div key={gpuKey} className="glass-card">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40 rounded">
                                        PCI 设备
                                    </span>
                                    <Space>
                                        <Tag color={gpuConfig.gpu_mdev === 'PV' ? 'blue' : gpuConfig.gpu_mdev === 'DDA' ? 'orange' : 'green'}>{gpuConfig.gpu_mdev || '直通'}</Tag>
                                        <Button danger size="small" disabled={operationLocked} onClick={() => handleDeleteGpu(gpuKey)}>删除</Button>
                                    </Space>
                                </div>
                                <div className="rounded-lg p-3 mb-2">
                                    <p className="text-xs mb-1">设备名称</p>
                                    <code className="text-sm font-mono break-all">{gpuConfig.gpu_hint || gpuKey}</code>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span>设备ID</span>
                                    <code className="px-2 py-0.5 font-medium font-mono dark:bg-gray-700/50 rounded">{gpuConfig.gpu_uuid || '-'}</code>
                                </div>
                            </div>
                        ))}
                    </div>
                    ) : (
                    <Table
                        dataSource={Object.entries(vm.config.pci_all).map(([gpuKey, gpuConfig]: [string, any]) => ({ gpuKey, ...gpuConfig }))}
                        rowKey="gpuKey"
                        pagination={false}
                        size="small"
                        columns={[
                            {
                                title: '设备名称',
                                key: 'name',
                                render: (_: any, record: any) => <span className="font-medium">{record.gpu_hint || record.gpuKey}</span>,
                            },
                            {
                                title: '设备ID',
                                dataIndex: 'gpu_uuid',
                                key: 'gpu_uuid',
                                render: (text: string) => <code className="font-mono text-xs">{text || '-'}</code>,
                            },
                            {
                                title: '类型',
                                dataIndex: 'gpu_mdev',
                                key: 'gpu_mdev',
                                render: (text: string) => <Tag color={text === 'PV' ? 'blue' : text === 'DDA' ? 'orange' : 'green'}>{text || '直通'}</Tag>,
                            },
                            {
                                title: '操作',
                                key: 'action',
                                render: (_: any, record: any) => (
                                    <Button danger size="small" disabled={operationLocked} onClick={() => handleDeleteGpu(record.gpuKey)}>删除</Button>
                                ),
                            },
                        ]}
                    />
                    )
                ) : (
                    <div className="text-center  py-8">暂无PCI直通设备</div>
                )}
            </Card>
        },
        {
            key: 'usb',
            label: 'USB 设备',
            children: <Card title="USB 设备管理" extra={<Space>
                <Segmented
                    value={usbViewMode}
                    onChange={(val) => setUsbViewMode(val as 'card' | 'table')}
                    options={[
                        { value: 'card', icon: <AppstoreOutlined /> },
                        { value: 'table', icon: <UnorderedListOutlined /> },
                    ]}
                    size="small"
                />
                <Button type="primary" icon={<PlusOutlined/>} disabled={operationLocked || isQuotaExhausted(config.usb_num, usbList.length)} onClick={handleOpenUsbModal}>添加USB 设备</Button>
            </Space>} variant="borderless">
                {usbList && usbList.length > 0 ? (
                    usbViewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {usbList.map((usb, index) => (
                            <div key={usb.key || `usb-${index}`}
                                 className="glass-card">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded">
                                        USB 设备
                                    </span>
                                    <Button danger size="small" icon={<DeleteOutlined/>} disabled={operationLocked} onClick={() => handleDeleteUSB(usb.key)} loading={usbActionLoading}>删除</Button>
                                </div>
                                <div className="rounded-lg p-3 mb-2">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs ">VID</span>
                                        <code className="text-sm font-mono">{usb.vid_uuid || '-'}</code>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs ">PID</span>
                                        <code className="text-sm font-mono">{usb.pid_uuid || '-'}</code>
                                    </div>
                                </div>
                                {usb.usb_hint && (
                                    <p className="text-xs  mt-2">{usb.usb_hint}</p>
                                )}
                            </div>
                        ))}
                    </div>
                    ) : (
                    <Table
                        dataSource={usbList.map((usb, index) => ({ ...usb, _index: index }))}
                        rowKey={(record) => record.key || `usb-${record._index}`}
                        pagination={false}
                        size="small"
                        columns={[
                            {
                                title: 'VID',
                                dataIndex: 'vid_uuid',
                                key: 'vid_uuid',
                                render: (text: string) => <code className="font-mono text-xs">{text || '-'}</code>,
                            },
                            {
                                title: 'PID',
                                dataIndex: 'pid_uuid',
                                key: 'pid_uuid',
                                render: (text: string) => <code className="font-mono text-xs">{text || '-'}</code>,
                            },
                            {
                                title: '备注',
                                dataIndex: 'usb_hint',
                                key: 'usb_hint',
                                render: (text: string) => <span>{text || '-'}</span>,
                            },
                            {
                                title: '操作',
                                key: 'action',
                                render: (_: any, record: any) => (
                                    <Button danger size="small" icon={<DeleteOutlined/>} disabled={operationLocked} onClick={() => handleDeleteUSB(record.key)} loading={usbActionLoading}>删除</Button>
                                ),
                            },
                        ]}
                    />
                    )
                ) : (
                    <div className="text-center  py-8">暂无USB直通设备</div>
                )}
            </Card>
        },
        {
            key: 'snapshot',
            label: '快照',
            children: (
                <SnapshotPanel
                    hostName={hostName || ''}
                    vmUuid={uuid || ''}
                    canEdit={isAdminUser || hasPermission(userPermissions, VM_PERMISSION.VM_BACKUP)}
                    hostEnabled={hostEnabled}
                />
            ),
        },
        {
            key: 'backup',
            label: '备份管理',
            children: <Card title="备份管理" extra={<Space>
                <Segmented
                    value={backupViewMode}
                    onChange={(val) => setBackupViewMode(val as 'card' | 'table')}
                    options={[
                        { value: 'card', icon: <AppstoreOutlined /> },
                        { value: 'table', icon: <UnorderedListOutlined /> },
                    ]}
                    size="small"
                />
                <Button type="primary" icon={<PlusOutlined/>}
                                                            disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.VM_BACKUP) || isQuotaExhausted(config.bak_num, backups.length)}
                                                            onClick={() => setBackupModalVisible(true)}>创建备份</Button>
            </Space>}
                            variant="borderless">
                {backups && backups.length > 0 ? (
                    backupViewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {backups.map((backup, index) => {
                            const backupDate = backup.backup_time ? new Date(backup.backup_time * 1000).toLocaleString('zh-CN') : (backup.created_time || '未知时间')
                            const backupHint = backup.backup_hint || ''
                            return (
                                <div key={backup.backup_name || `backup-${index}`}
                                     className="glass-card">
                                    <div className="flex items-center justify-between mb-3">
                                        <span
                      className="px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 rounded">
                                            备份
                                        </span>
                                        <Space>
                                            <Button size="small"
                                                    icon={<span className="iconify" data-icon="mdi:restore"/>}
                                                    disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.VM_BACKUP)}
                                                    onClick={() => {
                                                        setCurrentRestoreBackup(backup.backup_name!);
                                                        setRestoreConfirmChecked1(false);
                                                        setRestoreConfirmChecked2(false);
                                                        setRestoreBackupModalVisible(true)
                                                    }}>恢复</Button>
                                            <Button danger size="small"
                                                    icon={<span className="iconify" data-icon="mdi:delete"/>}
                                                    disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.VM_BACKUP)}
                                                    onClick={() => handleDeleteBackup(backup.backup_name!)}>删除</Button>
                                        </Space>
                                    </div>
                                    <div className="rounded-lg p-3 mb-2">
                                        <p className="text-xs mb-1">备份名称</p>
                                        <code
                                            className="text-sm font-mono break-all">{backup.backup_name || '-'}</code>
                                    </div>
                                    {backupHint && (
                                        <div className="mb-2">
                                            <p className="text-xs mb-1">备份注释</p>
                                            <p className="text-sm">{backupHint}</p>
                                        </div>
                                    )}
                                    <div className="text-xs  ">
                                        <span className="iconify inline" data-icon="mdi:clock-outline"
                                              style={{width: '14px'}}></span>
                                        {' '}{backupDate}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    ) : (
                    <Table
                        dataSource={backups.map((backup, index) => ({ ...backup, _index: index }))}
                        rowKey={(record) => record.backup_name || `backup-${record._index}`}
                        pagination={false}
                        size="small"
                        columns={[
                            {
                                title: '备份名称',
                                dataIndex: 'backup_name',
                                key: 'backup_name',
                                render: (text: string) => <code className="font-mono text-xs break-all">{text || '-'}</code>,
                            },
                            {
                                title: '备份时间',
                                key: 'backup_time',
                                render: (_: any, record: any) => {
                                    const t = record.backup_time ? new Date(record.backup_time * 1000).toLocaleString('zh-CN') : (record.created_time || '-')
                                    return <span className="text-xs">{t}</span>
                                },
                            },
                            {
                                title: '备注',
                                dataIndex: 'backup_hint',
                                key: 'backup_hint',
                                render: (text: string) => <span>{text || '-'}</span>,
                            },
                            {
                                title: '操作',
                                key: 'action',
                                render: (_: any, record: any) => (
                                    <Space size="small">
                                        <Button size="small"
                                                disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.VM_BACKUP)}
                                                onClick={() => {
                                                    setCurrentRestoreBackup(record.backup_name!);
                                                    setRestoreConfirmChecked1(false);
                                                    setRestoreConfirmChecked2(false);
                                                    setRestoreBackupModalVisible(true)
                                                }}>恢复</Button>
                                        <Button danger size="small"
                                                disabled={operationLocked || !hasPermission(userPermissions, VM_PERMISSION.VM_BACKUP)}
                                                onClick={() => handleDeleteBackup(record.backup_name!)}>删除</Button>
                                    </Space>
                                ),
                            },
                        ]}
                    />
                    )
                ) : (
                    <div className="text-center  py-8">暂无备份</div>
                )}
            </Card>
        },
        {
            key: 'efi',
            label: '启动顺序',
            children: <Card title="启动顺序管理" extra={
                <Space>
                    <Segmented
                        value={efiViewMode}
                        onChange={(val) => setEfiViewMode(val as 'card' | 'table')}
                        options={[
                            { value: 'card', icon: <AppstoreOutlined /> },
                            { value: 'table', icon: <UnorderedListOutlined /> },
                        ]}
                        size="small"
                    />
                    {!efiEditing ? (
                        <>
                            <Button icon={<ReloadOutlined/>} onClick={() => loadEFIList()} loading={efiLoading}>刷新</Button>
                            <Button type="primary" icon={<EditOutlined/>}
                                    disabled={!hasPermission(userPermissions, VM_PERMISSION.EFI_EDITS) || efiList.length === 0}
                                    onClick={() => { setEfiEditList([...efiList]); setEfiEditing(true) }}>编辑顺序</Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setEfiEditing(false)}>取消</Button>
                            <Button type="primary" loading={efiActionLoading}
                                    onClick={handleSaveEFI}>保存</Button>
                        </>
                    )}
                </Space>
            } variant="borderless">
                {efiLoading ? (
                    <div className="text-center py-8"><Spin tip="加载启动项..."/></div>
                ) : (efiEditing ? efiEditList : efiList).length > 0 ? (
                    efiViewMode === 'card' ? (
                    <div className="space-y-2">
                        {(efiEditing ? efiEditList : efiList).map((item, index) => (
                            <div key={`efi-${index}`}
                                 className="glass-card flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-blue-500 w-8 text-center">#{index + 1}</span>
                                    <span className="iconify text-xl" data-icon={item.efi_type ? 'mdi:disc' : 'mdi:harddisk'} style={{color: item.efi_type ? themePalette.warning : themePalette.primary}}></span>
                                    <div>
                                        <div className="font-medium">{item.efi_name || (item.efi_type ? 'CD/DVD' : '硬盘')}</div>
                                        <div className="text-xs" style={{color: 'var(--text-secondary)'}}>
                                            {item.efi_type ? '光盘/网络启动' : '硬盘启动'}
                                        </div>
                                    </div>
                                </div>
                                {efiEditing && (
                                    <Space>
                                        <Button size="small" icon={<span className="iconify" data-icon="mdi:arrow-up"/>}
                                                disabled={index === 0}
                                                onClick={() => handleEfiMoveUp(index)}>上移</Button>
                                        <Button size="small" icon={<span className="iconify" data-icon="mdi:arrow-down"/>}
                                                disabled={index === efiEditList.length - 1}
                                                onClick={() => handleEfiMoveDown(index)}>下移</Button>
                                    </Space>
                                )}
                            </div>
                        ))}
                    </div>
                    ) : (
                    <Table
                        dataSource={(efiEditing ? efiEditList : efiList).map((item, index) => ({ ...item, _index: index }))}
                        rowKey={(record) => `efi-${record._index}`}
                        pagination={false}
                        size="small"
                        columns={[
                            {
                                title: '顺序',
                                key: 'order',
                                width: 60,
                                render: (_: any, __: any, index: number) => <span className="font-bold text-blue-500">#{index + 1}</span>,
                            },
                            {
                                title: '启动项名称',
                                key: 'name',
                                render: (_: any, record: any) => <span className="font-medium">{record.efi_name || (record.efi_type ? 'CD/DVD' : '硬盘')}</span>,
                            },
                            {
                                title: '类型',
                                key: 'type',
                                render: (_: any, record: any) => (
                                    <Tag color={record.efi_type ? 'orange' : 'blue'}>
                                        {record.efi_type ? '光盘/网络启动' : '硬盘启动'}
                                    </Tag>
                                ),
                            },
                            ...(efiEditing ? [{
                                title: '操作',
                                key: 'action',
                                render: (_: any, record: any) => (
                                    <Space size="small">
                                        <Button size="small" disabled={record._index === 0} onClick={() => handleEfiMoveUp(record._index)}>上移</Button>
                                        <Button size="small" disabled={record._index === efiEditList.length - 1} onClick={() => handleEfiMoveDown(record._index)}>下移</Button>
                                    </Space>
                                ),
                            }] : []),
                        ]}
                    />
                    )
                ) : (
                    <div className="text-center py-8" style={{color: 'var(--text-secondary)'}}>
                        暂无启动项数据，请点击刷新获取
                    </div>
                )}
            </Card>
        },
        {
            key: 'owners',
            label: '用户权限',
            children: <Card title="用户管理" extra={
                <Space>
                    <Segmented
                        value={ownerViewMode}
                        onChange={(val) => setOwnerViewMode(val as 'card' | 'table')}
                        options={[
                            { value: 'card', icon: <AppstoreOutlined /> },
                            { value: 'table', icon: <UnorderedListOutlined /> },
                        ]}
                        size="small"
                    />
                    <Button type="primary" icon={<UsergroupAddOutlined/>}
                            disabled={!isOwnerOrAdmin}
                            onClick={() => setOwnerModalVisible(true)}>添加用户</Button>
                    {owners && owners.length > 0 && (
                        <Button icon={<KeyOutlined/>}
                                disabled={!isOwnerOrAdmin}
                                onClick={() => setTransferOwnershipModalVisible(true)}>移交所有权</Button>
                    )}
                </Space>
            }
                            variant="borderless">
                {owners && owners.length > 0 ? (
                    ownerViewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {owners.map((owner, index) => {
                            const isFirstOwner = index === 0
                            const roleText = isFirstOwner ? '所有者' : '使用者'
                const roleClass = isFirstOwner ? 'dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'dark:bg-gray-700/40 dark:'
                            const ownerMask = typeof owner.permission === 'number' ? owner.permission : VM_PERMISSION.FULL_MASK
                            return (
                                <div key={owner.username || `owner-${index}`}
                                     className="glass-card">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="iconify text-blue-600" data-icon="mdi:account"
                                                  style={{fontSize: '24px'}}></span>
                                            <span className="font-medium">{owner.username}</span>
                                            {isFirstOwner &&
                                                <span className="text-xs  ml-1">(主所有者)</span>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {!isFirstOwner && isOwnerOrAdmin && (
                                                <>
                                                    <Button size="small" icon={<EditOutlined/>}
                                                            onClick={() => {
                                                                setEditPermOwner(owner.username);
                                                                setEditPermMask(ownerMask);
                                                                setEditPermModalVisible(true);
                                                            }}>编辑权限</Button>
                                                    <Button type="primary" size="small" icon={<KeyOutlined/>}
                                                            onClick={() => {
                                                                setTransferOwnerUsername(owner.username);
                                                                setTransferOwnershipModalVisible(true);
                                                            }}>移交所有权</Button>
                                                    <Button danger size="small" icon={<span className="iconify"
                                                                                            data-icon="mdi:account-remove"/>}
                                                            onClick={() => handleDeleteOwner(owner.username)}>移除</Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <span className={`px-2 py-0.5 text-xs font-medium ${roleClass} rounded`}>
                                                {roleText}
                                            </span>
                                            {!isFirstOwner && (
                                                <span className="text-xs ml-2" style={{color: 'var(--text-secondary)'}}>
                                                    权限: {ownerMask === VM_PERMISSION.FULL_MASK ? '全部' : `${Object.entries(PERMISSION_FIELD_MASK).filter(([, bit]) => (ownerMask & bit) !== 0).length}/16`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    ) : (
                    <Table
                        dataSource={owners.map((owner, index) => ({ ...owner, _index: index }))}
                        rowKey={(record) => record.username || `owner-${record._index}`}
                        pagination={false}
                        size="small"
                        columns={[
                            {
                                title: '用户名',
                                dataIndex: 'username',
                                key: 'username',
                                render: (text: string, record: any) => (
                                    <div className="flex items-center gap-2">
                                        <span className="iconify text-blue-600" data-icon="mdi:account" style={{fontSize: '18px'}}></span>
                                        <span className="font-medium">{text}</span>
                                        {record._index === 0 && <Tag color="purple">主所有者</Tag>}
                                    </div>
                                ),
                            },
                            {
                                title: '角色',
                                key: 'role',
                                render: (_: any, record: any) => (
                                    <Tag color={record._index === 0 ? 'purple' : 'default'}>
                                        {record._index === 0 ? '所有者' : '使用者'}
                                    </Tag>
                                ),
                            },
                            {
                                title: '权限',
                                key: 'permission',
                                render: (_: any, record: any) => {
                                    if (record._index === 0) return <span className="text-xs">全部权限</span>
                                    const mask = typeof record.permission === 'number' ? record.permission : VM_PERMISSION.FULL_MASK
                                    return <span className="text-xs">{mask === VM_PERMISSION.FULL_MASK ? '全部' : `${Object.entries(PERMISSION_FIELD_MASK).filter(([, bit]) => (mask & bit) !== 0).length}/16`}</span>
                                },
                            },
                            ...(isOwnerOrAdmin ? [{
                                title: '操作',
                                key: 'action',
                                render: (_: any, record: any) => {
                                    if (record._index === 0) return null
                                    const ownerMask = typeof record.permission === 'number' ? record.permission : VM_PERMISSION.FULL_MASK
                                    return (
                                        <Space size="small">
                                            <Button size="small" icon={<EditOutlined/>}
                                                    onClick={() => {
                                                        setEditPermOwner(record.username);
                                                        setEditPermMask(ownerMask);
                                                        setEditPermModalVisible(true);
                                                    }}>编辑权限</Button>
                                            <Button type="primary" size="small" icon={<KeyOutlined/>}
                                                    onClick={() => {
                                                        setTransferOwnerUsername(record.username);
                                                        setTransferOwnershipModalVisible(true);
                                                    }}>移交所有权</Button>
                                            <Button danger size="small" onClick={() => handleDeleteOwner(record.username)}>移除</Button>
                                        </Space>
                                    )
                                },
                            }] : []),
                        ]}
                    />
                    )
                ) : (
                    <div className="text-center  py-8">暂无使用者</div>
                )}
            </Card>
        },
        {
            key: 'access',
            label: '访问密钥',
            children: <Card
                title="虚拟机访问密钥"
                extra={
                    <Space>
                        <Button type="primary" icon={<KeyOutlined/>}
                                loading={accessKeyLoading}
                                disabled={operationLocked}
                                onClick={handleGenerateAccessKey}>
                            {accessKeyInfo.enabled ? '重置密钥' : '生成密钥'}
                        </Button>
                        {accessKeyInfo.enabled && (
                            <Button danger
                                    loading={accessKeyLoading}
                                    onClick={handleDeleteAccessKey}>撤销密钥</Button>
                        )}
                    </Space>
                }
                variant="borderless">
                <Alert
                    type="info"
                    showIcon
                    style={{marginBottom: 16}}
                    message="访问密钥用于免账号登录该虚拟机"
                    description="持有访问密钥的用户可直接登录并在权限范围内管理此虚拟机，密钥等同于登录凭据，请妥善保管"
                />
                {accessKeyInfo.enabled && accessKeyInfo.access_key ? (
                    <Descriptions className="vm-classic-properties vm-classic-access-properties" column={1} bordered size="small">
                        <Descriptions.Item label="访问密钥">
                            <Space className="vm-classic-access-inline">
                                <span className="font-mono" style={{letterSpacing: 2}}>
                                    {accessKeyVisible ? accessKeyInfo.access_key : '••••••••••••••••'}
                                </span>
                                <Button size="small" icon={<EyeOutlined/>}
                                        onClick={() => setAccessKeyVisible(v => !v)}>
                                    {accessKeyVisible ? '隐藏' : '显示'}
                                </Button>
                                <Button size="small" icon={<CopyOutlined/>}
                                        onClick={() => handleCopyText(accessKeyInfo.access_key, '访问密钥已复制')}>复制</Button>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="跳转链接">
                            <Space>
                                <span className="font-mono text-xs vm-classic-long-value">{accessKeyLoginURL}</span>
                                <Button size="small" icon={<CopyOutlined/>}
                                        onClick={() => handleCopyText(accessKeyLoginURL, '跳转链接已复制')}>复制</Button>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="使用方式">
                            <span className="text-xs">
                                登录页选择「访问密钥登录」并输入密钥，或直接访问上方跳转链接（跳转链接仅用于浏览器直接打开，请勿公开分享）
                            </span>
                        </Descriptions.Item>
                    </Descriptions>
                ) : (
                    <div className="text-center py-8" style={{color: 'var(--text-secondary)'}}>
                        尚未生成访问密钥，点击右上角「生成密钥」即可获得一串 16 位密钥用于登录本虚拟机
                    </div>
                )}
            </Card>
        },
    ];

    const tabVisibility = {
        isAdminUser,
        isOwnerOrAdmin,
        canManageAccessKey,
        userPermissions,
        // 平台能力：只有支持对应能力的平台才展示该页签
        firewallSupported: hostConfig?.capabilities?.firewall === true,
        snapshotSupported: hostConfig?.capabilities?.snapshot === true,
    }
    const visibleTabItems = tabItems.filter(item => isVMDetailTabVisible(item.key, config, tabVisibility))
    const activeTabItem = visibleTabItems.find(item => item.key === activeTab)

    const powerMenuProps: MenuProps = {
        items: [
            // 启动 - 只在停止状态可用
            {key: 'start', label: '启动', icon: <PlayCircleOutlined/>, 
                disabled: currentStatus.ac_status === 'STARTED' || currentStatus.ac_status === 'SUSPEND' || 
                         isIntermediateState() || !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)},
            // 关机 - 只在运行状态可用
            {
                key: 'stop',
                label: '关机',
                icon: <PoweroffOutlined/>,
                disabled: currentStatus.ac_status !== 'STARTED' || isIntermediateState() || 
                         !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS),
                danger: true
            },
            // 重启 - 只在运行状态可用
            {key: 'reset', label: '重启', icon: <ReloadOutlined/>, 
                disabled: currentStatus.ac_status !== 'STARTED' || isIntermediateState() || 
                         !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)},
            // 暂停 - 只在运行状态可用
            {key: 'pause', label: '暂停', icon: <PauseCircleOutlined/>, 
                disabled: currentStatus.ac_status !== 'STARTED' || isIntermediateState() || 
                         !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)},
            // 恢复 - 只在暂停状态可用
            {key: 'resume', label: '恢复', icon: <PlayCircleOutlined/>, 
                disabled: currentStatus.ac_status !== 'SUSPEND' || isIntermediateState() || 
                         !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)},
            // 强制关机 - 运行时和暂停状态可用
            {key: 'hard_stop', label: '强制关机', icon: <PoweroffOutlined/>, danger: true, 
                disabled: (currentStatus.ac_status !== 'STARTED' && currentStatus.ac_status !== 'SUSPEND') || 
                         isIntermediateState() || !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)},
            // 强制重启 - 运行时和暂停状态可用
            {key: 'hard_reset', label: '强制重启', icon: <ReloadOutlined/>, danger: true, 
                disabled: (currentStatus.ac_status !== 'STARTED' && currentStatus.ac_status !== 'SUSPEND') || 
                         isIntermediateState() || !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)},
        ].filter(item => {
            // 暂停状态只显示"恢复"操作
            if (isSuspendedState()) {
                return item.key === 'resume';
            }
            return true;
        }),
        onClick: (e) => handlePowerAction(e.key)
    }

    // 默认电源操作按钮（根据状态变化）
    const defaultPowerAction = (() => {
        const status = currentStatus.ac_status;
        if (status === 'STARTED') return {key: 'stop', label: '关机', icon: <PoweroffOutlined/>};
        if (status === 'STOPPED') return {key: 'start', label: '启动', icon: <PlayCircleOutlined/>};
        if (status === 'SUSPEND') return {key: 'resume', label: '恢复', icon: <PlayCircleOutlined/>};
        // 中间状态显示当前状态
        const statusMap: Record<string, {key: string, label: string, icon: any}> = {
            'ON_STOP': {key: 'stop', label: '停止中', icon: <LoadingOutlined/>},
            'ON_OPEN': {key: 'start', label: '启动中', icon: <LoadingOutlined/>},
            'ON_SAVE': {key: 'pause', label: '暂停中', icon: <LoadingOutlined/>},
            'ON_WAKE': {key: 'resume', label: '唤醒中', icon: <LoadingOutlined/>},
        };
        return statusMap[status] || {key: 'start', label: '启动', icon: <PlayCircleOutlined/>};
    })()

    const engineLabels: Record<string, string> = {
        PromoxSetup: 'Proxmox VE',
        OCInterface: 'OpenStack',
        LxContainer: 'LXC',
    }
    const engineRaw = hostConfig?.server_type || vm.config?.virt_type || 'Hyper-V'
    const engineLabel = engineLabels[engineRaw] || engineRaw
    const activeNic = Object.values((config.nic_all || {}) as Record<string, any>)
        .find((nic: any) => nic?.ip4_addr === vm.ipv4_address) as any
    const ipv4Scope = activeNic?.nic_type === 'pub' ? '公网' : '内网'
    const ipv6Address = vm.ipv6_address && vm.ipv6_address !== '-' ? vm.ipv6_address : ''
    const hardwareSummary = `${config.cpu_num || 0}C · ${formatMemory(config.mem_num || 0).replace(/\.00/, '')} · ${formatDisk(config.hdd_num || 0).replace(/\.00/, '')} · ${config.speed_u || 0} Mbps`

    return (
        <div className={`vm-unified-detail-page vm-classic-detail-page h-auto is-layout-${detailLayout}`} data-detail-layout={detailLayout}>
            <div className="">
                <VmDetailTopBar
                    uuid={config.vm_uuid}
                    layout="horizontal"
                    onChange={changeDetailLayout}
                    showLayoutSwitch={!isRestrictedSession}
                />
                <div className="vm-classic-hero-wrap px-6 py-4">
                    {!hostEnabled && (
                        <Alert
                            message="主机已被禁用"
                            description="该主机已被管理员禁用，所有虚拟机操作（创建、删除、修改、电源控制）均已被禁止。"
                            type="warning"
                            showIcon
                            closable
                            className="mb-4"
                        />
                    )}
                    <div className="vm-classic-hero-layout flex justify-between items-center">
                        <div className="vm-classic-hero-identity flex items-center gap-4">
                            <div
                                className="vm-classic-hero-icon p-3 rounded text-6xl flex items-center justify-center w-20 h-20">
                                {getOSIcon(config.os_name || '')}
                            </div>
                            <div>
                                <div className="vm-classic-hero-title flex items-center gap-3">
                                    <h1 className="text-3xl font-bold dark:text-white m-0">{config.vm_uuid}</h1>
                                    <Tag color="processing">{engineLabel}</Tag>
                                    <Badge status={getStatusColor(displayStatus)}
                                           text={getStatusText(displayStatus)}/>
                                    <span className="vm-classic-hero-address text-sm">
                                        <span className="vm-classic-address-item">
                                            <span>IPv4</span>
                                            <code>{vm.ipv4_address || '未分配'}</code>
                                            <span className="vm-classic-address-scope">{ipv4Scope}</span>
                                            <CopyOutlined className="vm-classic-copy-address" onClick={() => handleCopyPassword(vm.ipv4_address || '', 'IPv4')}/>
                                        </span>
                                    </span>
                                </div>
                                <div className="vm-classic-hero-meta flex gap-4 mt-2 text-sm ">
                                    <span>主机名称: {hostName}</span>
                                    <span>系统: {getOSDisplayName(config.os_name || '')}</span>
                                    {ipv6Address
                                        ? <span>IPv6: <code>{ipv6Address}</code></span>
                                        : <span className="vm-classic-hero-hardware">配置: {hardwareSummary}</span>}
                                </div>
                            </div>
                        </div>
                        <Space className="vm-classic-hero-actions" wrap>
            <Button type="primary" className="bg-blue-600" onClick={() => setRemoteModalVisible(true)} 
                disabled={!hostEnabled || operationLocked || isIntermediateState() || isSuspendedState() || 
                         !hasPermission(userPermissions, VM_PERMISSION.VNC_EDITS)}>远程桌面</Button>
                            <Button onClick={() => setPasswordModalVisible(true)} 
                disabled={!hostEnabled || operationLocked || isIntermediateState() || 
                         !hasPermission(userPermissions, VM_PERMISSION.PWD_EDITS)}>设置密码</Button>
                            <Dropdown menu={powerMenuProps}>
                                <Button icon={defaultPowerAction.icon}
                                        onClick={() => handlePowerAction(defaultPowerAction.key)}
                                        disabled={!hostEnabled || operationLocked || 
                                                  (isIntermediateState() && !isSuspendedState()) || 
                                                  !hasPermission(userPermissions, VM_PERMISSION.PWR_EDITS)}>
                                    {defaultPowerAction.label} <DownOutlined/>
                                </Button>
                            </Dropdown>

                            <Button onClick={() => setReinstallModalVisible(true)} 
                disabled={!hostEnabled || operationLocked || isIntermediateState() || isSuspendedState() || 
                         !hasPermission(userPermissions, VM_PERMISSION.SYS_EDITS)}>重装系统</Button>
                            <Button icon={<ReloadOutlined/>} onClick={() => loadVMDetail(false)}/>
                            <Dropdown menu={actionMenu}><Button icon={<MoreOutlined/>} 
                disabled={!hostEnabled || operationLocked || isIntermediateState()}/></Dropdown>
                        </Space>
                    </div>
                </div>
            </div>

            <div className="vm-detail-horizontal-layout">
                <div className="vm-detail-horizontal-tabs">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={visibleTabItems.map(item => ({ key: item.key, label: item.label }))}
                        tabBarStyle={{ marginBottom: 0 }}
                    />
                </div>
                <div className="vm-detail-horizontal-content">
                    {activeTabItem?.children}
                </div>
            </div>

            <Modal title="编辑虚拟机配置" open={editModalVisible} onCancel={() => setEditModalVisible(false)}
                   onOk={() => editVmForm.submit()} width={700}>
                <Form form={editVmForm} onFinish={handleUpdateVM} layout="vertical">
                    <Form.Item name="vm_uuid" hidden><Input/></Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="操作系统" name="os_name" initialValue={config.os_name || ''}>
                                <Select>
                                    <Select.Option key="__no_change__" value="">不变更系统</Select.Option>
                                    {hostConfig?.system_maps && (Array.isArray(hostConfig.system_maps) ? hostConfig.system_maps : Object.entries(hostConfig.system_maps as any).map(([name, val]: [string, any]) => Array.isArray(val) ? { sys_name: name, sys_file: val[0] } : (val && typeof val === 'object' ? { sys_name: name, ...val } : { sys_name: name, sys_file: val }))).filter((it: any) => it && it.sys_flag !== false).map((it: any) => (
                                    it && it.sys_file ? <Select.Option key={it.sys_name || it.sys_file} value={it.sys_file}>{it.sys_name || it.sys_file}</Select.Option> : null
                                ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}><Form.Item label="VNC 端口" name="vc_port"
                                                  initialValue={config.vc_port}><InputNumber min={6000} max={6999}
                                                                                             disabled style={{width: '100%'}}/></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item label="系统密码" name="os_pass"
                                                  initialValue={config.os_pass}><Input.Password
                            placeholder="留空则不修改"/></Form.Item></Col>
                        <Col span={12}><Form.Item label="VNC密码" name="vc_pass"
                                                  initialValue={config.vc_pass}><Input.Password
                            placeholder="留空则不修改"/></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} sm={12} xl={8}><Form.Item label="CPU核心" name="cpu_num"
                                                 initialValue={config.cpu_num}><InputNumber min={1} max={64}
                                                                                            style={{width: '100%'}}/></Form.Item></Col>
                        <Col xs={24} sm={12} xl={8}><Form.Item label="内存(MB)" name="mem_num"
                                                 initialValue={config.mem_num}><InputNumber min={512} max={1048576}
                                                                                            style={{width: '100%'}}/></Form.Item></Col>
                        <Col xs={24} sm={12} xl={8}><Form.Item label="硬盘(GB)" name="hdd_num"
                                                 initialValue={config.hdd_num}><InputNumber min={1} max={10240}
                                                                                            style={{width: '100%'}}/></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} sm={12} xl={8}><Form.Item label="GPU数量" name="gpu_num"
                                                 initialValue={config.gpu_num || 0}><InputNumber min={0} max={8}
                                                                                                 style={{width: '100%'}}/></Form.Item></Col>
                        <Col xs={24} sm={12} xl={8}><Form.Item label="上行带宽(Mbps)" name="speed_up"
                                                 initialValue={config.speed_up || 100}><InputNumber min={1} max={10000}
                                                                                                    style={{width: '100%'}}/></Form.Item></Col>
                        <Col xs={24} sm={12} xl={8}><Form.Item label="下行带宽(Mbps)" name="speed_down"
                                                 initialValue={config.speed_down || 100}><InputNumber min={1}
                                                                                                      max={10000}
                                                                                                      style={{width: '100%'}}/></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} sm={12} xl={8}><Form.Item label="NAT端口数" name="nat_num"
                                                 initialValue={config.nat_num || 0}><InputNumber min={0} max={100}
                                                                                                 style={{width: '100%'}}/></Form.Item></Col>
                        <Col xs={24} sm={12} xl={8}><Form.Item label="Web代理数" name="web_num"
                                                 initialValue={config.web_num || 0}><InputNumber min={0} max={100}
                                                                                                 style={{width: '100%'}}/></Form.Item></Col>
                        <Col xs={24} sm={12} xl={8}><Form.Item label="流量限制(GB)" name="flu_num" initialValue={config.flu_num || 0}><InputNumber
                            min={0} max={100000} style={{width: '100%'}}/></Form.Item></Col>
                    </Row>
                    <Divider orientation="left">
                        <div className="flex justify-between items-center w-full"><span>网卡配置</span><Button
                            type="dashed" size="small" onClick={addEditNic} icon={<PlusOutlined/>}>添加网卡</Button>
                        </div>
                    </Divider>
                    {editNicList.map((nic) => (
                <div key={nic.id} className="mb-4 p-3  rounded border border-gray-200 dark:border-gray-700 relative">
                            <div className="absolute top-2 right-2"><Button type="text" danger size="small"
                                                                            icon={<DeleteOutlined/>}
                                                                            onClick={() => removeEditNic(nic.id)}/>
                            </div>
                            <Row gutter={8}>
                                <Col xs={24} sm={12} xl={8}>
                                    <div className="mb-2"><span
                                        className="text-xs  block">网卡名称</span><Input value={nic.name}
                                                                                                      onChange={e => updateEditNic(nic.id, 'name', e.target.value)}
                                                                                                      size="small"/>
                                    </div>
                                </Col>
                                <Col xs={24} sm={12} xl={8}>
                                    <div className="mb-2"><span
                                        className="text-xs  block">类型</span><Select value={nic.type}
                                                                                                   onChange={val => updateEditNic(nic.id, 'type', val)}
                                                                                                   size="small"
                                                                                                   style={{width: '100%'}}><Select.Option
                                        value="nat">NAT</Select.Option><Select.Option
                                        value="bridge">Bridge</Select.Option></Select></div>
                                </Col>
                                <Col xs={24} sm={12} xl={8}>
                                    <div className="mb-2"><span
                                        className="text-xs  block">IPv4地址</span><Input value={nic.ip}
                                                                                                      onChange={e => updateEditNic(nic.id, 'ip', e.target.value)}
                                                                                                      placeholder="自动分配"
                                                                                                      size="small"/>
                                    </div>
                                </Col>
                                <Col span={24}>
                                    <div><span className="text-xs  block">IPv6地址 (可选)</span><Input
                                        value={nic.ip6} onChange={e => updateEditNic(nic.id, 'ip6', e.target.value)}
                                        placeholder="自动分配" size="small"/></div>
                                </Col>
                            </Row>
                        </div>
                    ))}
                </Form>
            </Modal>

            <Modal title="保存确认" open={saveConfirmModalVisible} onCancel={() => setSaveConfirmModalVisible(false)}
                   onOk={handleConfirmUpdateVM} okText="确认保存" okButtonProps={{disabled: !saveConfirmChecked}}
                   width={400}>
                <div className="mb-4"><p>确定要保存对虚拟机 "<strong>{uuid}</strong>" 的配置修改吗？</p></div>
                <div className="p-3  border border-gray-200 dark:border-gray-700 rounded flex items-center justify-center">
                    <Space><input type="checkbox" id="saveConfirmCheck" checked={saveConfirmChecked}
                                  onChange={(e) => setSaveConfirmChecked(e.target.checked)}
                                  className="w-4 h-4 text-blue-600"/><label htmlFor="saveConfirmCheck"
                                                                            className="cursor-pointer select-none text-sm ">我已确认关闭虚拟机</label></Space>
                </div>
            </Modal>

            <Modal title={currentAction?.title} open={actionConfirmModalVisible}
                   onCancel={() => setActionConfirmModalVisible(false)} onOk={executeAction}
                   okButtonProps={{
                       disabled: (currentAction?.requireShutdown && !currentAction?.confirmChecked) ||
                                 (currentAction?.requireInput && currentAction?.confirmInput !== currentAction?.expectedInput)
                   }}
                   mask={false}
                   width={400}>
                <div className="mb-4"><p>{currentAction?.content}</p></div>
                {currentAction?.requireInput && (
                    <div className="mb-4">
                        <Input
                            placeholder={currentAction.expectedInput === uuid ? "请输入虚拟机名称" : "请输入主所有者用户名"}
                            value={currentAction.confirmInput}
                            onChange={(e) => setCurrentAction({
                                ...currentAction,
                                confirmInput: e.target.value
                            })}
                        />
                    </div>
                )}
                {currentAction?.requireShutdown && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
                        <Space><input type="checkbox" id="actionConfirmCheck" checked={currentAction.confirmChecked}
                                      onChange={(e) => setCurrentAction({
                                          ...currentAction,
                                          confirmChecked: e.target.checked
                                      })} className="w-4 h-4 text-blue-600"/><label htmlFor="actionConfirmCheck"
                                                                                    className="cursor-pointer select-none text-sm ">我已确认关闭虚拟机</label></Space>
                    </div>
                )}
            </Modal>

            <Modal title="修改密码/端口" open={passwordModalVisible} onCancel={() => { setPasswordModalVisible(false); form.resetFields(); setVncPortConfirmChecked(false) }}
                   onOk={() => form.submit()} okButtonProps={{disabled: passwordActionType === 'vnc_port' && !vncPortConfirmChecked}}>
                <Form form={form} onFinish={handleChangePassword} layout="vertical">
                    <Form.Item label="操作类型">
                        <Select value={passwordActionType} onChange={(val) => { setPasswordActionType(val); form.resetFields(['new_password', 'confirm_password']); if (val === 'vnc_port') setRandomVncPort(Math.floor(Math.random() * 1000) + 6000) }}>
                            <Select.Option value="os_password">修改系统密码</Select.Option>
                            <Select.Option value="vnc_password">修改VNC 密码</Select.Option>
                            <Select.Option value="vnc_port">修改VNC 端口</Select.Option>
                        </Select>
                    </Form.Item>
                    {passwordActionType !== 'vnc_port' && (<>
                        <Form.Item label="新密码" name="new_password"
                                   rules={[{required: true, message: '请输入新密码'}]}><Input.Password
                            autoComplete="new-password"/></Form.Item>
                        <Form.Item label="确认密码" name="confirm_password" dependencies={['new_password']} rules={[{
                            required: true,
                            message: '请确认密码'
                        }, ({getFieldValue}) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                                return Promise.reject(new Error('两次输入的密码不一致'))
                            }
                        })]}><Input.Password/></Form.Item>
                    </>)}
                    {passwordActionType === 'vnc_port' && (<>
                        <Form.Item label="新VNC端口">
                            <Space>
                                <InputNumber value={randomVncPort} disabled style={{width: 120}}/>
                                <Button onClick={() => setRandomVncPort(Math.floor(Math.random() * 1000) + 6000)}>随机生成</Button>
                                <Alert message="仅限随机分配可用的端口" type="info" showIcon />
                            </Space>
                        </Form.Item>

                        <Alert message="修改VNC端口需要强制关闭并重启服务器" type="warning" showIcon className="mb-3"/>
                        <div className="p-3 border border-gray-200 rounded flex items-center justify-center">
                            <Space><input type="checkbox" id="vncPortConfirmCheck" checked={vncPortConfirmChecked}
                                          onChange={(e) => setVncPortConfirmChecked(e.target.checked)}
                                          className="w-4 h-4 text-blue-600"/><label htmlFor="vncPortConfirmCheck"
                                                                                    className="cursor-pointer select-none text-sm">我已同意强制关闭服务器</label></Space>
                        </div>
                    </>)}
                </Form>
            </Modal>

            <Modal title="添加NAT规则" open={natModalVisible} onCancel={() => setNatModalVisible(false)}
                   onOk={() => form.submit()} confirmLoading={natActionLoading}>
                <Form form={form} onFinish={handleAddNATRule} layout="vertical">
                    <Form.Item label="外网端口 (WAN)" name="wan_port" initialValue={""}
                               help="留空或填0表示自动分配"><InputNumber min={0} max={65535}
                                                                         style={{width: '100%'}}/></Form.Item>
                    <Form.Item label="内网端口 (LAN)" name="lan_port"
                               rules={[{required: true, message: '请输入内网端口'}]}><InputNumber min={1} max={65535}
                                                                                                  style={{width: '100%'}}/></Form.Item>
                    <Form.Item label="内网地址" name="lan_addr" initialValue={availableIPs[0]}
                               rules={[{required: true, message: '请选择IP地址'}]}><Select
                        placeholder="请选择IP地址">{availableIPs.map(ip => <Select.Option key={ip}
                                                                                          value={ip}>{ip}</Select.Option>)}</Select></Form.Item>
                    <Form.Item label="备注" name="nat_tips"><Input.TextArea rows={3}
                                                                            placeholder="端口用途说明"/></Form.Item>
                </Form>
            </Modal>

            <Modal title="添加IP地址" open={ipModalVisible} onCancel={() => setIpModalVisible(false)}
                   onOk={() => ipForm.submit()}>
                {ipQuota && (<div className="mb-4 p-3  rounded text-sm">
                    <div className="flex justify-between mb-1"><span>内网IP配额:</span><span
                        className="font-mono">{ipQuota.ip_used}/{ipQuota.ip_num}</span></div>
                    <div className="flex justify-between"><span>公网IP配额:</span><span
                        className="font-mono">{ipQuota.user_data?.used_pub_ips || 0}/{ipQuota.user_data?.quota_pub_ips || 0}</span>
                    </div>
                </div>)}
                <Form form={ipForm} onFinish={handleAddIPAddress} layout="vertical">
                    <Form.Item label="网卡类型" name="nic_type" initialValue="nat"><Select><Select.Option
                        value="nat">内网(NAT)</Select.Option><Select.Option
                        value="pub">公网(Public)</Select.Option></Select></Form.Item>
                    <Form.Item label="IPv4地址" name="ip4_addr"><Input placeholder="留空自动分配"/></Form.Item>
                    <Form.Item label="IPv6地址" name="ip6_addr"><Input placeholder="可选"/></Form.Item>
                    <Form.Item label="网关" name="nic_gate"><Input placeholder="可选"/></Form.Item>
                    <Form.Item label="子网掩码" name="nic_mask" initialValue="255.255.255.0"><Input/></Form.Item>
                </Form>
            </Modal>

            <Modal title="添加反向代理" open={proxyModalVisible} onCancel={() => setProxyModalVisible(false)}
                   onOk={() => proxyForm.submit()} confirmLoading={proxyActionLoading}>
                <Form form={proxyForm} onFinish={handleAddProxy} layout="vertical">
                    <Form.Item label="域名" name="domain" rules={[{required: true, message: '请输入域名'}]}
                               help="例如: www.example.com"><Input placeholder="example.com"/></Form.Item>
                    <Form.Item label="后端IP" name="backend_ip" initialValue={availableIPs[0]}
                               rules={[{required: true, message: '请选择后端IP'}]} help="选择要代理的内网IP地址"><Select
                        placeholder="请选择">{availableIPs.map(ip => <Select.Option key={ip}
                                                                                    value={ip}>{ip}</Select.Option>)}</Select></Form.Item>
                    <Form.Item label="后端端口" name="backend_port" rules={[{required: true, message: '请输入端口'}]}
                               help="后端服务运行的端口"><InputNumber min={1} max={65535}
                                                                      style={{width: '100%'}}/></Form.Item>
                    <Form.Item name="ssl_enabled" valuePropName="checked">
                        <div className="flex items-center gap-2"><input type="checkbox"/><span>启用SSL (HTTPS)</span>
                        </div>
                    </Form.Item>
                    <Form.Item label="备注" name="description"><Input.TextArea/></Form.Item>
                </Form>
            </Modal>

            <Modal title="添加PCI直通设备" open={gpuModalVisible} onCancel={() => { setGpuModalVisible(false); setSelectedPciKey(''); setAddPciConfirmChecked(false); }}
                   onOk={() => handleAddGpu({ pci_key: selectedPciKey })} confirmLoading={gpuActionLoading}
                   okButtonProps={{ disabled: !selectedPciKey || !addPciConfirmChecked }}>
                {pciListLoading ? (
                    <div className="text-center py-8"><Spin tip="正在获取可用PCI 设备列表..."/></div>
                ) : Object.keys(pciDeviceList).length > 0 ? (
                    <>
                        <div className="mb-3">请选择要直通的PCI 设备：</div>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="选择PCI 设备"
                            value={selectedPciKey || undefined}
                            onChange={(val) => setSelectedPciKey(val)}
                            optionLabelProp="label"
                        >
                            {Object.entries(pciDeviceList).map(([key, dev]: [string, any]) => (
                                <Select.Option key={key} value={key} label={dev.gpu_hint}>
                                    <div className="flex justify-between items-center">
                                        <span>{dev.gpu_hint}</span>
                                        <Tag color={dev.gpu_mdev === 'PV' ? 'blue' : dev.gpu_mdev === 'DDA' ? 'orange' : 'green'} className="ml-2">{dev.gpu_mdev}</Tag>
                                    </div>
                                    <div className="text-xs text-gray-400">{dev.gpu_uuid}</div>
                                </Select.Option>
                            ))}
                        </Select>
                    </>
                ) : (
                    <div className="text-center py-8 text-gray-400">当前主机无可用PCI直通设备</div>
                )}
                <Alert message="注意：PCI直通操作需要虚拟机处于关机状态。" type="warning" showIcon className="mt-4"/>
                <div className="p-3 rounded flex items-center mt-4" style={{ background: "var(--bg-secondary, rgba(250,204,21,0.08))", border: "1px solid var(--border-color, rgba(250,204,21,0.3))" }}>
                    <Space><input type="checkbox" id="addPciConfirmCheck" checked={addPciConfirmChecked}
                                  onChange={(e) => setAddPciConfirmChecked(e.target.checked)}
                                  className="w-4 h-4 text-blue-600"/><label htmlFor="addPciConfirmCheck"
                                                                            className="cursor-pointer select-none text-sm ">我已同意强制关机此虚拟机</label></Space>
                </div>
            </Modal>

            {/* PCI关机确认对话框 */}
            <Modal title="需要关闭虚拟机" open={pciShutdownConfirmVisible}
                   onCancel={() => { setPciShutdownConfirmVisible(false); setPendingPciAction(null); setPciShutdownConfirmChecked(false); }}
                   onOk={handlePciShutdownConfirm}
                   okText="确认关机并继续" okType="danger"
                   okButtonProps={{disabled: !pciShutdownConfirmChecked}}>
                <Alert message="PCI直通操作需要先关闭虚拟机，确认后将自动关闭虚拟机并执行操作。" type="warning" showIcon />
                <div className="p-3 rounded flex items-center mt-4" style={{ background: "var(--bg-secondary, rgba(250,204,21,0.08))", border: "1px solid var(--border-color, rgba(250,204,21,0.3))" }}>
                    <Space><input type="checkbox" id="pciShutdownCheck" checked={pciShutdownConfirmChecked}
                                  onChange={(e) => setPciShutdownConfirmChecked(e.target.checked)}
                                  className="w-4 h-4 text-blue-600"/><label htmlFor="pciShutdownCheck"
                                                                            className="cursor-pointer select-none text-sm ">我已同意强制关机此虚拟机</label></Space>
                </div>
            </Modal>

            <Modal title="添加数据盘" open={hddModalVisible} onCancel={() => { setHddModalVisible(false); setAddHddConfirmChecked(false); }}
                   onOk={() => hddForm.submit()} confirmLoading={hddActionLoading}
                   okButtonProps={{disabled: !addHddConfirmChecked}}>
                <Form form={hddForm} onFinish={handleAddHDD} layout="vertical">
                    <Alert message="磁盘名称由系统自动生成，无需填写" type="info" showIcon className="mb-3"/>
                    <Form.Item label="容量 (GB)" name="hdd_size" initialValue={10}
                               rules={[{required: true, message: '请输入容量'}]} help="最小 1 GB"><InputNumber min={1}
                                                                                                               max={10240}
                                                                                                               style={{width: '100%'}}/></Form.Item>
                    <Form.Item label="类型" name="hdd_type" initialValue={0}><Select><Select.Option
                        value={0}>HDD</Select.Option><Select.Option value={1}>SSD</Select.Option></Select></Form.Item>
                </Form>
                <Alert message="注意：添加数据盘需要重启虚拟机才能生效。" type="warning" showIcon className="mt-4"/>
                <div className="p-3 rounded flex items-center mt-4" style={{ background: "var(--bg-secondary, rgba(250,204,21,0.08))", border: "1px solid var(--border-color, rgba(250,204,21,0.3))" }}>
                    <Space><input type="checkbox" id="addHddCheck" checked={addHddConfirmChecked}
                                  onChange={(e) => setAddHddConfirmChecked(e.target.checked)}
                                  className="w-4 h-4 text-blue-600"/><label htmlFor="addHddCheck"
                                                                            className="cursor-pointer select-none text-sm ">我已同意强制关机此虚拟机</label></Space>
                </div>
            </Modal>

            <Modal title="挂载数据盘" open={mountHddModalVisible} onCancel={() => setMountHddModalVisible(false)}
                   onOk={handleMountHDD} okText="确认挂载" okButtonProps={{disabled: !mountHddConfirmChecked}}
                   confirmLoading={hddActionLoading}>
                <p>确定要挂载数据盘 "<strong>{currentMountHdd?.hdd_path}</strong>" 吗？</p>
                <p className=" text-sm mt-2 mb-4">挂载后需要在系统内进行配置才能使用。</p>
                <div className="p-3 rounded flex items-center" style={{ background: "var(--bg-secondary, rgba(250,204,21,0.08))", border: "1px solid var(--border-color, rgba(250,204,21,0.3))" }}>
                    <Space><input type="checkbox" id="mountHddCheck" checked={mountHddConfirmChecked}
                                  onChange={(e) => setMountHddConfirmChecked(e.target.checked)}
                                  className="w-4 h-4 text-blue-600"/><label htmlFor="mountHddCheck"
                                                                            className="cursor-pointer select-none text-sm ">我已同意强制关机此虚拟机</label></Space>
                </div>
            </Modal>

            <Modal title="卸载数据盘" open={unmountHddModalVisible} onCancel={() => setUnmountHddModalVisible(false)}
                   onOk={handleUnmountHDD} okText="确认卸载" okType="danger"
                   okButtonProps={{disabled: !unmountHddConfirmChecked}} confirmLoading={hddActionLoading}>
                <p>确定要卸载数据盘 "<strong>{currentUnmountHdd?.hdd_path}</strong>" 吗？</p>
                <p className="text-red-500 text-sm mt-2 mb-4">请确保在系统内已卸载该磁盘，否则可能导致数据丢失。</p>
                <div className="p-3 rounded flex items-center" style={{ background: "var(--bg-secondary, rgba(250,204,21,0.08))", border: "1px solid var(--border-color, rgba(250,204,21,0.3))" }}>
                    <Space><input type="checkbox" id="unmountHddCheck" checked={unmountHddConfirmChecked}
                                  onChange={(e) => setUnmountHddConfirmChecked(e.target.checked)}
                                  className="w-4 h-4 text-blue-600"/><label htmlFor="unmountHddCheck"
                                                                            className="cursor-pointer select-none text-sm ">我已同意强制关机此虚拟机</label></Space>
                </div>
            </Modal>

            <Modal title="挂载ISO" open={isoModalVisible} onCancel={() => setIsoModalVisible(false)}
                   onOk={() => isoForm.submit()} okButtonProps={{disabled: !hotISO && !isoMountConfirmChecked}}
                   confirmLoading={isoActionLoading}>
                <Form form={isoForm} onFinish={handleAddISO} layout="vertical">
                    <Form.Item label="ISO镜像" name="iso_file" rules={[{required: true, message: '请选择镜像'}]}
                               help="从服务器可用的ISO镜像中选择"><Select
                        placeholder="请选择">{hostConfig?.images_maps && (Array.isArray(hostConfig.images_maps) ? hostConfig.images_maps : Object.entries(hostConfig.images_maps as any).map(([name, file]: [string, any]) => (file && typeof file === 'object' ? { sys_name: name, ...file } : { sys_name: name, sys_file: file }))).filter((it: any) => it && it.sys_flag !== false).map((it: any) => (
                        it && it.sys_file ? <Select.Option key={it.sys_name || it.sys_file} value={it.sys_file}>{it.sys_name || it.sys_file} ({it.sys_file})</Select.Option> : null
                        ))}</Select></Form.Item>
                    <Alert message="挂载名称由系统自动生成，无需填写" type="info" showIcon className="mb-3"/>
                    <Form.Item label="备注" name="iso_hint" help="可选，用于说明此ISO的用途"><Input
                        placeholder="例如: 系统安装盘"/></Form.Item>
                </Form>
                {hotISO ? (
                    <Alert message="当前平台支持热挂载，保存后立即生效，无需重启虚拟机" type="info" showIcon
                           className="mt-4"/>
                ) : (
                    <div className="p-3 rounded flex items-center mt-4"
                         style={{ background: "var(--bg-secondary, rgba(250,204,21,0.08))", border: "1px solid var(--border-color, rgba(250,204,21,0.3))" }}>
                        <Space><input type="checkbox" id="isoMountCheck" checked={isoMountConfirmChecked}
                                      onChange={(e) => setIsoMountConfirmChecked(e.target.checked)}
                                      className="w-4 h-4 text-purple-600"/><label htmlFor="isoMountCheck"
                                                                                  className="cursor-pointer select-none text-sm ">保存后需要重启虚拟机，我已了解将自动重启</label></Space>
                    </div>
                )}
            </Modal>

            <Modal title="卸载ISO镜像" open={unmountIsoConfirmVisible}
                   onCancel={() => setUnmountIsoConfirmVisible(false)} onOk={executeUnmountISO} okText="确认卸载"
                   okType="danger" okButtonProps={{disabled: !hotISO && !unmountIsoConfirmChecked}}
                   confirmLoading={isoActionLoading}>
                <p>确定要卸载ISO镜像 "<strong>{currentUnmountIso}</strong>" 吗？</p>
                {hotISO ? (
                    <Alert message="当前平台支持热卸载，确认后立即生效，无需重启虚拟机" type="info" showIcon
                           className="mt-4"/>
                ) : (
                    <div className="p-3 rounded flex items-center mt-4"
                         style={{ background: "var(--bg-secondary, rgba(250,204,21,0.08))", border: "1px solid var(--border-color, rgba(250,204,21,0.3))" }}>
                        <Space><input type="checkbox" id="unmountIsoCheck" checked={unmountIsoConfirmChecked}
                                      onChange={(e) => setUnmountIsoConfirmChecked(e.target.checked)}
                                      className="w-4 h-4 text-orange-600"/><label htmlFor="unmountIsoCheck"
                                                                                  className="cursor-pointer select-none text-sm ">卸载后需要重启虚拟机，我已了解将自动重启</label></Space>
                    </div>
                )}
            </Modal>

            <Modal title="重装系统" open={reinstallModalVisible} onCancel={() => setReinstallModalVisible(false)}
                   onOk={() => reinstallForm.submit()} okType="danger" okText="确认重装"
                   okButtonProps={{disabled: !reinstallConfirmChecked}} confirmLoading={reinstallActionLoading}>
                <Alert message="警告：重装系统将清除所有数据！" description="此操作不可逆，请确保已备份重要数据。"
                       type="warning" showIcon style={{marginBottom: 16}}/>
                <Form form={reinstallForm} onFinish={handleReinstall} layout="vertical">
                    <Form.Item label="操作系统" name="os_name"
                               rules={[{required: true, message: '请选择操作系统'}]}><Select
                        placeholder="请选择">{hostConfig?.system_maps && (Array.isArray(hostConfig.system_maps) ? hostConfig.system_maps : Object.entries(hostConfig.system_maps as any).map(([name, val]: [string, any]) => Array.isArray(val) ? { sys_name: name, sys_file: val[0] } : (val && typeof val === 'object' ? { sys_name: name, ...val } : { sys_name: name, sys_file: val }))).filter((it: any) => it && it.sys_flag !== false).map((it: any) => (
                        it && it.sys_file ? <Select.Option key={it.sys_name || it.sys_file} value={it.sys_file}>{it.sys_name || it.sys_file}</Select.Option> : null
                    ))}</Select></Form.Item>
                    <Form.Item label="系统密码" name="password" rules={[{required: true, message: '请输入新系统密码'}]}><Input.Password/></Form.Item>
                </Form>
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center mt-4">
                    <Space><input type="checkbox" id="reinstallCheck" checked={reinstallConfirmChecked}
                                  onChange={(e) => setReinstallConfirmChecked(e.target.checked)}
                                  className="w-4 h-4 text-red-600"/><label htmlFor="reinstallCheck"
                                                                           className="cursor-pointer select-none text-sm ">我已备份数据，确认重装系统将清空系统盘数据</label></Space>
                </div>
            </Modal>

            <Modal title="创建备份" open={backupModalVisible} onCancel={() => setBackupModalVisible(false)}
                   onOk={() => backupForm.submit()} okButtonProps={{disabled: !backupCreateConfirmChecked}}
                   confirmLoading={backupActionLoading}>
                <Form form={backupForm} onFinish={handleCreateBackup} layout="vertical">
                    <Alert type="info" showIcon message="备份名称自动生成"
                           description={`${vm?.vm_uuid || uuid}-backup-年月日时分秒`}/>
                </Form>
                <Alert message="备份可能需要数十分钟，取决于虚拟机硬盘大小，请耐心等待！" type="info" showIcon
                       className="mb-4 mt-2"/>
                <div className="p-3 rounded flex items-center" style={{ background: "var(--bg-secondary, rgba(250,204,21,0.08))", border: "1px solid var(--border-color, rgba(250,204,21,0.3))" }}>
                    <Space><input type="checkbox" id="backupCreateCheck" checked={backupCreateConfirmChecked}
                                  onChange={(e) => setBackupCreateConfirmChecked(e.target.checked)}
                                  className="w-4 h-4 text-purple-600"/><label htmlFor="backupCreateCheck"
                                                                              className="cursor-pointer select-none text-sm ">我已确认停止当前虚拟机进行备份操作（未保存的数据将丢失）</label></Space>
                </div>
            </Modal>

            <Modal title="还原备份" open={restoreBackupModalVisible}
                   onCancel={() => setRestoreBackupModalVisible(false)} onOk={executeRestoreBackup} okText="确认还原"
                   okButtonProps={{disabled: !restoreConfirmChecked1 || !restoreConfirmChecked2}}
                   confirmLoading={backupActionLoading}>
                <p className="mb-4">为虚拟机 "<strong>{uuid}</strong>" 还原备份</p>
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm  mb-1">备份名称：<span
                        className="font-mono text-blue-700">{currentRestoreBackup}</span></p>
                </div>
                <div className="space-y-3 mb-6">
                    <div className="p-3 rounded flex items-center" style={{ background: "var(--bg-secondary, rgba(250,204,21,0.08))", border: "1px solid var(--border-color, rgba(250,204,21,0.3))" }}>
                        <Space><input type="checkbox" id="restoreCheck1" checked={restoreConfirmChecked1}
                                      onChange={(e) => setRestoreConfirmChecked1(e.target.checked)}
                                      className="w-4 h-4 text-blue-600"/><label htmlFor="restoreCheck1"
                                                                                className="cursor-pointer select-none text-sm ">我已确认停止当前虚拟机进行还原操作</label></Space>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center">
                        <Space><input type="checkbox" id="restoreCheck2" checked={restoreConfirmChecked2}
                                      onChange={(e) => setRestoreConfirmChecked2(e.target.checked)}
                                      className="w-4 h-4 text-red-600"/><label htmlFor="restoreCheck2"
                                                                               className="cursor-pointer select-none text-sm ">我已确认备份数据，将丢失系统盘数据</label></Space>
                    </div>
                </div>
            </Modal>

            <Modal title="添加用户" open={ownerModalVisible} onCancel={() => setOwnerModalVisible(false)}
                   onOk={() => ownerForm.submit()} confirmLoading={ownerActionLoading}>
                <Form form={ownerForm} onFinish={handleAddOwner} layout="vertical">
                    <Form.Item label="用户名" name="username" rules={[{required: true, message: '请输入用户名'}]}
                               help="添加后该用户将共享此虚拟机的访问权限，但不会占用资源配额"><Input
                        placeholder="请输入用户名"/></Form.Item>
                </Form>
                <div className="flex items-start space-x-2 mt-2 text-sm text-orange-600">
                    <SafetyCertificateOutlined className="mt-1"/>
                    <p>新的共享者必须拥有<strong>对应主机的访问权限</strong>才能看到该虚拟机!</p>
                </div>
            </Modal>

            <Modal title="移交所有权" open={transferOwnershipModalVisible}
                   onCancel={() => setTransferOwnershipModalVisible(false)} onOk={handleTransferOwnership}
                   okText="确认移交" okButtonProps={{disabled: !transferOwnerConfirmChecked || !transferOwnerUsername}}
                   confirmLoading={ownerActionLoading}>
                <div className="mb-4"><p>移交所有权将把当前虚拟机的所有权转让给另一个用户。</p></div>
                <div className="mb-4"><label className="block mb-2 text-sm font-medium">新所有者用户名</label><Input
                    value={transferOwnerUsername} onChange={(e) => setTransferOwnerUsername(e.target.value)}
                    placeholder="请输入用户名"/>
                    <p className="text-xs  mt-1">移交后该用户将成为虚拟机的所有者，占用资源配额，您将不再占用此虚拟机资源配额</p>
                </div>
                <div className="mb-4"><Space direction="vertical">
                    <Checkbox checked={keepAccessChecked} onChange={(e) => setKeepAccessChecked(e.target.checked)}>保留我的访问权限
                        (作为使用者)</Checkbox>
                    <div className="ml-6 text-xs text-blue-600 mb-2">勾选将继续保留此虚拟机的访问权限，但不再是所有者
                    </div>
                    <Checkbox checked={transferOwnerConfirmChecked}
                              onChange={(e) => setTransferOwnerConfirmChecked(e.target.checked)}>我确认移交此虚拟机所有者权限</Checkbox>
                    <div className="ml-6 space-y-1">
                        <div
                            className="text-xs text-red-600 font-bold">此操作将立即执行且不可撤销，请谨慎确认所有者转移
                        </div>
                        <div className="text-xs text-orange-600">新的所有者必须拥有足够的可用资源配额才能完成移交</div>
                        <div className="text-xs text-orange-600">新的所有者必须拥有对应主机的访问权限才能完成移交</div>
                    </div>
                </Space></div>
            </Modal>

            {/* 编辑用户权限模态框 */}
            <Modal title={`编辑权限 - ${editPermOwner}`} open={editPermModalVisible}
                   onCancel={() => setEditPermModalVisible(false)} onOk={handleUpdatePermission}
                   confirmLoading={ownerActionLoading} okText="保存" width={560}>
                <div style={{marginBottom: 12}}>
                    <Space>
                        <Button size="small" onClick={() => setEditPermMask(VM_PERMISSION.FULL_MASK)}>全选</Button>
                        <Button size="small" onClick={() => setEditPermMask(0)}>全不选</Button>
                    </Space>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px'}}>
                    {Object.entries(PERMISSION_FIELD_MASK).map(([field, bit]) => (
                        <label key={field} style={{display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 0'}}>
                            <input type="checkbox" checked={(editPermMask & bit) !== 0}
                                   onChange={(e) => {
                                       if (e.target.checked) {
                                           setEditPermMask(prev => prev | bit)
                                       } else {
                                           setEditPermMask(prev => prev & ~bit)
                                       }
                                   }}/>
                            <span>{VM_PERMISSION_LABELS[field] || field}</span>
                        </label>
                    ))}
                </div>
                <div style={{marginTop: 12, fontSize: 12, color: 'var(--art-gray-500)'}}>
                    当前掩码值: {editPermMask} / {VM_PERMISSION.FULL_MASK}
                </div>
            </Modal>

            <Modal title={<div style={{display: 'flex', alignItems: 'center', gap: 8, color: 'var(--main-color)'}}>
                <CloudSyncOutlined/><span>移交数据盘</span></div>} open={transferHddModalVisible}
                   onCancel={() => setTransferHddModalVisible(false)} onOk={handleTransferHDD} okText="确认移交"
                   okButtonProps={{disabled: !transferHddConfirmChecked}} confirmLoading={hddActionLoading}>
                <div style={{marginBottom: 24}}><p>确定要移交数据盘 "<strong>{currentTransferHdd?.hdd_path}</strong>" 吗？
                </p></div>
                <div style={{marginBottom: 16}}><label style={{display: 'block', marginBottom: 8, fontWeight: 500}}>目标虚拟机UUID
                    *</label><Input placeholder="输入目标虚拟机UUID" value={transferTargetUuid}
                                    onChange={(e) => setTransferTargetUuid(e.target.value)}/>
                    <div style={{fontSize: 12, color: 'var(--art-gray-600)', marginTop: 4}}>数据盘将从当前虚拟机移交到目标虚拟机</div>
                </div>
                <Alert message="目标机器不会自动挂载转移硬盘" type="info" showIcon style={{marginBottom: 16}}/>
                <div className="p-3 rounded" style={{ background: 'var(--art-warning-soft)', border: '1px solid color-mix(in srgb, var(--art-warning) 32%, transparent)' }}>
                    <Space><input type="checkbox" id="transferConfirm" checked={transferHddConfirmChecked}
                                  onChange={(e) => setTransferHddConfirmChecked(e.target.checked)}/><label
                        htmlFor="transferConfirm"
                        style={{cursor: 'pointer', userSelect: 'none'}}>我同意关闭当前虚拟机执行操作</label></Space>
                </div>
            </Modal>

            <Modal title="添加USB 设备" open={usbModalVisible} onCancel={() => { setUsbModalVisible(false); setSelectedUsbKey(''); setUsbShutdownConfirmChecked(false); }}
                   onOk={handleAddUSB} confirmLoading={usbActionLoading}
                   okButtonProps={{ disabled: !selectedUsbKey || !usbShutdownConfirmChecked }}>
                {usbListLoading ? (
                    <div className="text-center py-8"><Spin tip="正在获取可用USB 设备列表..."/></div>
                ) : Object.keys(usbDeviceList).length > 0 ? (
                    <>
                        <div className="mb-3">请选择要直通的USB 设备：</div>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="选择USB 设备"
                            value={selectedUsbKey || undefined}
                            onChange={(val) => setSelectedUsbKey(val)}
                            optionLabelProp="label"
                        >
                            {Object.entries(usbDeviceList).map(([key, dev]: [string, any]) => (
                                <Select.Option key={key} value={key} label={dev.usb_hint}>
                                    <div>{dev.usb_hint}</div>
                                    <div className="text-xs text-gray-400">VID: {dev.vid_uuid} | PID: {dev.pid_uuid}</div>
                                </Select.Option>
                            ))}
                        </Select>
                    </>
                ) : (
                    <div className="text-center py-8 text-gray-400">当前主机无可用USB 设备</div>
                )}
                <div className="p-3 rounded flex items-center mt-4" style={{ background: "var(--bg-secondary, rgba(250,204,21,0.08))", border: "1px solid var(--border-color, rgba(250,204,21,0.3))" }}>
                    <Space><input type="checkbox" id="usbShutdownCheck" checked={usbShutdownConfirmChecked}
                                  onChange={(e) => setUsbShutdownConfirmChecked(e.target.checked)}
                                  className="w-4 h-4 text-blue-600"/><label htmlFor="usbShutdownCheck"
                                                                            className="cursor-pointer select-none text-sm ">我已同意强制关机此虚拟机</label></Space>
                </div>
            </Modal>

            {/* 远程桌面模态框 */}
            <Modal
                title="远程桌面"
                open={remoteModalVisible}
                onCancel={() => setRemoteModalVisible(false)}
                footer={null}
                width={560}
            >

                <div className="remote-modal-cards" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                    {/* 1. VNC/TTY 一键连接 - 所有非docker+lxc系统都有 */}
                    {hostConfig?.server_type !== 'OCInterface' && hostConfig?.server_type !== 'LxContainer' && (
                        <div className="remote-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                                        <DesktopOutlined style={{ marginRight: 8, color: 'var(--art-chart-4)' }} />
                                        VNC / TTY 控制台
                                    </div>
                                    <div className="remote-card-desc" style={{ fontSize: 13, marginTop: 4 }}>网页远程控制台，适合救援排障</div>
                                </div>
                                <Button type="primary" onClick={handleOpenVNC} disabled={!hostEnabled}>
                                    一键连接
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 2. ToDesk远程桌面 - 仅Windows+非docker+lxc */}
                    {hostConfig?.server_type !== 'OCInterface' && hostConfig?.server_type !== 'LxContainer' &&
                     (config.os_name || '').toLowerCase().includes('win') && (
                        <div className="remote-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                                        <GlobalOutlined style={{ marginRight: 8, color: 'var(--art-success)' }} />
                                        ToDesk 远程桌面
                                    </div>
                                    <div className="remote-card-desc" style={{ fontSize: 13, marginTop: 4 }}>高性能远程桌面，适合日常使用</div>
                                </div>
                                {config.rdp_info?.todesk?.code ? (
                                    <Tag color="success">已就绪</Tag>
                                ) : (
                                    <Tag color="default">未就绪</Tag>
                                )}
                            </div>
                            {config.rdp_info?.todesk?.code ? (
                                <div className="remote-card-info" style={{ marginTop: 12, padding: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span className="remote-card-label" style={{ fontSize: 13 }}>设备代码</span>
                                        <Space>
                                            <code style={{ fontSize: 14, fontWeight: 600 }}>{config.rdp_info.todesk.code}</code>
                                            <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopyPassword(config.rdp_info.todesk.code, 'ToDesk设备代码')} />
                                        </Space>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="remote-card-label" style={{ fontSize: 13 }}>临时密码</span>
                                        <Space>
                                            <code style={{ fontSize: 14, fontWeight: 600 }}>{config.rdp_info.todesk.password}</code>
                                            <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopyPassword(config.rdp_info.todesk.password, 'ToDesk临时密码')} />
                                        </Space>
                                    </div>
                                </div>
                            ) : (
                                <div className="remote-card-hint" style={{ marginTop: 12, fontSize: 13 }}>
                                    ToDesk服务未就绪，请等待虚拟机上报连接信息
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. RDP 一键连接 - 仅Windows+非docker+lxc */}
                    {hostConfig?.server_type !== 'OCInterface' && hostConfig?.server_type !== 'LxContainer' &&
                     (config.os_name || '').toLowerCase().includes('win') && (
                        <div className="remote-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                                        <WindowsOutlined style={{ marginRight: 8, color: 'var(--main-color)' }} />
                                        Microsoft RDP 远程桌面
                                    </div>
                                    <div className="remote-card-desc" style={{ fontSize: 13, marginTop: 4 }}>Windows原生远程桌面协议</div>
                                </div>
                            </div>
                            <div className="remote-card-info" style={{ marginTop: 12, padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span className="remote-card-label" style={{ fontSize: 13 }}>连接地址</span>
                                    <Space>
                                        <code style={{ fontSize: 13 }}>{(hostConfig?.public_addr?.[0] || vm?.ipv4_address || '未知')}:{natRules.find(r => Number(r.lan_port) === 3389)?.wan_port || 3389}</code>
                                        <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopyPassword(`${hostConfig?.public_addr?.[0] || vm?.ipv4_address || ''}:${natRules.find(r => Number(r.lan_port) === 3389)?.wan_port || 3389}`, 'RDP地址')} />
                                    </Space>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span className="remote-card-label" style={{ fontSize: 13 }}>用户名</span>
                                    <Space>
                                        <code style={{ fontSize: 13 }}>{config.rdp_info?.ms_rdp?.user || 'Administrator'}</code>
                                        <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopyPassword(config.rdp_info?.ms_rdp?.user || 'Administrator', 'RDP用户名')} />
                                    </Space>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <span className="remote-card-label" style={{ fontSize: 13 }}>密码</span>
                                    <Space>
                                        <code style={{ fontSize: 13 }}>{config.os_pass || '未设置'}</code>
                                        <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopyPassword(config.os_pass || '', 'RDP密码')} />
                                    </Space>
                                </div>
                                <Button block onClick={() => {
                                    const addr = hostConfig?.public_addr?.[0] || vm?.ipv4_address || ''
                                    const user = config.rdp_info?.ms_rdp?.user || 'Administrator'
                                    const rdpPort = natRules.find(r => Number(r.lan_port) === 3389)?.wan_port || 3389
                                    const rdpContent = `full address:s:${addr}:${rdpPort}\r\nusername:s:${user}\r\nprompt for credentials:i:1\r\nadministrative session:i:1`
                                    const blob = new Blob([rdpContent], { type: 'application/x-rdp' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `${config.vm_uuid || uuid}.rdp`
                                    a.click()
                                    URL.revokeObjectURL(url)
                                    message.success('RDP文件已下载')
                                }}>
                                    下载 RDP 文件
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 4. SSH 一键连接 - 仅Linux和macOS+非docker+lxc */}
                    {hostConfig?.server_type !== 'OCInterface' && hostConfig?.server_type !== 'LxContainer' &&
                     !(config.os_name || '').toLowerCase().includes('win') && (
                        <div className="remote-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                                        <CodeOutlined style={{ marginRight: 8, color: 'var(--art-warning)' }} />
                                        SSH 远程连接
                                    </div>
                                    <div className="remote-card-desc" style={{ fontSize: 13, marginTop: 4 }}>命令行远程连接，适合Linux/macOS</div>
                                </div>
                            </div>
                            <div className="remote-card-info" style={{ marginTop: 12, padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span className="remote-card-label" style={{ fontSize: 13 }}>连接地址</span>
                                    <Space>
                                        <code style={{ fontSize: 13 }}>{hostConfig?.public_addr?.[0] || vm?.ipv4_address || '未知'}:{natRules.find(r => Number(r.lan_port) === 22)?.wan_port || 22}</code>
                                        <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopyPassword(`${hostConfig?.public_addr?.[0] || vm?.ipv4_address || ''}:${natRules.find(r => Number(r.lan_port) === 22)?.wan_port || 22}`, 'SSH地址')} />
                                    </Space>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span className="remote-card-label" style={{ fontSize: 13 }}>用户名</span>
                                    <Space>
                                        <code style={{ fontSize: 13 }}>root</code>
                                        <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopyPassword('root', 'SSH用户名')} />
                                    </Space>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <span className="remote-card-label" style={{ fontSize: 13 }}>密码</span>
                                    <Space>
                                        <code style={{ fontSize: 13 }}>{config.os_pass || '未设置'}</code>
                                        <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopyPassword(config.os_pass || '', 'SSH密码')} />
                                    </Space>
                                </div>
                                <Button block onClick={() => {
                                    const addr = hostConfig?.public_addr?.[0] || vm?.ipv4_address || ''
                                    const sshPort = natRules.find(r => Number(r.lan_port) === 22)?.wan_port || 22
                                    const sshCmd = sshPort === 22 ? `ssh root@${addr}` : `ssh -p ${sshPort} root@${addr}`
                                    navigator.clipboard.writeText(sshCmd)
                                    message.success('SSH命令已复制')
                                }}>
                                    复制 SSH 命令
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}

export default VMDetail
