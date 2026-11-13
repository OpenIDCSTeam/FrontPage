import {useCallback, useEffect, useState} from 'react'
import {Alert, Button, Input, Space, Table, Tag, Tooltip, message} from 'antd'
import {
    CaretRightOutlined,
    PoweroffOutlined,
    ReloadOutlined,
    SearchOutlined,
    SyncOutlined,
} from '@ant-design/icons'
import type {ColumnsType} from 'antd/es/table'
import {isAxiosError} from 'axios'
import {controlHostService, getHostServices} from '@/utils/apis'
import type {HostServiceItem} from '@/utils/apis'

interface Props {
    hostName: string
}

function errorMessage(error: unknown): string {
    if (isAxiosError(error)) return error.response?.data?.msg || error.message
    return error instanceof Error ? error.message : '操作失败，请重试'
}

export default function HostServicePanel({hostName}: Props) {
    const [items, setItems] = useState<HostServiceItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [keyword, setKeyword] = useState('')
    const [acting, setActing] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const result = await getHostServices(hostName)
            setItems(result.data?.items || [])
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setLoading(false)
        }
    }, [hostName])

    useEffect(() => {
        void load()
    }, [load])

    const control = async (name: string, action: 'start' | 'stop' | 'restart') => {
        setActing(`${name}:${action}`)
        try {
            await controlHostService(hostName, name, action)
            message.success('操作已完成')
            await load()
        } catch (err) {
            message.error(errorMessage(err))
        } finally {
            setActing('')
        }
    }

    const columns: ColumnsType<HostServiceItem> = [
        {
            title: '服务名',
            dataIndex: 'name',
            ellipsis: true,
            render: (name: string) => <span className="art-table-mono" title={name}>{name}</span>,
        },
        {
            title: '状态',
            dataIndex: 'active',
            width: 100,
            render: (active: string, record) => {
                const isActive = active === 'active'
                return (
                    <Tag color={isActive ? 'success' : 'default'} style={{margin: 0}}>
                        {isActive ? '运行中' : (record.sub || '已停止')}
                    </Tag>
                )
            },
        },
        {
            title: '启动类型',
            dataIndex: 'load',
            width: 120,
            render: (load: string) => <span className="art-table-muted">{load || '-'}</span>,
        },
        {
            title: '描述',
            dataIndex: 'description',
            ellipsis: true,
            render: (desc: string) => <span className="art-table-muted" title={desc}>{desc || '-'}</span>,
        },
        {
            title: '操作',
            key: 'actions',
            width: 210,
            render: (_: unknown, record) => {
                const running = record.active === 'active'
                return (
                    <Space size={0} wrap>
                        {running ? (
                            <Tooltip title="停止服务">
                                <Button
                                    type="link"
                                    size="small"
                                    danger
                                    icon={<PoweroffOutlined />}
                                    loading={acting === `${record.name}:stop`}
                                    onClick={() => control(record.name, 'stop')}
                                >
                                    停止
                                </Button>
                            </Tooltip>
                        ) : (
                            <Tooltip title="启动服务">
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<CaretRightOutlined />}
                                    loading={acting === `${record.name}:start`}
                                    onClick={() => control(record.name, 'start')}
                                >
                                    启动
                                </Button>
                            </Tooltip>
                        )}
                        <Button
                            type="link"
                            size="small"
                            icon={<SyncOutlined />}
                            loading={acting === `${record.name}:restart`}
                            onClick={() => control(record.name, 'restart')}
                        >
                            重启
                        </Button>
                    </Space>
                )
            },
        },
    ]

    const filtered = items.filter(item => {
        const query = keyword.trim().toLowerCase()
        if (!query) return true
        return `${item.name} ${item.description}`.toLowerCase().includes(query)
    })

    return (
        <div className="art-stack">
            <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
                <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="搜索服务名或描述"
                    value={keyword}
                    onChange={event => setKeyword(event.target.value)}
                    style={{width: 260}}
                />
                <span className="art-table-muted" style={{fontSize: 12}}>
                    服务操作需要主机管理员权限，失败时会在上方提示原因
                </span>
            </Space>
            {error && <Alert type="error" showIcon message={error} />}
            <Table
                rowKey="name"
                size="small"
                dataSource={filtered}
                columns={columns}
                loading={loading}
                pagination={{pageSize: 15, showSizeChanger: true, showTotal: total => `共 ${total} 个服务`}}
                locale={{emptyText: '暂无服务数据'}}
            />
        </div>
    )
}
