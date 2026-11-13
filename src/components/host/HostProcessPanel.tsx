import {useCallback, useEffect, useState} from 'react'
import {Alert, Button, Input, Popconfirm, Space, Table, Tag, message} from 'antd'
import {ReloadOutlined, SearchOutlined} from '@ant-design/icons'
import type {ColumnsType} from 'antd/es/table'
import {isAxiosError} from 'axios'
import {getHostProcesses, killHostProcess} from '@/utils/apis'
import type {HostProcessItem} from '@/utils/apis'

interface Props {
    hostName: string
}

function errorMessage(error: unknown): string {
    if (isAxiosError(error)) return error.response?.data?.msg || error.message
    return error instanceof Error ? error.message : '操作失败，请重试'
}

export default function HostProcessPanel({hostName}: Props) {
    const [items, setItems] = useState<HostProcessItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [keyword, setKeyword] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const result = await getHostProcesses(hostName)
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

    const kill = async (pid: number) => {
        try {
            await killHostProcess(hostName, pid)
            message.success(`已向进程 ${pid} 发送结束信号`)
            await load()
        } catch (err) {
            message.error(errorMessage(err))
        }
    }

    const columns: ColumnsType<HostProcessItem> = [
        {
            title: 'PID',
            dataIndex: 'pid',
            width: 90,
            render: (pid: number) => <span className="art-table-mono">{pid}</span>,
        },
        {
            title: '用户',
            dataIndex: 'user',
            width: 110,
            render: (user: string) => <span className="art-table-muted">{user || '-'}</span>,
        },
        {
            title: 'CPU',
            dataIndex: 'cpu_desc',
            width: 90,
            render: (value: string, record) => (
                <span className="art-table-mono">{value || `${record.cpu?.toFixed?.(1) ?? record.cpu}%`}</span>
            ),
        },
        {
            title: '内存',
            dataIndex: 'mem_desc',
            width: 100,
            render: (value: string, record) => (
                <span className="art-table-mono">{value || `${record.mem?.toFixed?.(1) ?? record.mem}%`}</span>
            ),
        },
        {
            title: '状态',
            dataIndex: 'state',
            width: 90,
            render: (state: string) => <Tag style={{margin: 0}}>{state || '-'}</Tag>,
        },
        {
            title: '命令',
            dataIndex: 'command',
            ellipsis: true,
            render: (command: string) => (
                <span className="art-table-mono" title={command}>{command}</span>
            ),
        },
        {
            title: '操作',
            key: 'actions',
            width: 100,
            render: (_: unknown, record) => (
                <Popconfirm
                    title={`结束进程 ${record.pid}？`}
                    description="将发送 SIGTERM（Windows 为强制结束），可能影响主机上的服务。"
                    okText="结束"
                    okType="danger"
                    cancelText="取消"
                    onConfirm={() => kill(record.pid)}
                >
                    <Button type="link" size="small" danger>结束进程</Button>
                </Popconfirm>
            ),
        },
    ]

    const filtered = items.filter(item => {
        const query = keyword.trim().toLowerCase()
        if (!query) return true
        return `${item.pid} ${item.user} ${item.command}`.toLowerCase().includes(query)
    })

    return (
        <div className="art-stack">
            <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
                <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="搜索 PID / 用户 / 命令"
                    value={keyword}
                    onChange={event => setKeyword(event.target.value)}
                    style={{width: 260}}
                />
                <span className="art-table-muted" style={{fontSize: 12}}>
                    按 CPU 倒序展示前 120 个进程
                </span>
            </Space>
            {error && <Alert type="error" showIcon message={error} />}
            <Table
                rowKey="pid"
                size="small"
                dataSource={filtered}
                columns={columns}
                loading={loading}
                pagination={{pageSize: 15, showSizeChanger: true, showTotal: total => `共 ${total} 个进程`}}
                locale={{emptyText: '暂无进程数据'}}
            />
        </div>
    )
}
