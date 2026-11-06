import {useState, useEffect, useMemo, useCallback} from 'react'
import {Outlet, useNavigate, useLocation} from 'react-router-dom'
import {Layout, Menu, Avatar, Dropdown, Badge, Button, Input, Tooltip, Breadcrumb, Drawer} from 'antd'
import {
    DashboardOutlined,
    CloudServerOutlined,
    UserOutlined,
    SettingOutlined,
    FileTextOutlined,
    ScheduleOutlined,
    BellOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    GlobalOutlined,
    SwapOutlined,
    TranslationOutlined,
    CheckOutlined,
    SearchOutlined,
    QuestionCircleOutlined,
    CloseOutlined,
} from '@ant-design/icons'
import {useUserStore} from '@/utils/data.ts'
import api from '@/utils/apis.ts'
import { changeLanguage, getAvailableLanguages, getCurrentLanguage, SUPPORTED_LANGUAGES } from '@/utils/i18n.ts'
import AppearanceMenu from '@/components/AppearanceMenu'
import type {MenuProps} from 'antd'

const {Header, Sider, Content} = Layout

/**
 * 主布局组件
 * ------------------------------------------------------------------
 * 结构：品牌侧边栏（桌面端固定 / 移动端抽屉） + 主题化顶栏 + 内容区
 * 视觉由 ThemeContext 的三套预设 token 统一驱动，管理端与用户端共用同一套结构。
 */
function MainLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const {user, logout, setUser} = useUserStore()
    const [collapsed, setCollapsed] = useState(() => window.location.pathname.endsWith('/v2'))
    const [isMobile, setIsMobile] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [notifications, setNotifications] = useState(0)
    const [currentLang, setCurrentLang] = useState('zh-cn')
    const [languages, setLanguages] = useState<any[]>([])

    useEffect(() => {
        if (!user || user.is_admin === undefined) {
            api.getCurrentUser().then(res => {
                if (res.code === 200 && res.data) {
                    setUser(res.data)
                }
            }).catch(() => {})
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setCurrentLang(getCurrentLanguage())
        setLanguages(getAvailableLanguages())
        const handleLangChange = (e: any) => { setCurrentLang(e.detail.language) }
        const handleLangsLoaded = (e: any) => {
            setLanguages(e.detail.languages)
            setCurrentLang(getCurrentLanguage())
        }
        window.addEventListener('languageChanged', handleLangChange)
        window.addEventListener('languagesLoaded', handleLangsLoaded)
        return () => {
            window.removeEventListener('languageChanged', handleLangChange)
            window.removeEventListener('languagesLoaded', handleLangsLoaded)
        }
    }, [])

    // 移动端（< 992px）使用抽屉式导航，避免侧边栏挤压内容区
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 991px)')
        const apply = () => {
            setIsMobile(mq.matches)
            if (!mq.matches) setDrawerOpen(false)
        }
        apply()
        mq.addEventListener('change', apply)
        return () => mq.removeEventListener('change', apply)
    }, [])

    // 路由切换后自动收起移动端抽屉
    useEffect(() => { setDrawerOpen(false) }, [location.pathname])

    const isVerticalDetail = location.pathname.endsWith('/v2')

    // 进入竖版详情时默认折叠主菜单，用户仍可通过侧栏底部按钮展开
    useEffect(() => {
        if (isVerticalDetail) setCollapsed(true)
    }, [isVerticalDetail])

    // 语言菜单项
    const languageMenuItems: MenuProps['items'] = (languages.length > 0 ? languages : SUPPORTED_LANGUAGES).map(lang => ({
        key: lang.code,
        label: lang.native || lang.name,
        icon: lang.code === currentLang ? <CheckOutlined /> : undefined,
    }))

    // 用户界面菜单项
    const userMenuItems: MenuProps['items'] = [
        { key: '/user/dashboard', icon: <DashboardOutlined/>, label: '资源概览' },
        { key: '/user/vms',       icon: <CloudServerOutlined/>, label: '实例管理' },
        { key: '/user/proxys',    icon: <GlobalOutlined/>,      label: '反向代理' },
        { key: '/user/nat',       icon: <SwapOutlined/>,        label: '端口转发' },
        { key: '/profile',        icon: <UserOutlined/>,        label: '个人资料' },
    ]

    // 系统界面菜单项（仅管理员可见）
    const adminMenuItems: MenuProps['items'] = [
        { key: '/dashboard',  icon: <DashboardOutlined/>,   label: '系统概览' },
        { key: '/hosts',      icon: <CloudServerOutlined/>, label: '主机管理' },
        { key: '/vms',        icon: <CloudServerOutlined/>, label: '实例管理' },
        { key: '/web-proxys', icon: <GlobalOutlined/>,      label: '反向代理' },
        { key: '/nat-rules',  icon: <SwapOutlined/>,        label: '端口转发' },
        { key: '/users',      icon: <UserOutlined/>,        label: '用户管理' },
        { key: '/tasks',      icon: <ScheduleOutlined/>,    label: '任务管理' },
        { key: '/logs',       icon: <FileTextOutlined/>,    label: '日志查看' },
        { key: '/settings',   icon: <SettingOutlined/>,     label: '系统设置' },
    ]

    /**
     * 导航结构：使用「分组」而不是可折叠的子菜单。
     * 14 个入口一屏可见、层级只剩「分组标题 → 条目」两级，
     * 任意时刻只有一个选中态（渐变药丸），不会出现颜色叠加或覆盖不全。
     */
    const menuItems: MenuProps['items'] = [
        {
            type: 'group',
            key: 'user-interface',
            label: '用户空间',
            children: userMenuItems,
        },
        ...(user?.is_admin
            ? [{
                type: 'group' as const,
                key: 'system-interface',
                label: '系统空间',
                children: adminMenuItems,
            }]
            : []),
    ]

    // 所有可导航的叶子路由，用于计算高亮项（支持 /hosts/:name/vms 这类嵌套路由）
    const routeKeys = useMemo(
        () => [...userMenuItems, ...adminMenuItems]
            .map(i => String((i as any)?.key || ''))
            .filter(k => k.startsWith('/')),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user?.is_admin],
    )

    const selectedKeys = useMemo(() => {
        const path = location.pathname
        if (routeKeys.includes(path)) return [path]
        const match = routeKeys
            .filter(k => path === k || path.startsWith(`${k}/`))
            .sort((a, b) => b.length - a.length)[0]
        return match ? [match] : []
    }, [location.pathname, routeKeys])

    // 顶栏面包屑：工作空间 → 各层级路由（路由段 → 中文标签）
    const breadcrumbItems = useMemo(() => {
        const labels: Record<string, string> = {
            dashboard: '系统概览',
            hosts: '主机管理',
            vms: '实例管理',
            'web-proxys': '反向代理',
            'nat-rules': '端口转发',
            users: '用户管理',
            tasks: '任务管理',
            logs: '日志查看',
            settings: '系统设置',
            user: '用户空间',
            proxys: '反向代理',
            nat: '端口转发',
            profile: '个人资料',
        }
        const root = user?.is_admin ? '管理控制台' : '用户空间'
        const items: { title: string }[] = [{ title: root }]
        location.pathname.split('/').filter(Boolean).forEach(seg => {
            const decoded = decodeURIComponent(seg)
            const label = labels[decoded] || (decoded.length > 14 ? `${decoded.slice(0, 10)}…` : decoded)
            if (items[items.length - 1].title !== label) items.push({ title: label })
        })
        return items
    }, [location.pathname, user?.is_admin])

    // 用户下拉菜单
    const dropdownMenuItems: MenuProps['items'] = [
        { key: 'profile',  icon: <UserOutlined/>,  label: '个人资料', onClick: () => navigate('/profile') },
        { key: 'settings', icon: <SettingOutlined/>, label: '设置',   onClick: () => navigate('/settings') },
        { type: 'divider' },
        { key: 'logout',   icon: <LogoutOutlined/>, label: '退出登录', onClick: () => { logout(); navigate('/login') } },
    ]

    const handleMenuClick: MenuProps['onClick'] = ({key}) => { navigate(key) }

    const goHome = useCallback(() => {
        navigate(user?.is_admin ? '/dashboard' : '/user/dashboard')
    }, [navigate, user?.is_admin])

    // ---------- 侧边栏内容（桌面 Sider 与移动抽屉共用） ----------
    // 品牌标记已上移到深色全局顶栏，侧边栏只承载导航与折叠开关
    const sideContent = (
        <>
            <div className="art-sidebar-body">
                <Menu
                    mode="inline"
                    className="art-menu"
                    selectedKeys={selectedKeys}
                    items={menuItems}
                    onClick={handleMenuClick}
                />
            </div>

            <Tooltip title={collapsed ? '展开导航' : '收起导航'} placement="right">
                <div className="art-sidebar-footer" onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>}
                </div>
            </Tooltip>
        </>
    )

    if (isVerticalDetail && isMobile) {
        return (
            <Layout style={{ minHeight: '100dvh', height: '100dvh', overflow: 'hidden' }}>
                <Content style={{ minHeight: 0, overflow: 'hidden' }}>
                    <Outlet />
                </Content>
            </Layout>
        )
    }

    if (isVerticalDetail) {
        return (
            <Layout style={{ minHeight: '100dvh', height: '100dvh', overflow: 'hidden' }}>
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={208}
                    collapsedWidth={56}
                    className="art-sidebar"
                >
                    {sideContent}
                </Sider>
                <Layout className="art-main" style={{ minWidth: 0 }}>
                    <Content style={{ minHeight: 0, overflow: 'hidden' }}>
                        <Outlet />
                    </Content>
                </Layout>
            </Layout>
        )
    }

    return (
        <Layout className="art-layout">

            {/* ===== 全局深色顶栏：品牌 + 折叠开关 + 面包屑 + 全局操作 ===== */}
            <Header className="art-header">
                <div className="art-header-left">
                    <Button
                        type="text"
                        className="art-header-btn"
                        aria-label={collapsed ? '展开导航' : '收起导航'}
                        icon={isMobile ? <MenuUnfoldOutlined/> : (collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>)}
                        onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}
                    />
                    <div className="art-header-brand" onClick={goHome}>
                        <div className="art-header-logo">OI</div>
                        <div className="art-header-brand-text">
                            <span className="art-header-brand-name">OpenIDCS</span>
                            <span className="art-header-brand-desc">{user?.is_admin ? '管理控制台' : '用户控制台'}</span>
                        </div>
                    </div>
                    <Breadcrumb items={breadcrumbItems} />
                </div>

                <div className="art-header-right">

                        {/* 搜索框 */}
                        <Input
                            className="art-header-search"
                            placeholder="搜索功能..."
                            variant="borderless"
                            prefix={<SearchOutlined style={{ fontSize: 14 }} />}
                        />

                        <AppearanceMenu />

                        {/* 语言切换 */}
                        <Dropdown
                            menu={{ items: languageMenuItems, onClick: ({key}) => changeLanguage(key) }}
                            placement="bottomRight"
                            overlayStyle={{ zIndex: 1050 }}
                            getPopupContainer={() => document.body}
                        >
                            <Tooltip title={`切换语言 · ${SUPPORTED_LANGUAGES.find(lang => lang.code === currentLang)?.native || ''}`}>
                                <Button
                                    type="text"
                                    className="art-header-btn"
                                    icon={<TranslationOutlined />}
                                />
                            </Tooltip>
                        </Dropdown>

                        {/* 帮助 */}
                        <Tooltip title="帮助">
                            <Button
                                type="text"
                                className="art-header-btn art-header-btn-help"
                                                                    icon={<QuestionCircleOutlined />}
                            />
                        </Tooltip>

                        {/* 通知 */}
                        <Tooltip title="消息中心">
                            <Badge count={notifications} size="small" offset={[-4, 4]}>
                                <Button
                                    type="text"
                                    className="art-header-btn art-header-btn-notifications"
                                    icon={<BellOutlined />}
                                    onClick={() => setNotifications(0)}
                                />
                            </Badge>
                        </Tooltip>

                        {/* 用户信息 */}
                        <Dropdown
                            menu={{ items: dropdownMenuItems }}
                            placement="bottomRight"
                            overlayStyle={{ zIndex: 1050 }}
                            getPopupContainer={() => document.body}
                        >
                            <div className="art-header-user">
                                <Avatar icon={<UserOutlined/>} size={34} />
                                <span className="art-header-username">
                                    {user?.username || '用户'}
                                </span>
                            </div>
                        </Dropdown>
                    </div>

            </Header>

            {/* ===== 顶栏之下：侧边栏 + 内容 ===== */}
            <Layout className="art-main-row">
            {isMobile ? (
                <Drawer
                    placement="left"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    width={260}
                    closable={false}
                    rootClassName="art-nav-drawer"
                    styles={{ body: { padding: 0 } }}
                >
                    <div className="art-sidebar art-sidebar--static">
                        <div className="art-sidebar-header">
                            <div className="art-logo">OI</div>
                            <div className="art-logo-text">
                                <span className="art-logo-title">OpenIDCS</span>
                                <span className="art-logo-desc">{user?.is_admin ? '管理控制台' : '用户控制台'}</span>
                            </div>
                            <Button
                                type="text"
                                className="art-header-btn"
                                style={{ marginLeft: 'auto' }}
                                icon={<CloseOutlined />}
                                onClick={() => setDrawerOpen(false)}
                            />
                        </div>
                        <div className="art-sidebar-body">
                            <Menu
                                mode="inline"
                                className="art-menu"
                                selectedKeys={selectedKeys}
                                items={menuItems}
                                onClick={handleMenuClick}
                            />
                        </div>
                    </div>
                </Drawer>
            ) : (
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={208}
                    collapsedWidth={56}
                    className="art-sidebar"
                >
                    {sideContent}
                </Sider>
            )}

                <Layout className="art-main">
                {/* 内容区域 */}
                <Content className="art-content">
                    <main className="art-page-stage">
                        <Outlet/>
                    </main>
                    {/* 底部 Footer */}
                    <footer className="art-footer">
                        <div>OpenIDCS 虚拟化管理平台 · v{__APP_VERSION__}</div>
                        <div className="art-footer-copyright">© {new Date().getFullYear()} OpenIDCS Team. All rights reserved.</div>
                    </footer>
                </Content>
                </Layout>
            </Layout>

        </Layout>
    )
}

export default MainLayout
