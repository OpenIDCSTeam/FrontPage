import {useCallback, useEffect, useState} from 'react'
import {
    Alert,
    Breadcrumb,
    Button,
    Form,
    Input,
    Modal,
    Popconfirm,
    Progress,
    Space,
    Table,
    Tag,
    Tooltip,
    Upload,
    message,
} from 'antd'
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    FileOutlined,
    FolderAddOutlined,
    FolderOutlined,
    HomeOutlined,
    ReloadOutlined,
    UploadOutlined,
} from '@ant-design/icons'
import type {ColumnsType} from 'antd/es/table'
import {isAxiosError} from 'axios'
import {
    createHostDir,
    deleteHostPath,
    getHostFiles,
    hostFileDownloadUrl,
    renameHostPath,
    uploadHostFile,
} from '@/utils/apis'
import type {HostFileItem} from '@/utils/apis'

interface Props {
    hostName: string
}

function errorMessage(error: unknown): string {
    if (isAxiosError(error)) return error.response?.data?.msg || error.message
    return error instanceof Error ? error.message : '操作失败，请重试'
}

function formatSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '-'
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

/** 路径拆分：Windows 保留盘符，Linux 从根开始 */
function splitPath(full: string, isWindows: boolean): {label: string; path: string}[] {
    if (isWindows) {
        const normalized = full.replace(/\//g, '\\')
        const parts = normalized.split('\\').filter(Boolean)
        const crumbs: {label: string; path: string}[] = []
        let acc = ''
        parts.forEach((part, index) => {
            if (index === 0) {
                acc = part + '\\'
            } else {
                acc = acc.endsWith('\\') ? acc + part : acc + '\\' + part
            }
            crumbs.push({label: part, path: acc})
        })
        return crumbs
    }
    const crumbs: {label: string; path: string}[] = [{label: '/', path: '/'}]
    let acc = ''
    full.split('/').filter(Boolean).forEach(part => {
        acc = `${acc}/${part}`
        crumbs.push({label: part, path: acc})
    })
    return crumbs
}

/** 上一级目录 */
function parentOf(full: string, isWindows: boolean): string {
    if (isWindows) {
        const normalized = full.replace(/\//g, '\\').replace(/\\+$/, '')
        const index = normalized.lastIndexOf('\\')
        if (index <= 2) return normalized.slice(0, 3) || 'C:\\'
        return normalized.slice(0, index)
    }
    const trimmed = full.replace(/\/+$/, '')
    if (!trimmed) return '/'
    const index = trimmed.lastIndexOf('/')
    return index <= 0 ? '/' : trimmed.slice(0, index)
}

export default function HostFilePanel({hostName}: Props) {
    const [osType, setOsType] = useState<'linux' | 'windows'>('linux')
    const [currentPath, setCurrentPath] = useState('')
    const [pathInput, setPathInput] = useState('')
    const [items, setItems] = useState<HostFileItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [uploading, setUploading] = useState<{name: string; percent: number} | null>(null)
    const [renameTarget, setRenameTarget] = useState<HostFileItem | null>(null)
    const [mkdirOpen, setMkdirOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [renameForm] = Form.useForm()
    const [mkdirForm] = Form.useForm()

    const load = useCallback(async (target?: string) => {
        setLoading(true)
        setError('')
        try {
            const result = await getHostFiles(hostName, target ?? '')
            if (result.data) {
                setOsType(result.data.os === 'windows' ? 'windows' : 'linux')
                setCurrentPath(result.data.path)
                setPathInput(result.data.path)
                setItems(result.data.items || [])
            }
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setLoading(false)
        }
    }, [hostName])

    useEffect(() => {
        void load()
    }, [load])

    const openDir = (item: HostFileItem) => {
        const separator = osType === 'windows' ? '\\' : '/'
        const base = currentPath.endsWith(separator) ? currentPath.slice(0, -1) : currentPath
        const next = `${base}${separator}${item.name}`
        void load(next)
    }

    const download = (item: HostFileItem) => {
        const link = document.createElement('a')
        link.href = hostFileDownloadUrl(hostName, currentPath, item.name)
        link.download = item.name
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    const handleUpload = async (file: File) => {
        if (uploading) {
            message.warning('已有文件正在上传')
            return
        }
        setUploading({name: file.name, percent: 0})
        try {
            await uploadHostFile(hostName, currentPath, file, percent => {
                setUploading(prev => (prev && prev.name === file.name ? {...prev, percent} : prev))
            })
            message.success(`已上传 ${file.name}`)
            await load()
        } catch (err) {
            message.error(errorMessage(err))
        } finally {
            setUploading(null)
        }
    }

    const submitRename = async () => {
        if (!renameTarget) return
        let values: {new_name: string}
        try {
            values = await renameForm.validateFields()
        } catch {
            return
        }
        setBusy(true)
        try {
            await renameHostPath(hostName, currentPath, renameTarget.name, values.new_name.trim())
            message.success('重命名成功')
            setRenameTarget(null)
            await load()
        } catch (err) {
            message.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    const submitMkdir = async () => {
        let values: {name: string}
        try {
            values = await mkdirForm.validateFields()
        } catch {
            return
        }
        setBusy(true)
        try {
            await createHostDir(hostName, currentPath, values.name.trim())
            message.success('目录已创建')
            setMkdirOpen(false)
            await load()
        } catch (err) {
            message.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    const remove = async (item: HostFileItem) => {
        try {
            await deleteHostPath(hostName, currentPath, item.name)
            message.success('删除成功')
            await load()
        } catch (err) {
            message.error(errorMessage(err))
        }
    }

    const columns: ColumnsType<HostFileItem> = [
        {
            title: '名称',
            dataIndex: 'name',
            ellipsis: true,
            render: (name: string, record) => (
                <span
                    style={{cursor: record.is_dir ? 'pointer' : 'default'}}
                    onClick={() => record.is_dir && openDir(record)}
                >
                    {record.is_dir
                        ? <FolderOutlined style={{color: 'var(--art-warning)', marginRight: 6}} />
                        : <FileOutlined style={{marginRight: 6}} />}
                    <span className={record.is_dir ? 'art-table-link' : 'art-table-mono'}>{name}</span>
                </span>
            ),
        },
        {
            title: '大小',
            dataIndex: 'size',
            width: 100,
            render: (size: number, record) => (
                <span className="art-table-mono">{record.is_dir ? '-' : formatSize(size)}</span>
            ),
        },
        {
            title: '权限',
            dataIndex: 'mode',
            width: 120,
            render: (mode: string) => <span className="art-table-mono">{mode || '-'}</span>,
        },
        {
            title: '属主',
            dataIndex: 'owner',
            width: 100,
            render: (owner: string) => <span className="art-table-muted">{owner || '-'}</span>,
        },
        {
            title: '修改时间',
            dataIndex: 'mod_time',
            width: 170,
            render: (ts: number) => <span className="art-table-muted">{formatTime(ts)}</span>,
        },
        {
            title: '操作',
            key: 'actions',
            width: 200,
            render: (_: unknown, record) => (
                <Space size={0} wrap>
                    {!record.is_dir && (
                        <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => download(record)}>
                            下载
                        </Button>
                    )}
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                            renameForm.setFieldsValue({new_name: record.name})
                            setRenameTarget(record)
                        }}
                    >
                        重命名
                    </Button>
                    <Popconfirm
                        title={`确认删除 ${record.name}？`}
                        description={record.is_dir ? '目录及其内容将被递归删除，且不可恢复。' : '文件将被永久删除。'}
                        okText="删除"
                        okType="danger"
                        cancelText="取消"
                        onConfirm={() => remove(record)}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ]

    const crumbs = splitPath(currentPath, osType === 'windows')

    return (
        <div className="art-stack">
            <Space.Compact style={{width: '100%'}}>
                <Input
                    value={pathInput}
                    onChange={event => setPathInput(event.target.value)}
                    onPressEnter={() => load(pathInput)}
                    placeholder={osType === 'windows' ? 'C:\\' : '/'}
                    prefix={<FolderOutlined />}
                />
                <Button onClick={() => load(pathInput)}>前往</Button>
            </Space.Compact>

            <Breadcrumb
                items={crumbs.map(crumb => ({
                    title: (
                        <a onClick={() => load(crumb.path)}>
                            {crumb.label === '/' ? <HomeOutlined /> : crumb.label}
                        </a>
                    ),
                }))}
            />

            <Space wrap>
                <Tooltip title="返回上一级">
                    <Button
                        icon={<HomeOutlined />}
                        onClick={() => load(parentOf(currentPath, osType === 'windows'))}
                    >
                        上一级
                    </Button>
                </Tooltip>
                <Button icon={<ReloadOutlined />} onClick={() => load()} loading={loading}>刷新</Button>
                <Button
                    icon={<FolderAddOutlined />}
                    onClick={() => {
                        mkdirForm.resetFields()
                        setMkdirOpen(true)
                    }}
                >
                    新建目录
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
                        上传文件
                    </Button>
                </Upload>
                <Tag style={{margin: 0}}>{osType === 'windows' ? 'Windows' : 'Linux'}</Tag>
            </Space>

            {uploading && (
                <Progress percent={uploading.percent} status="active" format={percent => `${percent}%`} />
            )}
            {error && <Alert type="error" showIcon message={error} />}

            <Table
                rowKey="name"
                size="small"
                dataSource={items}
                columns={columns}
                loading={loading}
                pagination={{pageSize: 15, showSizeChanger: true, showTotal: total => `共 ${total} 项`}}
                locale={{emptyText: '目录为空'}}
            />

            <Modal
                title={`重命名 · ${renameTarget?.name || ''}`}
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
                        label="新名称"
                        rules={[{required: true, message: '请输入新名称'}]}
                    >
                        <Input placeholder="新的文件或目录名" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="新建目录"
                open={mkdirOpen}
                onCancel={() => setMkdirOpen(false)}
                onOk={submitMkdir}
                okText="创建"
                cancelText="取消"
                confirmLoading={busy}
                destroyOnHidden
            >
                <Form form={mkdirForm} layout="vertical" preserve={false}>
                    <Form.Item
                        name="name"
                        label={`目录名（创建于 ${currentPath || '/'}）`}
                        rules={[{required: true, message: '请输入目录名'}]}
                    >
                        <Input placeholder="新目录名称" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
