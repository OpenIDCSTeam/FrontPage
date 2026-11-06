import { useState, useEffect } from 'react'
import { Form, Input, Button, Switch, message, InputNumber, Alert, Tooltip, Radio } from 'antd'
import { DatabaseOutlined, EyeOutlined, EyeInvisibleOutlined, CopyOutlined, ReloadOutlined, SaveOutlined, FolderOpenOutlined, MailOutlined, SettingOutlined, SafetyCertificateOutlined, QuestionCircleOutlined, SyncOutlined, InfoCircleOutlined, TeamOutlined } from '@ant-design/icons'
import { VM_PERMISSION_LABELS, PERMISSION_FIELD_MASK, hasPermission } from '@/types'
import api from '@/utils/apis.ts'
import { SystemStats } from '@/types'
import PageHeader from '@/components/PageHeader'

const { TextArea } = Input

const SETTINGS_SECTIONS = [
  { key: 'token', label: '访问与安全', description: 'Token、验证码与登录保护', icon: <SafetyCertificateOutlined /> },
  { key: 'registration', label: '注册与权限', description: '注册开关、默认权限与配额', icon: <TeamOutlined /> },
  { key: 'sync', label: '同步与接口', description: '自动同步、远程地址与 API', icon: <SyncOutlined /> },
  { key: 'email', label: '邮件服务', description: 'Resend 发信与测试', icon: <MailOutlined /> },
  { key: 'data', label: '配置存档', description: '保存或重新加载配置', icon: <DatabaseOutlined /> },
  { key: 'system', label: '系统信息', description: '版本与资源规模', icon: <InfoCircleOutlined /> },
]

/**
 * 系统设置页面
 */
function CoreConfig() {
  const [loading, setLoading] = useState(false)
  const [tokenVisible, setTokenVisible] = useState(false)
  const [currentToken, setCurrentToken] = useState('')
  const [systemInfo, setSystemInfo] = useState<SystemStats>({ hosts_count: 0, vms_count: 0, running_vms: 0, stopped_vms: 0 })
  const [registrationForm] = Form.useForm()
  const [emailForm] = Form.useForm()
  const [testEmailForm] = Form.useForm()
  const [turnstileForm] = Form.useForm()
  const [syncForm] = Form.useForm()
  const [activeSection, setActiveSection] = useState('token')

  /**
   * 页面加载时获取数据
   */
  useEffect(() => {
    loadCurrentToken()
    loadSystemInfo()
    loadSystemSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 加载当前Token
   */
  const loadCurrentToken = async () => {
    try {
      const res = await api.getCurrentToken()
      if (res.code === 200 && res.data) {
        setCurrentToken(res.data.token)
      }
    } catch (error) {
      console.error('加载Token失败:', error)
    }
  }

  /**
   * 加载系统信息
   */
  const loadSystemInfo = async () => {
    try {
      const res = await api.getSystemStats()
      if (res.code === 200 && res.data) {
        setSystemInfo(res.data)
      }
    } catch (error) {
      console.error('加载系统信息失败:', error)
    }
  }

  /**
   * 加载系统设置
   */
  const loadSystemSettings = async () => {
    try {
      const res = await api.getSystemSettings()
      if (res.code === 200) {
        const settings = res.data
        // 设置注册表单
        registrationForm.setFieldsValue({
          registration_enabled: settings.registration_enabled === '1',
          email_verification_enabled: settings.email_verification_enabled === '1',
          default_allowed_hosts: settings.default_allowed_hosts || '',
          default_user_permission: parseInt(settings.default_user_permission) || 56791,
          default_free_config: settings.default_free_config !== '0',
          default_quota_cpu: parseInt(settings.default_quota_cpu) || 2,
          default_quota_ram: parseInt(settings.default_quota_ram) || 4,
          default_quota_sys_disk: parseInt(settings.default_quota_sys_disk) || 20,
          default_quota_data_disk: parseInt(settings.default_quota_data_disk) || 50,
          default_quota_gpu: parseInt(settings.default_quota_gpu) || 0,
          default_quota_nat_ports: parseInt(settings.default_quota_nat_ports) || 5,
          default_quota_internal_ip: parseInt(settings.default_quota_internal_ip) || 5,
          default_quota_web_proxy: parseInt(settings.default_quota_web_proxy) || 2,
          default_quota_public_ip: parseInt(settings.default_quota_public_ip) || 2,
          default_quota_bandwidth_up: parseInt(settings.default_quota_bandwidth_up) || 100,
          default_quota_bandwidth_down: parseInt(settings.default_quota_bandwidth_down) || 100,
          default_quota_traffic: parseInt(settings.default_quota_traffic) || 0,
          default_can_create_vm: settings.default_can_create_vm !== '0',
          default_can_modify_vm: settings.default_can_modify_vm !== '0',
          default_can_delete_vm: settings.default_can_delete_vm !== '0',
        })
        // 设置邮件表单
        emailForm.setFieldsValue({
          base_url: settings.base_url || '',
          resend_email: settings.resend_email || '',
          resend_domain: settings.resend_domain || '',
          resend_apikey: settings.resend_apikey || '',
        })
        // 设置Turnstile表单
        turnstileForm.setFieldsValue({
          turnstile_enabled: settings.turnstile_enabled === '1',
          turnstile_site_key: settings.turnstile_site_key || '',
          turnstile_secret_key: settings.turnstile_secret_key || '',
        })
        // 设置同步表单
        syncForm.setFieldsValue({
          sync_enabled: settings.sync_enabled === '1',
          sync_mode: settings.sync_mode || 'pull',
          sync_interval: parseInt(settings.sync_interval) || 10,
          sync_url: settings.sync_url || '',
          sync_token: settings.sync_token || '',
        })
      }
    } catch (error) {
      console.error('加载系统设置失败:', error)
    }
  }

  /**
   * 切换Token可见性
   */
  const toggleTokenVisibility = () => {
    setTokenVisible(!tokenVisible)
  }

  /**
   * 复制Token
   */
  const copyToken = () => {
    navigator.clipboard.writeText(currentToken)
    message.success('Token已复制到剪贴板')
  }

  /**
   * 设置新Token
   */
  const setNewToken = async (values: { newToken: string }) => {
    try {
      setLoading(true)
      const res = await api.setToken(values.newToken)
      if (res.code === 200 && res.data) {
        setCurrentToken(res.data.token)
        message.success('Token设置成功')
      } else {
        message.error(res.msg || '设置失败')
      }
    } catch (error) {
      message.error('设置Token失败')
    } finally {
      setLoading(false)
    }
  }



  /**
   * 保存同步设置
   */
  const saveSyncSettings = async (values: any) => {
    try {
      setLoading(true)
      const data = {
        sync_enabled: values.sync_enabled ? '1' : '0',
        sync_mode: values.sync_mode || 'pull',
        sync_interval: (values.sync_interval || 10).toString(),
        sync_url: values.sync_url || '',
        sync_token: values.sync_token || '',
      }
      const res = await api.updateSystemSettings(data)
      if (res.code === 200) {
        message.success('同步设置已保存')
      } else {
        message.error(res.msg || '保存失败')
      }
    } catch (error) {
      message.error('保存同步设置失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 保存Turnstile设置
   */
  const saveTurnstileSettings = async (values: any) => {
    try {
      setLoading(true)
      const data = {
        turnstile_enabled: values.turnstile_enabled ? '1' : '0',
        turnstile_site_key: values.turnstile_site_key || '',
        turnstile_secret_key: values.turnstile_secret_key || '',
      }
      const res = await api.updateSystemSettings(data)
      if (res.code === 200) {
        message.success('Turnstile验证码设置已保存')
      } else {
        message.error(res.msg || '保存失败')
      }
    } catch (error) {
      message.error('保存Turnstile设置失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 保存配置
   */
  const saveConfig = async () => {
    try {
      setLoading(true)
      const res = await api.saveSystemConfig()
      if (res.code === 200) {
        message.success('配置已保存')
      } else {
        message.error(res.msg || '保存失败')
      }
    } catch (error) {
      message.error('保存配置失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 重新加载配置
   */
  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await api.loadSystemConfig()
      if (res.code === 200) {
        message.success('配置已重新加载')
        loadSystemInfo()
      } else {
        message.error(res.msg || '加载失败')
      }
    } catch (error) {
      message.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 保存注册设置
   */
  const saveRegistrationSettings = async (values: any) => {
    try {
      setLoading(true)
      const data = {
        registration_enabled: values.registration_enabled ? '1' : '0',
        email_verification_enabled: values.email_verification_enabled ? '1' : '0',
        default_allowed_hosts: values.default_allowed_hosts || '',
        default_user_permission: (values.default_user_permission || 56791).toString(),
        default_free_config: values.default_free_config ? '1' : '0',
        default_quota_cpu: values.default_quota_cpu.toString(),
        default_quota_ram: values.default_quota_ram.toString(),
        default_quota_sys_disk: values.default_quota_sys_disk.toString(),
        default_quota_data_disk: values.default_quota_data_disk.toString(),
        default_quota_gpu: values.default_quota_gpu.toString(),
        default_quota_nat_ports: values.default_quota_nat_ports.toString(),
        default_quota_internal_ip: values.default_quota_internal_ip.toString(),
        default_quota_web_proxy: values.default_quota_web_proxy.toString(),
        default_quota_public_ip: values.default_quota_public_ip.toString(),
        default_quota_bandwidth_up: values.default_quota_bandwidth_up.toString(),
        default_quota_bandwidth_down: values.default_quota_bandwidth_down.toString(),
        default_quota_traffic: values.default_quota_traffic.toString(),
        default_can_create_vm: values.default_can_create_vm ? '1' : '0',
        default_can_modify_vm: values.default_can_modify_vm ? '1' : '0',
        default_can_delete_vm: values.default_can_delete_vm ? '1' : '0',
      }
      const res = await api.updateSystemSettings(data)
      if (res.code === 200) {
        message.success('注册设置已保存')
      } else {
        message.error(res.msg || '保存失败')
      }
    } catch (error) {
      message.error('保存注册设置失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 保存邮件设置
   */
  const saveEmailSettings = async (values: any) => {
    try {
      setLoading(true)
      const res = await api.updateSystemSettings(values)
      if (res.code === 200) {
        message.success('邮件配置已保存')
      } else {
        message.error(res.msg || '保存失败')
      }
    } catch (error) {
      message.error('保存邮件配置失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 发送测试邮件
   */
  const sendTestEmail = async (values: any) => {
    try {
      setLoading(true)
      const emailValues = emailForm.getFieldsValue()
      const data = {
        test_email: values.test_email,
        subject: values.subject,
        body: values.body,
        resend_email: emailValues.resend_email,
        resend_apikey: emailValues.resend_apikey,
      }
      const res = await api.sendTestEmail(data)
      if (res.code === 200) {
        message.success('测试邮件发送成功，请查收')
      } else {
        message.error(res.msg || '发送测试邮件失败')
      }
    } catch (error) {
      message.error('发送测试邮件失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="art-stack settings-page">
      <PageHeader
        icon={<SettingOutlined />}
        title="平台系统设置"
        subtitle="安全管理凭据、邮件、注册策略与运行参数"
      />

      <div className="settings-workspace">
        <aside className="settings-nav" aria-label="设置分区">
          <div className="settings-nav-head">
            <span>配置分区</span>
            <strong>平台设置</strong>
          </div>
          {SETTINGS_SECTIONS.map(section => (
            <button
              key={section.key}
              type="button"
              className={`settings-nav-item${activeSection === section.key ? ' is-active' : ''}`}
              aria-current={activeSection === section.key ? 'page' : undefined}
              onClick={() => setActiveSection(section.key)}
            >
              <span className="settings-nav-icon">{section.icon}</span>
              <span className="settings-nav-copy">
                <strong>{section.label}</strong>
                <small>{section.description}</small>
              </span>
            </button>
          ))}
          <div className="settings-nav-foot">
            <span>OpenIDCS 1.0.0</span>
            <span><span>主机</span> {systemInfo.hosts_count} · <span>实例</span> {systemInfo.vms_count}</span>
          </div>
        </aside>

        <div className="settings-content">
        <section className="settings-section" hidden={activeSection !== 'token'}>
          <header className="settings-section-head">
            <span className="settings-section-icon"><SafetyCertificateOutlined /></span>
            <div>
              <h2>访问 Token 与验证码</h2>
              <p>管理 API 访问凭据，并配置登录与注册使用的人机验证。</p>
            </div>
          </header>
          <div className="settings-section-body">

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">当前Token</label>
              <div className="settings-token-control flex gap-2">
                <Input
                  type={tokenVisible ? 'text' : 'password'}
                  value={tokenVisible ? currentToken : '••••••••••••••••'}
                  readOnly
                  className="flex-1"
                />
                <Button icon={tokenVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={toggleTokenVisibility} />
                <Button icon={<CopyOutlined />} onClick={copyToken} />
                <Button icon={<ReloadOutlined />} loading={loading} onClick={() => {
                  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                  let token = ''
                  for (let i = 0; i < 16; i++) token += chars.charAt(Math.floor(Math.random() * chars.length))
                  setNewToken({ newToken: token })
                }} title="随机生成16位Token" />
              </div>
            </div>

            <Alert
              message="安全提示"
              description="修改Token后，所有使用旧Token的API调用都将失效。请确保更新所有相关配置。"
              type="warning"
              showIcon
            />

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <SafetyCertificateOutlined className="text-green-600" />
                Turnstile 验证码
              </h4>
              <Form form={turnstileForm} onFinish={saveTurnstileSettings} layout="vertical">
                <div className="settings-inline-setting flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">开启验证码</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>启用后登录、注册、找回密码都需要验证Turnstile</p>
                  </div>
                  <Form.Item name="turnstile_enabled" valuePropName="checked" className="mb-0">
                    <Switch />
                  </Form.Item>
                </div>

                <Form.Item name="turnstile_site_key" label="Turnstile 站点密钥">
                  <Input placeholder="请输入Cloudflare Turnstile Site Key" />
                </Form.Item>

                <Form.Item name="turnstile_secret_key" label="Turnstile 密钥">
                  <Input.Password placeholder="请输入Cloudflare Turnstile Secret Key" />
                </Form.Item>

                <Button type="primary" htmlType="submit" block loading={loading} icon={<SaveOutlined />}>
                  保存验证码设置
                </Button>
              </Form>
            </div>
          </div>
          </div>
        </section>

        {/* API文档 */}
        <section className="settings-section" hidden={activeSection !== 'sync'}>
          <header className="settings-section-head">
            <span className="settings-section-icon"><SyncOutlined /></span>
            <div>
              <h2>自动同步与 API 接口</h2>
              <p>配置定时同步、远程地址，并查看平台提供的接口能力。</p>
            </div>
          </header>
          <div className="settings-section-body">
          <div className="space-y-3 text-sm">
            <div className="border-t pt-3">
              <div className="settings-api-list space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--art-primary-soft)', color: 'var(--art-accent-text)' }}>POST</span>
                  <code className="text-xs">/api/hosts</code>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>- 添加主机</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--art-success-soft)', color: 'var(--art-success)' }}>GET</span>
                  <code className="text-xs">/api/hosts/{'{name}'}/vms</code>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>- 获取虚拟机列表</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--art-primary-soft)', color: 'var(--art-accent-text)' }}>POST</span>
                  <code className="text-xs">/api/hosts/{'{name}'}/vms</code>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>- 创建虚拟机</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--art-primary-soft)', color: 'var(--art-accent-text)' }}>POST</span>
                  <code className="text-xs">/api/hosts/{'{name}'}/vms/{'{uuid}'}/power</code>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>- 电源操作</span>
                </div>
              </div>
            </div>
          </div>

          {/* 同步设置 */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <SyncOutlined className="text-blue-500" />
              自动同步设置
            </h4>
            <Form form={syncForm} onFinish={saveSyncSettings} layout="vertical">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">自动同步</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>开启后将按照设定的模式自动同步虚拟机信息</p>
                </div>
                <div className="settings-sync-controls flex items-center gap-3">
                  <Form.Item name="sync_interval" className="mb-0">
                    <InputNumber min={1} max={1440} style={{ width: 120 }} placeholder="10" addonAfter="分钟" />
                  </Form.Item>
                  <Form.Item name="sync_enabled" valuePropName="checked" className="mb-0">
                    <Switch />
                  </Form.Item>
                </div>
              </div>

              <Form.Item name="sync_mode" label="同步选项">
                <Radio.Group>
                  <Radio value="pull">仅拉取</Radio>
                  <Radio value="push">仅推送</Radio>
                  <Radio value="both">拉取+推送</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="sync_url" label="同步地址">
                <Input placeholder="https://remote-server.com/api" />
              </Form.Item>

              <Form.Item name="sync_token" label="同步Token">
                <Input.Password placeholder="远程服务器的访问Token" />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={loading} icon={<SaveOutlined />}>
                保存同步设置
              </Button>
            </Form>
          </div>
          </div>
        </section>

        {/* 数据管理 */}
        <section className="settings-section" hidden={activeSection !== 'data'}>
          <header className="settings-section-head">
            <span className="settings-section-icon"><DatabaseOutlined /></span>
            <div>
              <h2>配置存档</h2>
              <p>把当前平台配置保存到文件，或从已有文件重新加载。</p>
            </div>
          </header>
          <div className="settings-section-body">
          <div className="settings-data-actions">
            <Button
              block
              icon={<SaveOutlined />}
              onClick={saveConfig}
              loading={loading}
              className="h-auto py-3 text-left"
            >
              <div className="ml-2">
                <p className="text-sm font-semibold">保存配置</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>将当前配置保存文件</p>
              </div>
            </Button>

            <Button
              block
              icon={<FolderOpenOutlined />}
              onClick={loadConfig}
              loading={loading}
              className="h-auto py-3 text-left"
            >
              <div className="ml-2">
                <p className="text-sm font-semibold">重新加载</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>从文件重新加载配置</p>
              </div>
            </Button>
          </div>
          </div>
        </section>

        {/* 系统信息 */}
        <section className="settings-section" hidden={activeSection !== 'system'}>
          <header className="settings-section-head">
            <span className="settings-section-icon"><InfoCircleOutlined /></span>
            <div>
              <h2>系统信息</h2>
              <p>查看平台版本与当前纳管的资源规模。</p>
            </div>
          </header>
          <div className="settings-section-body">
          <div className="settings-info-grid">
            <div className="settings-info-item">
              <span>系统名称</span>
              <strong>OpenIDCS受控端</strong>
            </div>
            <div className="settings-info-item">
              <span>版本</span>
              <strong>1.0.0</strong>
            </div>
            <div className="settings-info-item">
              <span>主机数量</span>
              <strong>{systemInfo.hosts_count}</strong>
            </div>
            <div className="settings-info-item">
              <span>虚拟机数量</span>
              <strong>{systemInfo.vms_count}</strong>
            </div>
          </div>
          </div>
        </section>

        {/* 用户注册设置 */}
        <section className="settings-section" hidden={activeSection !== 'registration'}>
          <header className="settings-section-head">
            <span className="settings-section-icon"><TeamOutlined /></span>
            <div>
              <h2>注册策略与默认配额</h2>
              <p>控制开放注册、邮箱验证、用户默认权限与新账号资源上限。</p>
            </div>
          </header>
          <div className="settings-section-body">
          <Form form={registrationForm} onFinish={saveRegistrationSettings} layout="vertical">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
<p className="text-sm font-medium">开放注册</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>允许新用户注册账号</p>
                </div>
                <Form.Item name="registration_enabled" valuePropName="checked" className="mb-0">
                  <Switch />
                </Form.Item>
              </div>

              <div className="flex items-center justify-between">
                <div>
<p className="text-sm font-medium">邮箱验证</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>注册时需要验证邮箱</p>
                </div>
                <Form.Item name="email_verification_enabled" valuePropName="checked" className="mb-0">
                  <Switch />
                </Form.Item>
              </div>

              <div className="border-t pt-4">
                <div className="settings-form-grid">
                  <Form.Item name="default_allowed_hosts" label="默认可访问主机" className="mb-3" extra="多个主机用英文逗号分隔，留空表示不限制">
                    <Input placeholder="host1,host2 或留空表示全部" className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_user_permission" label={<span>用户默认权限 <Tooltip title="权限掩码值，控制用户可访问的虚拟机功能Tab。此权限与虚拟机级别权限做AND运算，优先级更高。"><QuestionCircleOutlined style={{color: 'var(--text-secondary)'}}/></Tooltip></span>} className="mb-3" extra="int掩码值，各权限位按位OR组合">
                    <InputNumber min={0} max={65535} className="w-full" placeholder="56791" />
                  </Form.Item>
                </div>
                <div className="mb-3 p-2 rounded text-xs" style={{background: 'var(--bg-card)', border: '1px solid var(--border-hover)'}}>
                  <p className="font-medium mb-1">权限位说明（当前掩码包含的权限）：</p>
                  <div className="settings-permission-grid">
                    {Object.entries(PERMISSION_FIELD_MASK).map(([field, bit]) => (
                      <label key={field} className="flex items-center gap-1 cursor-pointer" onClick={() => {
                        const current = registrationForm.getFieldValue('default_user_permission') || 56791
                        registrationForm.setFieldsValue({ default_user_permission: current ^ bit })
                      }}>
                        <input type="checkbox" readOnly checked={hasPermission(registrationForm.getFieldValue('default_user_permission') || 56791, bit)} className="pointer-events-none" />
                        <span>{VM_PERMISSION_LABELS[field]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="settings-inline-setting flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">允许自由配置</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>用户可自行调整虚拟机配置</p>
                  </div>
                  <Form.Item name="default_free_config" valuePropName="checked" className="mb-0">
                    <Switch />
                  </Form.Item>
                </div>
              </div>

              <div className="border-t pt-4">
<h4 className="text-sm font-medium mb-3">新用户默认资源配额</h4>
                <div className="settings-form-grid">
                  <Form.Item name="default_quota_cpu" label="CPU核心(个)" className="mb-2">
                    <InputNumber min={0} max={32} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_ram" label="RAM内存(GB)" className="mb-2">
                    <InputNumber min={0} max={128} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_sys_disk" label="系统磁盘(GB)" className="mb-2">
                    <InputNumber min={0} max={1000} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_data_disk" label="数据磁盘(GB)" className="mb-2">
                    <InputNumber min={0} max={10000} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_gpu" label="GPU显存(GB)" className="mb-2">
                    <InputNumber min={0} max={8} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_nat_ports" label="NAT端口(个)" className="mb-2">
                    <InputNumber min={0} max={100} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_internal_ip" label="内网IP(个)" className="mb-2">
                    <InputNumber min={0} max={50} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_web_proxy" label="WEB代理(个)" className="mb-2">
                    <InputNumber min={0} max={10} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_public_ip" label="公网IP(个)" className="mb-2">
                    <InputNumber min={0} max={10} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_bandwidth_up" label="上行带宽(Mbps)" className="mb-2">
                    <InputNumber min={0} max={1000} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_bandwidth_down" label="下行带宽(Mbps)" className="mb-2">
                    <InputNumber min={0} max={1000} className="w-full" />
                  </Form.Item>
                  <Form.Item name="default_quota_traffic" label="月流量(GB)" className="mb-2">
                    <InputNumber min={0} max={10000} className="w-full" />
                  </Form.Item>
                </div>
              </div>
              <Button type="primary" htmlType="submit" block loading={loading} icon={<SaveOutlined />}>
                保存设置
              </Button>
            </div>
          </Form>
          </div>
        </section>

        {/* 邮件服务配置 */}
        <section className="settings-section" hidden={activeSection !== 'email'}>
          <header className="settings-section-head">
            <span className="settings-section-icon"><MailOutlined /></span>
            <div>
              <h2>邮件通知服务</h2>
              <p>配置 Resend 发信服务，并发送测试邮件验证连通性。</p>
            </div>
          </header>
          <div className="settings-section-body">
          <Alert
            message={
              <span>
                Resend 邮件服务，访问{' '}
                <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">
                  resend.com
                </a>{' '}
                获取API Key
              </span>
            }
            type="info"
            className="mb-4"
          />

          <Form form={emailForm} onFinish={saveEmailSettings} layout="vertical">
            <Form.Item name="base_url" label="外网URL" extra="用于生成邮件验证链接等回调地址，如：https://example.com">
              <Input placeholder="https://example.com" />
            </Form.Item>

            <Form.Item name="resend_email" label="发件邮箱">
              <Input placeholder="noreply@yourdomain.com" />
            </Form.Item>

            <Form.Item name="resend_domain" label="发送域名">
              <Input placeholder="yourdomain.com" />
            </Form.Item>

            <Form.Item name="resend_apikey" label="API Key">
              <Input.Password placeholder="re_xxxxxxxxxxxxxxxx" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={loading} icon={<SaveOutlined />}>
              保存配置
            </Button>
          </Form>

          <div className="border-t mt-4 pt-4">
<h4 className="text-sm font-medium mb-3">测试邮件发送</h4>
            <Form form={testEmailForm} onFinish={sendTestEmail} layout="vertical">
              <Form.Item name="test_email" label="收件邮箱" rules={[{ required: true, type: 'email', message: '请输入有效的邮箱地址' }]}>
                <Input placeholder="test@example.com" />
              </Form.Item>

              <Form.Item name="subject" label="邮件标题" initialValue="OpenIDCS - 测试邮件">
                <Input placeholder="OpenIDCS - 测试邮件" />
              </Form.Item>

              <Form.Item name="body" label="邮件正文" initialValue="您好，这是一封来自 OpenIDCS 系统的测试邮件。如果您收到这封邮件，说明邮件服务配置正常。————OpenIDCS 系统">
                <TextArea rows={6} placeholder="请输入邮件正文内容..." />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={loading} icon={<MailOutlined />}>
                发送测试邮件
              </Button>
            </Form>
          </div>
          </div>
        </section>
        </div>
      </div>
    </div>
  )
}

export default CoreConfig
