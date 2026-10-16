import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Modal, message, Alert } from 'antd'
import { UserOutlined, LockOutlined, KeyOutlined, LoginOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useUserStore } from '@/utils/data.ts'
import api from '@/utils/apis.ts'
import AuthLayout from '@/components/AuthLayout'

/**
 * 登录表单数据接口
 */
interface LoginForm {
  username: string
  password: string
}

/**
 * Token登录表单数据接口
 */
interface TokenLoginForm {
  token: string
}

/**
 * 访问密钥登录表单数据接口
 */
interface AccessKeyLoginForm {
  access_key: string
}

/** 访问密钥长度（与后端 service.AccessKeyLength 保持一致） */
const ACCESS_KEY_LENGTH = 16
/** 访问密钥字符集：大小写字母 + 数字 */
const ACCESS_KEY_PATTERN = /^[A-Za-z0-9]+$/

/**
 * 找回密码表单数据接口
 */
interface ForgotPasswordForm {
  email: string
}

/**
 * 登录页面组件
 */
function UserLogins() {
  const navigate = useNavigate()
  const { setUser, setToken } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [loginType, setLoginType] = useState<'user' | 'token' | 'access'>('user') // 登录方式：用户登录、Token登录或访问密钥登录
  const [errorMsg, setErrorMsg] = useState('') // 错误提示信息
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false) // 找回密码模态框显示状态
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false) // 找回密码加载状态
  const [userForm] = Form.useForm() // 用户登录表单实例
  const [tokenForm] = Form.useForm() // Token登录表单实例
  const [accessKeyForm] = Form.useForm() // 访问密钥登录表单实例
  const [forgotPasswordForm] = Form.useForm() // 找回密码表单实例
  // Turnstile验证码状态
  const [turnstileEnabled, setTurnstileEnabled] = useState(false)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetId = useRef<string | null>(null)

  // 加载Turnstile配置
  useEffect(() => {
    const loadTurnstileConfig = async () => {
      try {
        const res = await api.getTurnstileConfig()
        if (res.code === 200 && res.data) {
          setTurnstileEnabled(res.data.enabled)
          setTurnstileSiteKey(res.data.site_key || '')
        }
      } catch (e) {
        // 获取失败不影响登录
      }
    }
    loadTurnstileConfig()
  }, [])

  // 加载Turnstile脚本并渲染组件
  const renderTurnstile = useCallback((container: HTMLDivElement | null) => {
    if (!container || !turnstileEnabled || !turnstileSiteKey) return
    // 加载Turnstile脚本
    const existingScript = document.querySelector('script[src*="turnstile"]')
    const doRender = () => {
      if ((window as any).turnstile && container) {
        // 清除旧的widget
        if (turnstileWidgetId.current) {
          try { (window as any).turnstile.remove(turnstileWidgetId.current) } catch (_) { /* 忽略 */ }
        }
        turnstileWidgetId.current = (window as any).turnstile.render(container, {
          sitekey: turnstileSiteKey,
          size: 'flexible',
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          'error-callback': () => setTurnstileToken(''),
        })
      }
    }
    if (!existingScript) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = doRender
      document.head.appendChild(script)
    } else {
      // 脚本已加载，等待turnstile对象可用
      if ((window as any).turnstile) {
        doRender()
      } else {
        existingScript.addEventListener('load', doRender)
      }
    }
  }, [turnstileEnabled, turnstileSiteKey])

  // 当Turnstile配置加载完成后渲染（也处理已挂载容器的情况）
  useEffect(() => {
    if (turnstileEnabled && turnstileSiteKey && turnstileContainerRef.current) {
      renderTurnstile(turnstileContainerRef.current)
    }
    return () => {
      if (turnstileWidgetId.current && (window as any).turnstile) {
        try { (window as any).turnstile.remove(turnstileWidgetId.current) } catch (_) { /* 忽略 */ }
        turnstileWidgetId.current = null
      }
    }
  }, [turnstileEnabled, turnstileSiteKey, renderTurnstile])

  // callback ref: 当DOM元素挂载时自动触发渲染（解决条件渲染导致的竞态问题）
  const turnstileRef = useCallback((node: HTMLDivElement | null) => {
    turnstileContainerRef.current = node
    if (node && turnstileEnabled && turnstileSiteKey) {
      renderTurnstile(node)
    }
  }, [turnstileEnabled, turnstileSiteKey, renderTurnstile])

  // 重置Turnstile
  const resetTurnstile = () => {
    setTurnstileToken('')
    if (turnstileWidgetId.current && (window as any).turnstile) {
      try { (window as any).turnstile.reset(turnstileWidgetId.current) } catch (_) { /* 忽略 */ }
    }
  }

  /**
   * 处理用户名密码登录提交
   */
  const handleUserLogin = async (values: LoginForm) => {
    try {
      // Turnstile验证检查
      if (turnstileEnabled && !turnstileToken) {
        setErrorMsg('请完成验证码验证')
        return
      }
      setLoading(true)
      setErrorMsg('')
      
      // 调用登录API
      const response = await api.login({
        login_type: 'user',
        username: values.username,
        password: values.password,
        turnstile_token: turnstileToken,
      } as any)
      
      // 保存用户信息和token
      if (response.data?.token) {
        setToken(response.data.token)
      }
      // 优先用后端返回的user_info，否则构造基础对象保证isAuthenticated=true
      const userInfo = response.data?.user_info || { username: values.username, is_admin: false }
      setUser(userInfo as any)
      
      message.success('登录成功')
      // 根据后端返回的redirect跳转，或根据is_admin判断
      const redirectTo = response.data?.redirect || (userInfo.is_admin ? '/dashboard' : '/user/dashboard')
      navigate(redirectTo)
    } catch (error: any) {
      const errMsg = error?.response?.data?.msg || '登录失败，请检查用户名和密码'
      setErrorMsg(errMsg)
      resetTurnstile()
      // 4秒后自动隐藏错误提示
      setTimeout(() => setErrorMsg(''), 4000)
      setLoading(false)
    }
  }

  /**
   * 处理Token登录提交
   */
  const handleTokenLogin = async (values: TokenLoginForm) => {
    try {
      // Turnstile验证检查
      if (turnstileEnabled && !turnstileToken) {
        setErrorMsg('请完成验证码验证')
        return
      }
      setLoading(true)
      setErrorMsg('')
      
      // 调用登录API
      const response = await api.login({
        login_type: 'token',
        token: values.token,
        turnstile_token: turnstileToken,
      } as any)
      
      // 保存用户信息和token
      if (response.data?.token) {
        setToken(response.data.token)
      }
      // 优先用后端返回的user_info，否则构造基础对象保证isAuthenticated=true
      const userInfo = response.data?.user_info || { username: 'admin', is_admin: true }
      setUser(userInfo as any)
      
      message.success('登录成功')
      const redirectTo = response.data?.redirect || '/dashboard'
      navigate(redirectTo)
    } catch (error: any) {
      const errMsg = error?.response?.data?.msg || 'Token登录失败，请检查Token是否正确'
      setErrorMsg(errMsg)
      resetTurnstile()
      // 4秒后自动隐藏错误提示
      setTimeout(() => setErrorMsg(''), 4000)
      setLoading(false)
    }
  }

  /**
   * 处理访问密钥登录提交
   *
   * 访问密钥直接绑定虚拟机，登录成功后后端返回 redirect（该虚拟机的管理页面路由），
   * 前端借此一步直达，无需再选择主机/虚拟机。
   */
  const handleAccessKeyLogin = async (values: AccessKeyLoginForm) => {
    try {
      // Turnstile验证检查
      if (turnstileEnabled && !turnstileToken) {
        setErrorMsg('请完成验证码验证')
        return
      }
      setLoading(true)
      setErrorMsg('')

      const accessKey = (values.access_key || '').trim()
      const response = await api.login({
        login_type: 'access_key',
        access_key: accessKey,
        turnstile_token: turnstileToken,
      } as any)

      const data: any = response.data || {}
      // 受限身份（虚拟用户）同样写入用户状态，才能通过前端登录态校验
      const userInfo = data.user_info || {
        username: data.hs_name || accessKey,
        is_admin: false,
        temp_login: true,
        temp_hs_name: data.hs_name,
        temp_vm_uuid: data.vm_uuid,
      }
      setUser(userInfo as any)

      message.success('登录成功')
      const redirectTo = data.redirect
        || (data.hs_name && data.vm_uuid ? `/hosts/${data.hs_name}/vms/${data.vm_uuid}` : '/')
      navigate(redirectTo)
    } catch (error: any) {
      const errMsg = error?.response?.data?.msg || '访问密钥登录失败，请检查密钥是否正确'
      setErrorMsg(errMsg)
      resetTurnstile()
      // 4秒后自动隐藏错误提示
      setTimeout(() => setErrorMsg(''), 4000)
      setLoading(false)
    }
  }

  /**
   * 切换登录方式
   */
  const switchLoginType = (type: 'user' | 'token' | 'access') => {
    setLoginType(type)
    setErrorMsg('')
  }

  /**
   * 打开找回密码模态框
   */
  const openForgotPasswordModal = () => {
    setForgotPasswordVisible(true)
    forgotPasswordForm.resetFields()
  }

  /**
   * 关闭找回密码模态框
   */
  const closeForgotPasswordModal = () => {
    setForgotPasswordVisible(false)
    forgotPasswordForm.resetFields()
  }

  /**
   * 处理找回密码提交
   */
  const handleForgotPassword = async (values: ForgotPasswordForm) => {
    try {
      // Turnstile验证检查
      if (turnstileEnabled && !turnstileToken) {
        message.error('请完成验证码验证')
        return
      }
      setForgotPasswordLoading(true)
      
      // 调用找回密码API
      await api.forgotPassword(values.email, turnstileToken)
      
      message.success('重置邮件已发送，请查收')
      // 3秒后自动关闭模态框
      setTimeout(() => {
        closeForgotPasswordModal()
      }, 3000)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.msg || '发送失败，请重试'
      message.error(errorMessage)
      resetTurnstile()
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  return (
    <AuthLayout>
      {/* 登录卡片 */}
      <div className="art-auth-card">
        {/* 标题区域 */}
        <div>
          {/* Logo图标 */}
          <div className="art-auth-logo">
            <SafetyCertificateOutlined style={{ fontSize: 26 }} />
          </div>
          <h1 className="art-auth-title">
            OpenIDCS 受控端
          </h1>
          <p className="art-auth-subtitle">
            <LockOutlined />
            开源 &amp; 多平台虚拟化管理平台
          </p>
        </div>

        {/* 登录方式切换Tab */}
        <div className="art-auth-tabs">
          <button
            type="button"
            className={`art-auth-tab${loginType === 'user' ? ' is-active' : ''}`}
            onClick={() => switchLoginType('user')}
          >
            <UserOutlined style={{ marginRight: 4 }} />
            用户登录
          </button>
          <button
            type="button"
            className={`art-auth-tab${loginType === 'token' ? ' is-active' : ''}`}
            onClick={() => switchLoginType('token')}
          >
            <KeyOutlined style={{ marginRight: 4 }} />
            Token登录
          </button>
          <button
            type="button"
            className={`art-auth-tab${loginType === 'access' ? ' is-active' : ''}`}
            title="虚拟机访问密钥登录"
            onClick={() => switchLoginType('access')}
          >
            <SafetyCertificateOutlined style={{ marginRight: 4 }} />
            密钥登录
          </button>
        </div>

        {/* 用户名密码登录表单 */}
        {loginType === 'user' && (
          <Form
            form={userForm}
            name="userLogin"
            onFinish={handleUserLogin}
            autoComplete="off"
            layout="vertical"
          >
            {/* 用户名输入框 */}
            <Form.Item
              label={
                <span className="art-auth-label">
                  <UserOutlined />
                  用户名
                </span>
              }
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                size="large"
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </Form.Item>

            {/* 密码输入框 */}
            <Form.Item
              label={
                <span className="art-auth-label">
                  <LockOutlined />
                  密码
                </span>
              }
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                size="large"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>

            {/* 错误提示 */}
            {errorMsg && (
              <Alert
                message={errorMsg}
                type="error"
                showIcon
                style={{ marginBottom: 16, borderRadius: '8px' }}
              />
            )}

            {/* Turnstile验证码 */}
            {turnstileEnabled && turnstileSiteKey && (
              <div className="turnstile-container" style={{ marginBottom: 16, width: '100%' }}>
                <div ref={turnstileRef} style={{ width: '100%' }} />
              </div>
            )}

            {/* 登录按钮 */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                icon={<LoginOutlined />}
                style={{ height: 44, fontWeight: 500 }}
              >
                登 录
              </Button>
            </Form.Item>

            {/* 底部链接 */}
            <div className="art-auth-footer">
              <Link to="/register" className="art-auth-link">
                还没有账号？立即注册
              </Link>
              <span className="art-auth-link" onClick={openForgotPasswordModal}>
                忘记密码？
              </span>
            </div>
          </Form>
        )}

        {/* Token登录表单 */}
        {loginType === 'token' && (
          <Form
            form={tokenForm}
            name="tokenLogin"
            onFinish={handleTokenLogin}
            autoComplete="off"
            layout="vertical"
          >
            {/* Token输入框 */}
            <Form.Item
              label={
                <span className="art-auth-label">
                  <KeyOutlined />
                  访问Token
                </span>
              }
              name="token"
              rules={[{ required: true, message: '请输入访问Token' }]}
            >
              <Input.Password
                size="large"
                placeholder="请输入访问Token"
              />
            </Form.Item>

            {/* 错误提示 */}
            {errorMsg && (
              <Alert
                message={errorMsg}
                type="error"
                showIcon
                style={{ marginBottom: 16, borderRadius: '8px' }}
              />
            )}

            {/* Turnstile验证码 */}
            {turnstileEnabled && turnstileSiteKey && (
              <div className="turnstile-container" style={{ marginBottom: 16, width: '100%' }}>
                <div ref={turnstileRef} style={{ width: '100%' }} />
              </div>
            )}

            {/* 登录按钮 */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                icon={<LoginOutlined />}
                style={{ height: 44, fontWeight: 500 }}
              >
                登 录
              </Button>
            </Form.Item>

            {/* 提示信息 */}
            <div className="art-auth-tip">
              启动服务时会在控制台显示访问 Token
            </div>
          </Form>
        )}

        {/* 访问密钥登录表单 */}
        {loginType === 'access' && (
          <Form
            form={accessKeyForm}
            name="accessKeyLogin"
            onFinish={handleAccessKeyLogin}
            autoComplete="off"
            layout="vertical"
          >
            {/* 访问密钥输入框 */}
            <Form.Item
              label={
                <span className="art-auth-label">
                  <SafetyCertificateOutlined />
                  访问密钥
                </span>
              }
              name="access_key"
              rules={[
                { required: true, message: '请输入访问密钥' },
                {
                  validator: (_, value) => {
                    const key = (value || '').trim()
                    if (!key) return Promise.resolve()
                    if (key.length !== ACCESS_KEY_LENGTH) {
                      return Promise.reject(new Error(`访问密钥为 ${ACCESS_KEY_LENGTH} 位字符`))
                    }
                    if (!ACCESS_KEY_PATTERN.test(key)) {
                      return Promise.reject(new Error('访问密钥只能包含大小写字母和数字'))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <Input
                size="large"
                placeholder={`请输入 ${ACCESS_KEY_LENGTH} 位访问密钥`}
                maxLength={ACCESS_KEY_LENGTH}
                style={{ fontFamily: 'monospace', letterSpacing: 2 }}
              />
            </Form.Item>

            {/* 错误提示 */}
            {errorMsg && (
              <Alert
                message={errorMsg}
                type="error"
                showIcon
                style={{ marginBottom: 16, borderRadius: '8px' }}
              />
            )}

            {/* Turnstile验证码 */}
            {turnstileEnabled && turnstileSiteKey && (
              <div className="turnstile-container" style={{ marginBottom: 16, width: '100%' }}>
                <div ref={turnstileRef} style={{ width: '100%' }} />
              </div>
            )}

            {/* 登录按钮 */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                icon={<LoginOutlined />}
                style={{ height: 44, fontWeight: 500 }}
              >
                登 录
              </Button>
            </Form.Item>

            {/* 提示信息 */}
            <div className="art-auth-tip">
              访问密钥由虚拟机所有者或管理员在「实例详情 - 访问密钥」中生成，登录后直接进入该虚拟机
            </div>
          </Form>
        )}

      </div>

      {/* 找回密码模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: 'var(--main-color)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MailOutlined style={{ color: 'white', fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>找回密码</div>
              <div style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', marginTop: 2 }}>通过邮件重置您的密码</div>
            </div>
          </div>
        }
        open={forgotPasswordVisible}
        onCancel={closeForgotPasswordModal}
        footer={null}
        width={480}
      >
        <Form
          form={forgotPasswordForm}
          onFinish={handleForgotPassword}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          {/* 邮箱输入框 */}
          <Form.Item
            label="邮箱地址"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
            extra=""
          >
            <Input
              size="large"
              placeholder="请输入注册时使用的邮箱"
              style={{ borderRadius: '8px' }}
            />
              <span>我们将向此邮箱发送密码重置链接</span>
          </Form.Item>

          {/* Turnstile验证码 */}
          {turnstileEnabled && turnstileSiteKey && (
            <div style={{ marginBottom: 16, width: '100%' }}>
              <div ref={turnstileRef} style={{ width: '100%' }} />
            </div>
          )}

          {/* 按钮组 */}
          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              <Button
                onClick={closeForgotPasswordModal}
                size="large"
                style={{ flex: 1, borderRadius: '8px' }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={forgotPasswordLoading}
                size="large"
                icon={<MailOutlined />}
                style={{ flex: 1 }}
              >
                发送重置邮件
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </AuthLayout>
  )
}

export default UserLogins
