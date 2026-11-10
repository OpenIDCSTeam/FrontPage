import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Col,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  message,
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import api from '@/utils/apis.ts'
import type { FirewallRule, FirewallState } from '@/types'

interface FirewallPanelProps {
  hostName: string
  vmUuid: string
  /** 是否具备防火墙编辑权限（admin 或所有者权限位 FIREWALLS） */
  canEdit: boolean
  /** 主机被禁用时只读 */
  hostEnabled: boolean
}

interface FirewallDraft {
  enabled: boolean
  policyIn: string
  policyOut: string
}

interface FirewallFormValues {
  type: 'in' | 'out'
  action: string
  enable?: boolean
  proto?: string
  source?: string
  dest?: string
  sport?: string
  dport?: string
  comment?: string
}

/** 取接口错误文案，兼容 axios 抛出的 Error 与普通对象 */
function errorText(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  return fallback
}

const POLICY_OPTIONS = [
  { value: 'ACCEPT', label: 'ACCEPT（放行）' },
  { value: 'DROP', label: 'DROP（静默丢弃）' },
  { value: 'REJECT', label: 'REJECT（拒绝并回包）' },
]

// Hyper-V 扩展 ACL 只有 Allow / Deny，没有 REJECT
const HYPERV_ACTION_OPTIONS = [
  { value: 'ACCEPT', label: 'ACCEPT（放行）' },
  { value: 'DROP', label: 'DROP（阻止）' },
]

const PROTO_OPTIONS = [
  { value: '', label: '任意协议' },
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
  { value: 'icmp', label: 'ICMP' },
  { value: 'icmpv6', label: 'ICMPv6' },
]

const ACTION_COLOR: Record<string, string> = {
  ACCEPT: 'success',
  DROP: 'error',
  REJECT: 'warning',
}

/** 端口列展示：源端口 → 目的端口，未限制时显示「任意」 */
function formatPorts(rule: FirewallRule): string {
  const sport = (rule.sport || '').trim()
  const dport = (rule.dport || '').trim()
  if (!sport && !dport) return '任意'
  if (sport && dport) return `${sport} → ${dport}`
  if (dport) return `→ ${dport}`
  return `${sport} → 任意`
}

/**
 * 虚拟机防火墙面板。
 *
 * 数据全部来自虚拟化平台（当前为 PVE 原生防火墙），主控不缓存副本，
 * 因此这里不参与详情页的轮询，只在挂载、手动刷新或写入成功后重新拉取。
 */
export default function FirewallPanel({ hostName, vmUuid, canEdit, hostEnabled }: FirewallPanelProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [state, setState] = useState<FirewallState | null>(null)
  const [rules, setRules] = useState<FirewallRule[]>([])
  const [draft, setDraft] = useState<FirewallDraft | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FirewallRule | null>(null)
  const [form] = Form.useForm()

  const editable = canEdit && hostEnabled
  // Hyper-V 使用虚拟网卡扩展 ACL：没有总开关、默认策略与 REJECT
  const isHyperV = state?.platform === 'hyperv'
  const actionOptions = isHyperV ? HYPERV_ACTION_OPTIONS : POLICY_OPTIONS
  // Hyper-V 的端口范围用 - 分隔，PVE 用 :
  const portPattern = isHyperV ? /^[0-9:,-]*$/ : /^[0-9:,]*$/
  const portRuleMessage = isHyperV
    ? '只支持数字、端口范围（a-b 或 a:b）'
    : '只支持数字、端口范围（a:b）与列表（a,b）'

  const load = useCallback(async () => {
    if (!hostName || !vmUuid) return
    setLoading(true)
    setError('')
    try {
      const res = await api.getFirewall(hostName, vmUuid)
      if (res.code === 200 && res.data) {
        const nextState = res.data.state
        setState(nextState)
        setRules(Array.isArray(res.data.rules) ? res.data.rules : [])
        setDraft({
          enabled: Boolean(nextState.enabled),
          policyIn: nextState.policy_in || 'DROP',
          policyOut: nextState.policy_out || 'ACCEPT',
        })
      } else {
        setError(res.msg || '加载防火墙配置失败')
      }
    } catch (e) {
      setError(errorText(e, '加载防火墙配置失败'))
    } finally {
      setLoading(false)
    }
  }, [hostName, vmUuid])

  useEffect(() => {
    void load()
  }, [load])

  const dirty = useMemo(() => {
    if (!state || !draft) return false
    return draft.enabled !== Boolean(state.enabled)
      || draft.policyIn !== (state.policy_in || 'DROP')
      || draft.policyOut !== (state.policy_out || 'ACCEPT')
  }, [state, draft])

  const warnText = useMemo(() => {
    if (!state) return ''
    if (state.cluster_enabled === false) {
      return 'PVE 数据中心防火墙未启用，虚拟机规则不会生效。请先在 PVE「数据中心 → 防火墙 → 选项」中开启。'
    }
    if (state.node_enabled === false) {
      return '当前节点防火墙未启用，虚拟机规则不会生效。请先在 PVE 节点「防火墙 → 选项」中开启。'
    }
    if (!state.enabled) {
      return '虚拟机防火墙当前未启用，已保存的规则不会生效。'
    }
    if (!state.effective) {
      return '无法确认集群 / 节点防火墙状态（当前账号可能无权读取），规则是否生效请以 PVE 平台为准。'
    }
    return ''
  }, [state])

  const handleSaveOptions = async () => {
    if (!draft || !editable) return
    setSaving(true)
    const hide = message.loading('正在保存防火墙配置...', 0)
    try {
      await api.updateFirewallOptions(hostName, vmUuid, {
        enable: draft.enabled,
        policy_in: draft.policyIn,
        policy_out: draft.policyOut,
      })
      message.success('防火墙配置已保存')
      await load()
    } catch (e) {
      message.error(errorText(e, '保存失败'))
    } finally {
      hide()
      setSaving(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      type: 'in',
      action: 'ACCEPT',
      proto: '',
      enable: true,
      source: '',
      dest: '',
      sport: '',
      dport: '',
      comment: '',
    })
    setModalOpen(true)
  }

  const openEdit = (rule: FirewallRule) => {
    setEditing(rule)
    form.resetFields()
    form.setFieldsValue({
      type: rule.type || 'in',
      action: rule.action || 'ACCEPT',
      proto: rule.proto || '',
      enable: rule.enable !== false,
      source: rule.source || '',
      dest: rule.dest || '',
      sport: rule.sport || '',
      dport: rule.dport || '',
      comment: rule.comment || '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: FirewallFormValues) => {
    if (!editable) return
    setSaving(true)
    const hide = message.loading(editing ? '正在保存规则...' : '正在添加规则...', 0)
    try {
      const payload = {
        type: values.type,
        action: values.action,
        enable: values.enable !== false,
        proto: values.proto || '',
        source: (values.source || '').trim(),
        dest: (values.dest || '').trim(),
        sport: (values.sport || '').trim(),
        dport: (values.dport || '').trim(),
        comment: (values.comment || '').trim(),
      }
      if (editing) {
        await api.updateFirewallRule(hostName, vmUuid, editing.pos, payload)
        message.success('防火墙规则已保存')
      } else {
        await api.createFirewallRule(hostName, vmUuid, payload)
        message.success('防火墙规则已添加')
      }
      setModalOpen(false)
      await load()
    } catch (e) {
      message.error(errorText(e, '保存失败'))
    } finally {
      hide()
      setSaving(false)
    }
  }

  const handleDelete = async (rule: FirewallRule) => {
    if (!editable) return
    setSaving(true)
    const hide = message.loading('正在删除规则...', 0)
    try {
      await api.deleteFirewallRule(hostName, vmUuid, rule.pos)
      message.success('防火墙规则已删除')
      await load()
    } catch (e) {
      message.error(errorText(e, '删除失败'))
    } finally {
      hide()
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '方向',
      dataIndex: 'type',
      width: 80,
      render: (value: string) => (
        <Tag color={value === 'out' ? 'purple' : 'blue'}>{value === 'out' ? '出站' : '入站'}</Tag>
      ),
    },
    {
      title: '动作',
      dataIndex: 'action',
      width: 100,
      render: (value: string) => <Tag color={ACTION_COLOR[value] || 'default'}>{value}</Tag>,
    },
    {
      title: '协议',
      dataIndex: 'proto',
      width: 90,
      render: (value: string) => (value ? value.toUpperCase() : '任意'),
    },
    {
      title: '源地址',
      dataIndex: 'source',
      render: (value: string) => <span className="font-mono text-xs">{value || '任意'}</span>,
    },
    {
      title: '目的地址',
      dataIndex: 'dest',
      render: (value: string) => <span className="font-mono text-xs">{value || '任意'}</span>,
    },
    {
      title: '端口',
      key: 'ports',
      render: (_: unknown, record: FirewallRule) => <span className="font-mono text-xs">{formatPorts(record)}</span>,
    },
    // Hyper-V 扩展 ACL 没有描述与单条启停
    ...(isHyperV ? [] : [{
      title: '备注',
      dataIndex: 'comment',
      render: (value: string) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'enable',
      width: 80,
      render: (value: boolean) => (value ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    }]),
    {
      title: '操作',
      key: 'ops',
      width: 150,
      render: (_: unknown, record: FirewallRule) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            disabled={!editable || saving}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除该规则？"
            description="删除后立即在平台生效，且无法恢复。"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            disabled={!editable || saving}
            onConfirm={() => handleDelete(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={!editable || saving} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (loading && !state) {
    return (
      <div className="text-center py-10">
        <Spin><div style={{ marginTop: 12 }}>加载防火墙配置...</div></Spin>
      </div>
    )
  }

  if (error && !state) {
    return (
      <Alert
        type="error"
        showIcon
        message="加载防火墙配置失败"
        description={error}
        action={<Button size="small" onClick={() => void load()}>重试</Button>}
      />
    )
  }

  return (
    <div className="vm-firewall-panel">
      <Card size="small" variant="borderless" className="glass-card-transparent">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space wrap size={24}>
            <Space size={8}>
              <SafetyCertificateOutlined />
              <span style={{ fontWeight: 600 }}>防火墙</span>
              {!isHyperV && (
                <Switch
                  checked={Boolean(draft?.enabled)}
                  disabled={!editable || saving || !draft}
                  checkedChildren="已启用"
                  unCheckedChildren="已停用"
                  onChange={(checked) => setDraft((prev) => (prev ? { ...prev, enabled: checked } : prev))}
                />
              )}
            </Space>
            {!isHyperV && (
              <Space size={8}>
                <span>入站默认策略</span>
                <Select
                  value={draft?.policyIn}
                  disabled={!editable || saving || !draft}
                  style={{ width: 170 }}
                  options={POLICY_OPTIONS}
                  onChange={(value) => setDraft((prev) => (prev ? { ...prev, policyIn: value } : prev))}
                />
              </Space>
            )}
            {!isHyperV && (
              <Space size={8}>
                <span>出站默认策略</span>
                <Select
                  value={draft?.policyOut}
                  disabled={!editable || saving || !draft}
                  style={{ width: 170 }}
                  options={POLICY_OPTIONS}
                  onChange={(value) => setDraft((prev) => (prev ? { ...prev, policyOut: value } : prev))}
                />
              </Space>
            )}
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} disabled={loading || saving} onClick={() => void load()}>
              刷新
            </Button>
            {!isHyperV && (
              <Button type="primary" disabled={!dirty || !editable || saving} onClick={() => void handleSaveOptions()}>
                保存设置
              </Button>
            )}
          </Space>
        </div>
        <div style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 12 }}>
          {isHyperV
            ? 'Hyper-V 使用虚拟网卡扩展 ACL，默认放行全部流量；规则按权重从大到小匹配，无法设置总开关与单条启停。'
            : '规则由虚拟化平台保存并立即生效。默认策略设为 DROP / REJECT 前，请先确认已放行必要的管理端口（SSH、RDP 等）。'}
        </div>
      </Card>

      {warnText && (
        <Alert style={{ marginTop: 12 }} type="warning" showIcon message={warnText} />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '16px 0 12px',
        }}
      >
        <span style={{ fontWeight: 600 }}>规则列表（{rules.length}）</span>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!editable || saving}
          onClick={openCreate}
        >
          添加规则
        </Button>
      </div>

      <Table
        dataSource={rules}
        columns={columns}
        rowKey={(record) => String(record.pos)}
        size="small"
        pagination={false}
        loading={loading}
        scroll={{ x: 900 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无防火墙规则" /> }}
      />

      <Modal
        title={editing ? '编辑防火墙规则' : '添加防火墙规则'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        width={640}
      >
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message="规则按位置从上到下匹配；源 / 目的 / 端口留空表示任意。"
        />
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="方向" name="type" rules={[{ required: true, message: '请选择方向' }]}>
                <Select
                  options={[
                    { value: 'in', label: '入站（进入虚拟机）' },
                    { value: 'out', label: '出站（离开虚拟机）' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="动作" name="action" rules={[{ required: true, message: '请选择动作' }]}>
                <Select options={actionOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="协议" name="proto">
                <Select options={PROTO_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="源地址" name="source">
                <Input placeholder="留空表示任意，如 192.168.1.0/24" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="目的地址" name="dest">
                <Input placeholder="留空表示任意，如 10.0.0.5" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={isHyperV ? 12 : 8}>
              <Form.Item
                label="源端口"
                name="sport"
                rules={[{ pattern: portPattern, message: portRuleMessage }]}
              >
                <Input placeholder={isHyperV ? '如 1024-65535，留空任意' : '如 1024:65535，留空任意'} />
              </Form.Item>
            </Col>
            <Col span={isHyperV ? 12 : 8}>
              <Form.Item
                label="目的端口"
                name="dport"
                rules={[{ pattern: portPattern, message: portRuleMessage }]}
              >
                <Input placeholder={isHyperV ? '如 22 或 8000-9000，留空任意' : '如 22 或 8000:9000，留空任意'} />
              </Form.Item>
            </Col>
            {!isHyperV && (
              <Col span={8}>
                <Form.Item label="启用" name="enable" valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="停用" />
                </Form.Item>
              </Col>
            )}
          </Row>

          {!isHyperV && (
            <Form.Item label="备注" name="comment">
              <Input maxLength={128} placeholder="例如：放行 SSH 管理端口" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
