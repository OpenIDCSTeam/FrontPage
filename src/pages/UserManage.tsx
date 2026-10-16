import { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, Checkbox, InputNumber, message, Popconfirm, Divider, Row, Col, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import PageHeader from '@/components/PageHeader'
import api from '@/utils/apis.ts'
import type { ColumnsType } from 'antd/es/table'
import type { User } from '@/types'
import { VM_PERMISSION_LABELS, PERMISSION_FIELD_MASK, hasPermission } from '@/types'

/**
 * 主机数据接口
 */
interface Host {
  hs_name: string
  [key: string]: any
}

/**
 * 用户管理页面
 */
function UserManage() {
  const [users, setUsers] = useState<User[]>([])
  const [hosts, setHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()

  /**
   * 加载用户列表
   */
  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.getUsers()
      if (response.code === 200 && response.data) {
        setUsers(response.data)
      }
    } catch (error) {
      message.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 加载主机列表
   */
  const loadHosts = async () => {
    try {
      const response = await api.getHosts()
      if (response.code === 200 && response.data) {
        // 将对象转换为数组
        if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          const hostsArray = Object.keys(response.data).map(hostName => ({
            hs_name: hostName,
            ...response.data![hostName]
          }))
          setHosts(hostsArray)
        } else if (Array.isArray(response.data)) {
          setHosts(response.data)
        }
      }
    } catch (error) {
      console.error('加载主机列表失败:', error)
    }
  }

  useEffect(() => {
    loadUsers()
    loadHosts()
  }, [])

  /**
   * 打开编辑对话框
   */
  const handleEdit = async (userId: number) => {
    const user = users.find(u => u.id === userId)
    if (user) {
        setEditingUser(user)
        
        // 将MB转换为GB显示
        form.setFieldsValue({
          ...user,
          quota_ram: Math.floor(user.quota_ram / 1024),
          quota_ssd: Math.floor(user.quota_ssd / 1024),
          quota_gpu: Math.floor(user.quota_gpu / 1024),
          quota_traffic: Math.floor(user.quota_traffic / 1024),
          password: '', // 清空密码字段
          assigned_hosts: user.assigned_hosts || []
        })
        setModalVisible(true)
    } else {
        message.error('未找到用户信息')
    }
  }

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
      // 将GB转换为MB提交给后端
      const data = {
        ...values,
        is_admin: values.is_admin ? 1 : 0,
        is_active: values.is_active ? 1 : 0,
        can_create_vm: values.can_create_vm ? 1 : 0,
        can_modify_vm: values.can_modify_vm ? 1 : 0,
        can_delete_vm: values.can_delete_vm ? 1 : 0,
        can_free_config: values.can_free_config ? 1 : 0,
        quota_ram: Math.round(values.quota_ram * 1024),
        quota_ssd: Math.round(values.quota_ssd * 1024),
        quota_gpu: Math.round(values.quota_gpu * 1024),
        quota_traffic: Math.round(values.quota_traffic * 1024),
      }

      // 如果是编辑模式且密码为空，则删除密码字段
      if (editingUser && (!data.password || data.password.trim() === '')) {
        delete data.password
      }

      if (editingUser) {
        // 更新用户
        await api.updateUser(editingUser.id, data)
        message.success('用户更新成功')
      } else {
        // 创建用户
        await api.createUser(data)
        message.success('用户创建成功')
      }
      
      setModalVisible(false)
      setEditingUser(null)
      form.resetFields()
      loadUsers()
    } catch (error: any) {
      message.error(error.msg || (editingUser ? '更新用户失败' : '创建用户失败'))
    }
  }

  /**
   * 删除用户
   */
  const handleDelete = async (id: number) => {
    try {
      await api.deleteUser(id)
      message.success('用户删除成功')
      loadUsers()
    } catch (error) {
      message.error('删除用户失败')
    }
  }

  /**
   * 表格列配置
   * 原则：主行只回答「这是谁 / 什么角色 / 是否启用 / 用得怎么样」，
   * 完整的 12 项配额放进展开行（.art-info-grid）。
   * 早期把 CPU/RAM/SSD/GPU 四项塞进一个格子，表格被迫 1500px 宽且无法扫读。
   */
  const columns: ColumnsType<User> = [
    {
      title: '用户',
      key: 'user',
      width: 220,
      render: (_, record) => (
        <div className="art-cell-stack">
          <span className="art-cell-title">{record.username}</span>
          <span className="art-cell-sub">{record.email || '—'}</span>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'is_admin',
      key: 'is_admin',
      width: 100,
      render: (is_admin: boolean) => (
        <span className={`art-sem ${is_admin ? 'is-accent' : ''} art-sem-pill`}>
          {is_admin ? '管理员' : '普通用户'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 90,
      render: (is_active: boolean) => (
        <span className={`art-sem ${is_active ? 'is-success' : 'is-danger'} art-sem-pill`}>
          {is_active ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      title: '配额概览',
      key: 'quota',
      render: (_, record) => (
        <span className="art-quota-line">
          <span>CPU {record.used_cpu || 0}/{record.quota_cpu}</span>
          <span>内存 {Math.round((record.used_ram || 0) / 1024)}/{Math.round(record.quota_ram / 1024)}G</span>
          <span>磁盘 {Math.round((record.used_ssd || 0) / 1024)}/{Math.round(record.quota_ssd / 1024)}G</span>
          <span>NAT {record.used_nat_ports || 0}/{record.quota_nat_ports}</span>
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此用户吗？"
            description="删除后无法恢复！"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            getPopupContainer={() => document.body}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  /** 展开行：完整配额，一格一字段 */
  const expandedRowRender = (record: User) => {
    const gb = (mb?: number) => `${Math.round((mb || 0) / 1024)} GB`
    const items: { label: string; value: string }[] = [
      { label: 'CPU 核心', value: `${record.used_cpu || 0} / ${record.quota_cpu}` },
      { label: '内存', value: `${gb(record.used_ram)} / ${gb(record.quota_ram)}` },
      { label: '存储', value: `${gb(record.used_ssd)} / ${gb(record.quota_ssd)}` },
      { label: 'GPU 显存', value: `${gb(record.used_gpu)} / ${gb(record.quota_gpu)}` },
      { label: 'GPU ID', value: record.gpu_ids || '—' },
      { label: '上行带宽', value: `${record.used_bandwidth_up || 0} / ${record.quota_bandwidth_up} Mbps` },
      { label: '下行带宽', value: `${record.used_bandwidth_down || 0} / ${record.quota_bandwidth_down} Mbps` },
      { label: '流量', value: `${gb(record.used_traffic)} / ${gb(record.quota_traffic)}` },
      { label: 'NAT 端口', value: `${record.used_nat_ports || 0} / ${record.quota_nat_ports}` },
      { label: 'Web 代理', value: `${record.used_web_proxy || 0} / ${record.quota_web_proxy}` },
      { label: '内网 IP', value: `${record.used_nat_ips || 0} / ${record.quota_nat_ips || 0}` },
      { label: '公网 IP', value: `${record.used_pub_ips || 0} / ${record.quota_pub_ips || 0}` },
    ]
    return (
      <div className="art-info-grid">
        {items.map((item) => (
          <div key={item.label}>
            <div className="art-info-label">{item.label}</div>
            <div className="art-info-value is-mono">{item.value}</div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="art-stack">
      <PageHeader
        icon={<UserOutlined />}
        title="平台用户管理"
        subtitle="管理系统用户、权限与资源配额"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingUser(null)
              form.resetFields()
              form.setFieldsValue({
                is_active: true,
                can_create_vm: true,
                can_modify_vm: true,
                can_delete_vm: true,
                quota_cpu: 2,
                quota_ram: 4,
                quota_ssd: 50,
                quota_gpu: 0,
                quota_nat_ports: 5,
                quota_nat_ips: 5,
                quota_web_proxy: 2,
                quota_pub_ips: 2,
                quota_bandwidth_up: 100,
                quota_bandwidth_down: 100,
                quota_traffic: 500,
              })
              setModalVisible(true)
            }}
          >
            添加用户
          </Button>
        }
      />

      <div className="art-panel">
        <div className="art-panel-body is-flush">
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            expandable={{ expandedRowRender }}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </div>
      </div>
      {/* 创建/编辑用户对话框 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingUser(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={800}
        style={{ top: 20 }}
        styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* 基本信息 */}
          <Divider orientation="left">基本信息</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="请输入用户名" disabled={!!editingUser} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={editingUser ? [] : [
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="请输入邮箱" disabled={!!editingUser} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="password"
                label={editingUser ? '新密码（留空则不修改）' : '密码'}
                rules={editingUser ? [] : [
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6个字符' },
                ]}
              >
                <Input.Password placeholder={editingUser ? '留空则不修改' : '请输入密码'} />
              </Form.Item>
            </Col>
          </Row>

          {/* 角色和状态 */}
          <Divider orientation="left">角色和状态</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_admin" valuePropName="checked">
                <Checkbox>管理员</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" valuePropName="checked">
                <Checkbox>启用用户</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          {/* 虚拟机权限 */}
          <Divider orientation="left">虚拟机权限</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="can_create_vm" valuePropName="checked">
                <Checkbox>允许创建虚拟机</Checkbox>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="can_modify_vm" valuePropName="checked">
                <Checkbox>允许修改虚拟机</Checkbox>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="can_delete_vm" valuePropName="checked">
                <Checkbox>允许删除虚拟机</Checkbox>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="can_free_config" valuePropName="checked">
                <Checkbox>允许自由配置</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          {/* 用户权限掩码 */}
          <Divider orientation="left">用户权限掩码 <Tooltip title="控制用户可访问的虚拟机功能Tab，与虚拟机级别权限做AND运算"><QuestionCircleOutlined /></Tooltip></Divider>
          <Form.Item name="user_permission" label="权限掩码值">
            <InputNumber min={0} max={65535} style={{ width: '100%' }} placeholder="65535 = 全权限" />
          </Form.Item>
          <Form.Item shouldUpdate={(prev, cur) => prev.user_permission !== cur.user_permission} noStyle>
            {() => {
              const currentMask = form.getFieldValue('user_permission') ?? 65535
              return (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px 12px', marginBottom: 16}}>
                  {Object.entries(PERMISSION_FIELD_MASK).map(([field, bit]) => (
                    <Checkbox key={field} checked={hasPermission(currentMask, bit)} onChange={(e) => {
                      const newMask = e.target.checked ? (currentMask | bit) : (currentMask & ~bit)
                      form.setFieldsValue({ user_permission: newMask })
                    }}>{VM_PERMISSION_LABELS[field]}</Checkbox>
                  ))}
                  <div style={{gridColumn: 'span 4', marginTop: 4}}>
                    <Space size="small">
                      <Button size="small" onClick={() => form.setFieldsValue({ user_permission: 65535 })}>全选</Button>
                      <Button size="small" onClick={() => form.setFieldsValue({ user_permission: 0 })}>全不选</Button>
                    </Space>
                  </div>
                </div>
              )
            }}
          </Form.Item>

          {/* 资源配额 */}
          <Divider orientation="left">资源配额</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quota_cpu" label="CPU核心(个)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quota_ram" label="RAM内存(GB)">
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quota_ssd" label="HDD磁盘(GB)">
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quota_gpu" label="GPU显存(GB)">
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quota_nat_ports" label="NAT端口(个)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quota_nat_ips" label="内网IP(个)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quota_web_proxy" label="WEB代理(个)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quota_pub_ips" label="公网IP(个)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quota_bandwidth_up" label="上行带宽(Mbps)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quota_bandwidth_down" label="下行带宽(Mbps)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="quota_traffic" label="月流量(GB)">
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 分配主机 */}
          <Divider orientation="left">分配主机</Divider>
          <Form.Item name="assigned_hosts">
            <Checkbox.Group>
              <Row>
                {hosts.map(host => (
                  <Col span={12} key={host.hs_name}>
                    <Checkbox value={host.hs_name}>{host.hs_name}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserManage
