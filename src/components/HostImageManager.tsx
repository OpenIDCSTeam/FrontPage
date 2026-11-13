import {useCallback, useEffect, useRef, useState} from 'react'
import type {ReactNode} from 'react'
import {
    Alert,
    Button,
    Card,
    Drawer,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Progress,
    Select,
    Space,
    Spin,
    Table,
    Tabs,
    Tag,
    Upload,
    message,
} from 'antd'
import {
    ClusterOutlined,
    CodeOutlined,
    DatabaseOutlined,
    DeleteOutlined,
    DisconnectOutlined,
    EditOutlined,
    FileZipOutlined,
    FolderOpenOutlined,
    LinkOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    ThunderboltOutlined,
    UploadOutlined,
} from '@ant-design/icons'
import type {ColumnsType} from 'antd/es/table'
import {isAxiosError} from 'axios'
import {
    bindHostImageFile,
    deleteHostImageFile,
    getHostImageFiles,
    getHostPlatformInfo,
    renameHostImageFile,
    unbindHostImageFile,
    uploadHostImageFile,
} from '@/utils/apis'
import type {HostImageFile, HostImageKind, HostImageListResult, HostPlatformInfo, HostPlatformSection} from '@/utils/apis'
import HostTerminalPanel from '@/components/host/HostTerminalPanel'
import HostFilePanel from '@/components/host/HostFilePanel'
import HostFirewallPanel from '@/components/host/HostFirewallPanel'
import HostProcessPanel from '@/components/host/HostProcessPanel'
import HostServicePanel from '@/components/host/HostServicePanel'

interface Props {
    open: boolean
    hostName: string
    onClose: () => void
}

const KIND_META: Record<HostImageKind, { label: string; hint: string }> = {
    system: {label: '系统模板', hint: '虚拟机系统盘 / 模板镜像（images_path）'},
    iso: {label: 'ISO', hint: '安装介质光盘镜像（dvdrom_path）'},
}

function errorMessage(error: unknown): string {
    if (isAxiosError(error)) return error.response?.data?.msg || error.message
    return error instanceof Error ? error.message : '操作失败，请重试'
}

function formatSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let value = bytes
    let index = 0
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024
        index += 1
    }
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatTime(ts: number): string {
    if (!ts) return '-'
    return new Date(ts * 1000).toLocaleString()
}

function stripExtension(name: string): string {
    return name.replace(/\.[^.]+$/, '')
}

// 平台配置分组的列定义：后端只给列名与行数据，前端按索引取值
function platformColumns(section: HostPlatformSection): ColumnsType<{key: number; row: string[]}> {
    return section.columns.map((title, index) => ({
        title,
        key: `${section.key}-${index}`,
        render: (_: unknown, record: {key: number; row: string[]}) => record.row[index] || '-',
    }))
}

export default function HostImageManager({open, hostName, onClose}: Props) {
    const [activeTab, setActiveTab] = useState<string>('system')
    // 非镜像页签不涉及镜像目录，按「系统模板」处理即可
    const activeKind: HostImageKind = activeTab === 'iso' ? 'iso' : 'system'
    const [listMap, setListMap] = useState<Partial<Record<HostImageKind, HostImageListResult>>>({})
    const [loadingKind, setLoadingKind] = useState<HostImageKind | null>(null)
    const [uploading, setUploading] = useState<{kind: HostImageKind; name: string; percent: number} | null>(null)
    const [renameTarget, setRenameTarget] = useState<{kind: HostImageKind; file: HostImageFile} | null>(null)
    const [bindTarget, setBindTarget] = useState<{kind: HostImageKind; file: HostImageFile} | null>(null)
    const [busy, setBusy] = useState(false)
    const [platform, setPlatform] = useState<HostPlatformInfo | null>(null)
    const [platformLoading, setPlatformLoading] = useState(false)
    const lastLoadKey = useRef('')
    const [renameForm] = Form.useForm()
    const [bindForm] = Form.useForm()

    const load = useCallback(async (kind: HostImageKind) => {
        if (!hostName) return
        setLoadingKind(kind)
        try {
            const result = await getHostImageFiles(hostName, kind)
            if (result.data) {
                setListMap(prev => ({...prev, [kind]: result.data}))
            }
        } catch (error) {
            message.error(errorMessage(error))
        } finally {
            setLoadingKind(null)
        }
    }, [hostName])

    // 平台配置项目随平台不同（PVE 网络/存储、QEMU 网桥、Hyper-V 虚拟交换机）
    const loadPlatform = useCallback(async () => {
        if (!hostName) return
        setPlatformLoading(true)
        try {
            const result = await getHostPlatformInfo(hostName)
            setPlatform(result.data || {host_name: hostName, server_type: '', sections: []})
        } catch {
            // 平台信息拿不到时只是不展示该页签，不影响镜像管理
            setPlatform({host_name: hostName, server_type: '', sections: []})
        } finally {
            setPlatformLoading(false)
        }
    }, [hostName])

    // 每次打开抽屉重置为「系统模板」，并清掉上一台主机的缓存
    useEffect(() => {
        if (!open) return
        setListMap({})
        setActiveTab('system')
        setPlatform(null)
        lastLoadKey.current = ''
        void loadPlatform()
    }, [open, hostName, loadPlatform])

    // 打开或切换到镜像页签时按需加载；用 key 去重，避免同一轮渲染重复请求
    useEffect(() => {
        if (!open) return
        if (activeTab !== 'system' && activeTab !== 'iso') return
        const key = `${hostName}::${activeTab}`
        if (lastLoadKey.current === key) return
        lastLoadKey.current = key
        void load(activeTab)
    }, [open, hostName, activeTab, load])

    const handleUpload = async (file: File) => {
        if (uploading) {
            message.warning('已有文件正在上传，请等待完成')
            return
        }
        const kind = activeKind
        // 系统模板与 ISO 可能共用一个目录，上传前先按后缀拦住放错页签的文件
        const isISO = /\.iso$/i.test(file.name)
        if (kind === 'iso' && !isISO) {
            message.warning('ISO 页签只接受 .iso 文件')
            return
        }
        if (kind === 'system' && isISO) {
            message.warning('ISO 文件请切换到 ISO 页签上传')
            return
        }
        setUploading({kind, name: file.name, percent: 0})
        try {
            await uploadHostImageFile(hostName, kind, file, percent => {
                setUploading(prev => (prev && prev.name === file.name ? {...prev, percent} : prev))
            })
            message.success(`已上传 ${file.name}`)
            await load(kind)
        } catch (error) {
            message.error(errorMessage(error))
        } finally {
            setUploading(null)
        }
    }

    const openRename = (kind: HostImageKind, file: HostImageFile) => {
        renameForm.setFieldsValue({new_name: file.name})
        setRenameTarget({kind, file})
    }

    const submitRename = async () => {
        if (!renameTarget) return
        let values: {new_name: string}
        try {
            values = await renameForm.validateFields()
        } catch {
            return
        }
        const newName = values.new_name.trim()
        setBusy(true)
        try {
            await renameHostImageFile(hostName, renameTarget.kind, renameTarget.file.name, newName)
            message.success('重命名成功')
            setRenameTarget(null)
            await load(renameTarget.kind)
        } catch (error) {
            message.error(errorMessage(error))
        } finally {
            setBusy(false)
        }
    }

    const openBind = (kind: HostImageKind, file: HostImageFile) => {
        bindForm.setFieldsValue({
            sys_name: stripExtension(file.name),
            sys_size: kind === 'system' ? 20 : undefined,
            sys_type: kind === 'system' ? 'Linux' : undefined,
        })
        setBindTarget({kind, file})
    }

    const submitBind = async () => {
        if (!bindTarget) return
        let values: {sys_name: string; sys_size?: number | null; sys_type?: string}
        try {
            values = await bindForm.validateFields()
        } catch {
            return
        }
        setBusy(true)
        try {
            await bindHostImageFile(hostName, {
                kind: bindTarget.kind,
                file: bindTarget.file.name,
                sys_name: values.sys_name.trim(),
                sys_size: values.sys_size === undefined || values.sys_size === null ? '' : String(values.sys_size),
                sys_type: values.sys_type || '',
            })
            message.success('已绑定到镜像管理')
            setBindTarget(null)
            await load(bindTarget.kind)
        } catch (error) {
            message.error(errorMessage(error))
        } finally {
            setBusy(false)
        }
    }

    const handleUnbind = async (kind: HostImageKind, file: HostImageFile) => {
        try {
            await unbindHostImageFile(hostName, kind, file.name)
            message.success('已解除绑定')
            await load(kind)
        } catch (error) {
            message.error(errorMessage(error))
        }
    }

    const handleDelete = async (kind: HostImageKind, file: HostImageFile) => {
        try {
            await deleteHostImageFile(hostName, kind, file.name)
            message.success('删除成功')
            await load(kind)
        } catch (error) {
            message.error(errorMessage(error))
        }
    }

    const columns = (kind: HostImageKind): ColumnsType<HostImageFile> => [
        {
            title: '文件名',
            dataIndex: 'name',
            ellipsis: true,
            render: (name: string) => (
                <span className="art-table-mono" title={name}>{name}</span>
            ),
        },
        {
            title: '大小',
            dataIndex: 'size',
            width: 100,
            render: (size: number) => <span className="art-table-mono">{formatSize(size)}</span>,
        },
        {
            title: '修改时间',
            dataIndex: 'mod_time',
            width: 170,
            render: (ts: number) => <span className="art-table-muted">{formatTime(ts)}</span>,
        },
        {
            title: '镜像管理',
            dataIndex: 'bound',
            width: 220,
            render: (_: unknown, record: HostImageFile) => {
                if (!record.bound) {
                    return <Tag style={{margin: 0}}>未绑定</Tag>
                }
                const detail = [
                    record.sys_name || record.name,
                    record.sys_type || '',
                    record.sys_size ? `≥${record.sys_size}G` : '',
                ].filter(Boolean).join(' · ')
                return (
                    <div className="art-cell-stack">
                        <Tag color="success" style={{margin: 0}}>已绑定</Tag>
                        <span className="art-cell-sub" title={detail}>{detail}</span>
                    </div>
                )
            },
        },
        {
            title: '操作',
            key: 'actions',
            width: 240,
            render: (_: unknown, record: HostImageFile) => (
                <Space size={0} wrap>
                    {record.bound ? (
                        <Button
                            type="link"
                            size="small"
                            icon={<DisconnectOutlined />}
                            onClick={() => handleUnbind(kind, record)}
                        >
                            解绑
                        </Button>
                    ) : (
                        <Button
                            type="link"
                            size="small"
                            icon={<LinkOutlined />}
                            onClick={() => openBind(kind, record)}
                        >
                            一键绑定
                        </Button>
                    )}
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openRename(kind, record)}
                    >
                        重命名
                    </Button>
                    <Popconfirm
                        title="确认删除该文件？"
                        description="文件将从主机镜像目录中永久删除，已绑定的镜像会同时解绑。"
                        okText="删除"
                        okType="danger"
                        cancelText="取消"
                        onConfirm={() => handleDelete(kind, record)}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ]

    const renderPanel = (kind: HostImageKind) => {
        const data = listMap[kind]
        const isUploading = uploading?.kind === kind
        const meta = KIND_META[kind]

        return (
            <div className="art-stack">
                <Alert
                    type="info"
                    showIcon
                    message={
                        <span>
                            {meta.hint}
                            <br />
                            <span className="art-table-mono" style={{fontSize: 12}}>
                                目录：{data?.dir || (loadingKind === kind ? '加载中…' : '未配置')}
                            </span>
                        </span>
                    }
                />
                {data?.error && (
                    <Alert type="warning" showIcon message={data.error} />
                )}
                <Space wrap>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => load(kind)}
                        loading={loadingKind === kind}
                    >
                        刷新
                    </Button>
                    <Upload
                        showUploadList={false}
                        multiple={false}
                        beforeUpload={file => {
                            void handleUpload(file as File)
                            return Upload.LIST_IGNORE
                        }}
                    >
                        <Button type="primary" icon={<UploadOutlined />} disabled={!!uploading}>
                            上传{meta.label}
                        </Button>
                    </Upload>
                    <span className="art-table-muted" style={{fontSize: 12}}>
                        上传文件将直接写入主机 {meta.label}目录，同名文件会被覆盖
                    </span>
                </Space>
                {isUploading && (
                    <Progress
                        percent={uploading?.percent || 0}
                        status="active"
                        format={percent => `${percent}%`}
                    />
                )}
                <Table
                    rowKey="name"
                    size="small"
                    dataSource={data?.files || []}
                    columns={columns(kind)}
                    loading={loadingKind === kind}
                    pagination={{pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 个文件`}}
                    locale={{emptyText: '目录内暂无镜像文件'}}
                />
            </div>
        )
    }

    const renderPlatform = () => {
        if (platformLoading && !platform) {
            return (
                <div className="art-loading">
                    <Spin size="large" />
                    <span>正在读取平台配置…</span>
                </div>
            )
        }
        const sections = platform?.sections || []
        if (!sections.length) {
            return <Empty description="该平台暂无可展示的配置项目" />
        }
        return (
            <div className="art-stack">
                {sections.map(section => (
                    <Card
                        key={section.key}
                        size="small"
                        title={section.title}
                        extra={section.hint
                            ? <span className="art-table-muted" style={{fontSize: 12}}>{section.hint}</span>
                            : null}
                    >
                        {section.error ? (
                            <Alert type="warning" showIcon message={section.error} />
                        ) : section.rows.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可列出的项目" />
                        ) : (
                            <Table
                                rowKey={record => `${section.key}-${record.key}`}
                                size="small"
                                dataSource={section.rows.map((row, index) => ({key: index, row}))}
                                columns={platformColumns(section)}
                                pagination={false}
                            />
                        )}
                    </Card>
                ))}
            </div>
        )
    }

    const hostOS = platform?.host_os || 'linux'
    const tabItems: {key: string; label: ReactNode; children: ReactNode}[] = [
        {
            key: 'system',
            label: <span><DatabaseOutlined /> {KIND_META.system.label}</span>,
            children: renderPanel('system'),
        },
        {
            key: 'iso',
            label: <span><FileZipOutlined /> {KIND_META.iso.label}</span>,
            children: renderPanel('iso'),
        },
    ]
    if (platform?.sections?.length) {
        tabItems.push({
            key: 'platform',
            label: <span><ClusterOutlined /> 平台配置</span>,
            children: renderPlatform(),
        })
    }
    // Windows 主机（Hyper-V / Workstation）没有 Linux Shell，不展示终端页签
    if (hostOS === 'linux') {
        tabItems.push({
            key: 'terminal',
            label: <span><CodeOutlined /> 终端</span>,
            children: <HostTerminalPanel hostName={hostName} />,
        })
    }
    tabItems.push(
        {
            key: 'files',
            label: <span><FolderOpenOutlined /> 文件</span>,
            children: <HostFilePanel hostName={hostName} />,
        },
        {
            key: 'firewall',
            label: <span><SafetyCertificateOutlined /> 防火墙</span>,
            children: <HostFirewallPanel hostName={hostName} />,
        },
        {
            key: 'processes',
            label: <span><ThunderboltOutlined /> 进程</span>,
            children: <HostProcessPanel hostName={hostName} />,
        },
        {
            key: 'services',
            label: <span><SettingOutlined /> 服务</span>,
            children: <HostServicePanel hostName={hostName} />,
        },
    )

    return (
        <>
            <Drawer
                title={`管理主机 · ${hostName}`}
                open={open}
                onClose={onClose}
                width="min(1180px, 100vw)"
                destroyOnHidden
                extra={
                    activeTab === 'system' || activeTab === 'iso' ? (
                        <Button
                            icon={<FolderOpenOutlined />}
                            onClick={() => load(activeKind)}
                            loading={loadingKind === activeKind}
                        >
                            刷新
                        </Button>
                    ) : activeTab === 'platform' ? (
                        <Button
                            icon={<FolderOpenOutlined />}
                            onClick={loadPlatform}
                            loading={platformLoading}
                        >
                            刷新
                        </Button>
                    ) : null
                }
            >
                <Tabs
                    tabPosition="left"
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                />
            </Drawer>

            <Modal
                title={`重命名 · ${renameTarget?.file.name || ''}`}
                open={!!renameTarget}
                onCancel={() => setRenameTarget(null)}
                onOk={submitRename}
                okText="保存"
                cancelText="取消"
                confirmLoading={busy}
                destroyOnHidden
            >
                <Form form={renameForm} layout="vertical" preserve={false}>
                    <Form.Item
                        name="new_name"
                        label="新文件名"
                        rules={[
                            {required: true, message: '请输入新文件名'},
                            {
                                validator: (_, value: string) => {
                                    if (value && /[\\/]/.test(value)) {
                                        return Promise.reject(new Error('文件名不能包含路径分隔符'))
                                    }
                                    return Promise.resolve()
                                },
                            },
                        ]}
                    >
                        <Input placeholder="例如 ubuntu-24.04.qcow2" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`绑定镜像管理 · ${bindTarget?.file.name || ''}`}
                open={!!bindTarget}
                onCancel={() => setBindTarget(null)}
                onOk={submitBind}
                okText="确认绑定"
                cancelText="取消"
                confirmLoading={busy}
                destroyOnHidden
            >
                <Form form={bindForm} layout="vertical" preserve={false}>
                    <Form.Item label="镜像文件">
                        <Input value={bindTarget?.file.name} disabled />
                    </Form.Item>
                    <Form.Item
                        name="sys_name"
                        label="显示名称"
                        rules={[{required: true, message: '请输入显示名称'}]}
                    >
                        <Input placeholder="创建虚拟机时展示的镜像名称" />
                    </Form.Item>
                    <Form.Item
                        name="sys_size"
                        label="最低磁盘大小（GB）"
                        extra={bindTarget?.kind === 'iso' ? 'ISO 镜像通常不需要填写' : undefined}
                    >
                        <InputNumber min={1} max={4096} style={{width: '100%'}} placeholder="例如 20" />
                    </Form.Item>
                    <Form.Item
                        name="sys_type"
                        label="系统类型"
                        extra={bindTarget?.kind === 'iso' ? 'ISO 镜像通常不需要选择' : undefined}
                    >
                        <Select allowClear placeholder="选择系统类型">
                            <Select.Option value="WinNT">WinNT</Select.Option>
                            <Select.Option value="Linux">Linux</Select.Option>
                            <Select.Option value="macOS">macOS</Select.Option>
                        </Select>
                    </Form.Item>
                    <Alert
                        type="info"
                        showIcon
                        message={
                            bindTarget?.kind === 'iso'
                                ? '绑定后该 ISO 会出现在镜像管理的 ISO 列表中，可直接挂载到虚拟机。'
                                : '绑定后该磁盘镜像会出现在镜像管理的系统模板列表中，创建虚拟机时可选。'
                        }
                    />
                </Form>
            </Modal>
        </>
    )
}
