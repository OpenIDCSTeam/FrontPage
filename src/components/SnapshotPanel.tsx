import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd'
import {
  ClockCircleOutlined,
  DeleteOutlined,
  HistoryOutlined,
  PlusOutlined,
  ReloadOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '@/utils/apis.ts'
import type { SnapshotInfo } from '@/types'

interface SnapshotPanelProps {
  hostName: string
  vmUuid: string
  /** 是否具备快照管理权限（复用备份权限位 VM_BACKUP） */
  canEdit: boolean
  /** 主机被禁用时只读 */
  hostEnabled: boolean
}

interface SnapshotFormValues {
  name: string
  description?: string
}

/** 生成全平台安全的默认快照名 */
function defaultSnapshotName(): string {
  return `snap-${dayjs().format('YYYYMMDD-HHmmss')}`
}

function errorText(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  return fallback
}

function formatTime(value?: number): string {
  if (!value) return '-'
  return dayjs.unix(value).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 虚拟机快照面板。
 *
 * 快照由虚拟化平台保存，主控不落库、不缓存，因此这里不参与详情页轮询，
 * 只在挂载、手动刷新或写入成功后重新拉取。
 */
export default function SnapshotPanel({ hostName, vmUuid, canEdit, hostEnabled }: SnapshotPanelProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const editable = canEdit && hostEnabled

  const load = useCallback(async () => {
    if (!hostName || !vmUuid) return
    setLoading(true)
    setError('')
    try {
      const res = await api.getVMSnapshots(hostName, vmUuid)
      if (res.code === 200) {
        setSnapshots(Array.isArray(res.data) ? res.data : [])
      } else {
        setError(res.msg || '加载快照列表失败')
      }
    } catch (e) {
      setError(errorText(e, '加载快照列表失败'))
    } finally {
      setLoading(false)
    }
  }, [hostName, vmUuid])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ name: defaultSnapshotName(), description: '' })
    setModalOpen(true)
  }

  const handleCreate = async (values: SnapshotFormValues) => {
    if (!editable) return
    setSaving(true)
    const hide = message.loading('正在创建快照...', 0)
    try {
      await api.createVMSnapshot(hostName, vmUuid, {
        name: values.name?.trim(),
        description: (values.description || '').trim(),
      })
      message.success('快照创建成功')
      setModalOpen(false)
      await load()
    } catch (e) {
      message.error(errorText(e, '创建快照失败'))
    } finally {
      hide()
      setSaving(false)
    }
  }

  const handleRestore = (snapshot: SnapshotInfo) => {
    if (!editable) return
    Modal.confirm({
      title: `回滚到快照「${snapshot.name}」？`,
      content: '回滚会丢弃该快照之后的所有磁盘变更，且无法撤销。虚拟机可能被关机后恢复，请确认业务已停止。',
      okText: '确认回滚',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const hide = message.loading('正在回滚快照...', 0)
        try {
          await api.restoreVMSnapshot(hostName, vmUuid, snapshot.name)
          message.success('已回滚到指定快照')
          await load()
        } catch (e) {
          message.error(errorText(e, '回滚快照失败'))
        } finally {
          hide()
        }
      },
    })
  }

  const handleDelete = async (snapshot: SnapshotInfo) => {
    if (!editable) return
    setSaving(true)
    const hide = message.loading('正在删除快照...', 0)
    try {
      await api.deleteVMSnapshot(hostName, vmUuid, snapshot.name)
      message.success('快照已删除')
      await load()
    } catch (e) {
      message.error(errorText(e, '删除快照失败'))
    } finally {
      hide()
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '快照名称',
      dataIndex: 'name',
      render: (value: string, record: SnapshotInfo) => (
        <Space size={6}>
          <span className="font-mono text-xs">{value}</span>
          {record.current && <Tag color="processing">当前</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (value: string) => value || '-',
    },
    {
      title: '父快照',
      dataIndex: 'parent',
      render: (value: string) => <span className="font-mono text-xs">{value || '-'}</span>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 190,
      render: (value: number) => formatTime(value),
    },
    {
      title: '状态',
      dataIndex: 'state',
      width: 130,
      render: (value: string) => value || '-',
    },
    {
      title: '操作',
      key: 'ops',
      width: 170,
      render: (_: unknown, record: SnapshotInfo) => (
        <Space size="small">
          <Button
            size="small"
            icon={<UndoOutlined />}
            disabled={!editable || saving}
            onClick={() => handleRestore(record)}
          >
            回滚
          </Button>
          <Popconfirm
            title="删除该快照？"
            description="删除后无法恢复；存在子快照时平台可能拒绝删除。"
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

  if (loading && snapshots.length === 0 && !error) {
    return (
      <div className="text-center py-10">
        <Spin><div style={{ marginTop: 12 }}>加载快照列表...</div></Spin>
      </div>
    )
  }

  if (error && snapshots.length === 0) {
    return (
      <Alert
        type="error"
        showIcon
        message="加载快照列表失败"
        description={error}
        action={<Button size="small" onClick={() => void load()}>重试</Button>}
      />
    )
  }

  return (
    <div className="vm-snapshot-panel">
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
          <Space size={8}>
            <HistoryOutlined />
            <span style={{ fontWeight: 600 }}>快照</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              由虚拟化平台保存，用于快速回滚；与「备份」的独立归档文件不同。
            </span>
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} disabled={loading || saving} onClick={() => void load()}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} disabled={!editable || saving} onClick={openCreate}>
              创建快照
            </Button>
          </Space>
        </div>
      </Card>

      <Alert
        style={{ marginTop: 12 }}
        type="info"
        showIcon
        icon={<ClockCircleOutlined />}
        message="回滚快照会丢弃快照之后的所有磁盘变更；备份功能创建的快照（backup- 前缀）不会显示在此列表中。"
      />

      <div style={{ margin: '16px 0 12px', fontWeight: 600 }}>快照列表（{snapshots.length}）</div>

      <Table
        dataSource={snapshots}
        columns={columns}
        rowKey={(record) => record.name}
        size="small"
        pagination={false}
        loading={loading}
        scroll={{ x: 900 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无快照" /> }}
      />

      <Modal
        title="创建快照"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        width={520}
      >
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message="名称只支持字母、数字与连字符，最长 40 个字符；描述由平台决定是否保存。"
        />
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="快照名称"
            name="name"
            rules={[
              { required: true, message: '请输入快照名称' },
              { pattern: /^[A-Za-z0-9][A-Za-z0-9-]{0,39}$/, message: '名称只能包含字母、数字与连字符，且以字母或数字开头' },
            ]}
          >
            <Input placeholder="如 snap-20261108-120000" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} maxLength={200} placeholder="例如：升级前快照" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
