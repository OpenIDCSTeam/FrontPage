import {useCallback, useEffect, useState} from 'react'
import {
    Alert,
    Button,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    message,
} from 'antd'
import {PlusOutlined, ReloadOutlined} from '@ant-design/icons'
import type {ColumnsType} from 'antd/es/table'
import {isAxiosError} from 'axios'
import {addHostFirewallRule, deleteHostFirewallRule, getHostFirewallRules} from '@/utils/apis'
import type {HostFirewallRule} from '@/utils/apis'

interface Props {
    hostName: string
}

function errorMessage(error: unknown): string {
    if (isAxiosError(error)) return error.response?.data?.msg || error.message
    return error instanceof Error ? error.message : '操作失败，请重试'
}

export default function HostFirewallPanel({hostName}: Props) {
    const [rules, setRules] = useState<HostFirewallRule[]>([])
    const [osType, setOsType] = useState<'linux' | 'windows'>('linux')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [addOpen, setAddOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [form] = Form.useForm()

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const result = await getHostFirewallRules(hostName)
            setOsType(result.data?.os === 'windows' ? 'windows' : 'linux')
            setRules(result.data?.rules || [])
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setLoading(false)
        }
    }, [hostName])

    useEffect(() => {
        void load()
    }, [load])

    const submitAdd = async () => {
        let values: {protocol: string; port?: string; source?: string; target: string; comment?: string}
        try {
            values = await form.validateFields()
        } catch {
            return
        }
        setBusy(true)
        try {
            await addHostFirewallRule(hostName, {
                protocol: values.protocol,
                port: values.port || '',
                source: values.source || '',
                target: values.target,
                comment: values.comment || '',
            })
            message.success('规则已添加')
            setAddOpen(false)
            await load()
        } catch (err) {
            message.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    const remove = async (rule: HostFirewallRule) => {
        try {
            await deleteHostFirewallRule(hostName, rule.id)
            message.success('规则已删除')
            await load()
        } catch (err) {
            message.error(errorMessage(err))
        }
    }

    const columns: ColumnsType<HostFirewallRule> = [
        {
            title: osType === 'windows' ? '规则' : '编号',
            dataIndex: 'id',
            width: 120,
            ellipsis: true,
            render: (id: string) => <span className="art-table-mono" title={id}>{id}</span>,
        },
        {
            title: '动作',
            dataIndex: 'target',
            width: 100,
            render: (target: string) => (
                <Tag color={target === 'ACCEPT' ? 'success' : 'error'} style={{margin: 0}}>{target || '-'}</Tag>
            ),
        },
        {
            title: '协议',
            dataIndex: 'protocol',
            width: 90,
            render: (protocol: string) => <span className="art-table-mono">{protocol || '-'}</span>,
        },
        {
            title: '源地址',
            dataIndex: 'source',
            width: 170,
            render: (source: string) => <span className="art-table-mono">{source || '-'}</span>,
        },
        {
            title: '端口',
            dataIndex: 'port',
            width: 100,
            render: (port: string) => <span className="art-table-mono">{port || '-'}</span>,
        },
        {
            title: '备注',
            dataIndex: 'comment',
            ellipsis: true,
            render: (comment: string) => <span className="art-table-muted" title={comment}>{comment || '-'}</span>,
        },
        {
            title: '操作',
            key: 'actions',
            width: 90,
            render: (_: unknown, record) => (
                <Popconfirm
                    title="删除该规则？"
                    okText="删除"
                    okType="danger"
                    cancelText="取消"
                    onConfirm={() => remove(record)}
                >
                    <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
            ),
        },
    ]

    const serviceDown = error.includes('未运行')

    return (
        <div className="art-stack">
            <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={serviceDown}
                    onClick={() => {
                        form.resetFields()
                        form.setFieldsValue({
                            protocol: 'tcp',
                            target: 'ACCEPT',
                            source: '',
                        })
                        setAddOpen(true)
                    }}
                >
                    添加规则
                </Button>
                <Tag style={{margin: 0}}>{osType === 'windows' ? 'Windows 防火墙（入站）' : 'iptables INPUT 链'}</Tag>
                <span className="art-table-muted" style={{fontSize: 12}}>
                    {osType === 'windows'
                        ? '规则标识为 Windows 防火墙规则名，删除时按名称移除'
                        : '规则编号来自 iptables --line-numbers，删除时按编号移除'}
                </span>
            </Space>
            {error && (
                <Alert
                    type={serviceDown ? 'warning' : 'error'}
                    showIcon
                    message={serviceDown ? 'Windows 防火墙服务未运行' : '防火墙规则读取失败'}
                    description={error}
                />
            )}
            <Table
                rowKey="id"
                size="small"
                dataSource={rules}
                columns={columns}
                loading={loading}
                pagination={{pageSize: 15, showSizeChanger: true, showTotal: total => `共 ${total} 条规则`}}
                locale={{emptyText: '暂无防火墙规则'}}
            />

            <Modal
                title="添加防火墙规则"
                open={addOpen}
                onCancel={() => setAddOpen(false)}
                onOk={submitAdd}
                okText="添加"
                cancelText="取消"
                confirmLoading={busy}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" preserve={false}>
                    <Form.Item name="target" label="动作" rules={[{required: true, message: '请选择动作'}]}>
                        <Select>
                            <Select.Option value="ACCEPT">允许（ACCEPT / Allow）</Select.Option>
                            <Select.Option value="DROP">拒绝（DROP / Block）</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="protocol" label="协议" rules={[{required: true, message: '请选择协议'}]}>
                        <Select>
                            <Select.Option value="tcp">TCP</Select.Option>
                            <Select.Option value="udp">UDP</Select.Option>
                            <Select.Option value="icmp">ICMP</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="port"
                        label="端口"
                        extra="留空表示不限制端口；Windows 需填写端口才能精确放行"
                    >
                        <Input placeholder="例如 22 或 8000-8100" />
                    </Form.Item>
                    <Form.Item
                        name="source"
                        label="源地址"
                        extra="留空表示 0.0.0.0/0；可填单个 IP 或 CIDR"
                    >
                        <Input placeholder="例如 10.0.0.0/8" />
                    </Form.Item>
                    <Form.Item name="comment" label="备注">
                        <Input placeholder="规则用途说明" />
                    </Form.Item>
                    <Alert
                        type="info"
                        showIcon
                        message={osType === 'windows'
                            ? 'Windows 使用 New-NetFirewallRule 创建入站规则'
                            : 'iptables 规则追加到 INPUT 链，重启后是否保留取决于主机是否启用规则持久化'}
                    />
                </Form>
            </Modal>
        </div>
    )
}
