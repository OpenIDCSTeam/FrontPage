import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Form, Input, message } from 'antd'
import {
  FontSizeOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import AuthLayout from '@/components/AuthLayout'
import api from '@/utils/apis.ts'
import { useSiteStore } from '@/utils/site.ts'

interface InitForm {
  system_title: string
  password: string
  confirm_password: string
}

/**
 * 系统初始化页面
 * ------------------------------------------------------------------
 * 首次部署时创建管理员密码并设置系统标题。
 * 系统已存在管理员时直接回到登录页，避免该页面被用作口令重置入口。
 */
export default function SystemInit() {
  const navigate = useNavigate()
  const { title, initialized, load, setTitle, setInitialized } = useSiteStore()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let alive = true
    load().finally(() => {
      if (alive) setChecking(false)
    })
    return () => {
      alive = false
    }
  }, [load])

  useEffect(() => {
    if (initialized === true) {
      navigate('/login', { replace: true })
    }
  }, [initialized, navigate])

  const handleSubmit = async (values: InitForm) => {
    try {
      setLoading(true)
      setErrorMsg('')
      const res = await api.initializeSystem({
        password: values.password,
        confirm_password: values.confirm_password,
        system_title: (values.system_title || '').trim(),
      })
      if (res.data?.system_title) {
        setTitle(res.data.system_title)
      } else {
        setTitle(values.system_title)
      }
      // 立即标记为已初始化，避免跳回登录页后被重新判定为未初始化
      setInitialized(true)
      message.success(res.msg || '初始化完成，请使用管理员账号登录')
      navigate('/login', { replace: true })
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.msg || error?.message || '初始化失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="art-auth-card">
        <div>
          <div className="art-auth-logo">
            <SettingOutlined style={{ fontSize: 26 }} />
          </div>
          <h1 className="art-auth-title">初始化系统</h1>
          <p className="art-auth-subtitle">
            <SafetyCertificateOutlined />
            创建管理员密码并设置系统标题
          </p>
        </div>

        {checking ? (
          <div className="art-auth-tip">正在检查系统状态…</div>
        ) : (
          <Form
            name="systemInit"
            onFinish={handleSubmit}
            autoComplete="off"
            layout="vertical"
            initialValues={{ system_title: title }}
          >
            <Form.Item
              label={
                <span className="art-auth-label">
                  <FontSizeOutlined />
                  系统标题
                </span>
              }
              name="system_title"
              rules={[
                { required: true, message: '请输入系统标题' },
                { max: 64, message: '系统标题不能超过 64 个字符' },
              ]}
              extra="显示在登录页、浏览器标签与后台品牌位"
            >
              <Input size="large" placeholder="例如：OpenIDCS 虚拟化管理平台" maxLength={64} />
            </Form.Item>

            <Form.Item
              label={
                <span className="art-auth-label">
                  <LockOutlined />
                  管理员密码
                </span>
              }
              name="password"
              rules={[
                { required: true, message: '请输入管理员密码' },
                { min: 8, message: '密码至少 8 个字符' },
                { max: 72, message: '密码不能超过 72 个字符' },
              ]}
            >
              <Input.Password
                size="large"
                placeholder="至少 8 个字符"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="art-auth-label">
                  <LockOutlined />
                  确认密码
                </span>
              }
              name="confirm_password"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入管理员密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}
            >
              <Input.Password
                size="large"
                placeholder="请再次输入管理员密码"
                autoComplete="new-password"
              />
            </Form.Item>

            {errorMsg && (
              <Alert
                message={errorMsg}
                type="error"
                showIcon
                style={{ marginBottom: 16, borderRadius: '8px' }}
              />
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{ height: 44, fontWeight: 500 }}
              >
                完成初始化
              </Button>
            </Form.Item>

            <div className="art-auth-tip">
              初始化完成后使用账号 <strong>admin</strong> 与刚设置的密码登录
            </div>
          </Form>
        )}
      </div>
    </AuthLayout>
  )
}
