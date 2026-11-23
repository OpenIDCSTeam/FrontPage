import {useState, useEffect, useMemo, useCallback, useRef} from 'react'
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
    SearchOutlined,
    QuestionCircleOutlined,
    CloseOutlined,
} from '@ant-design/icons'
import {useUserStore} from '@/utils/data.ts'
import {useSiteStore} from '@/utils/site.ts'
import api from '@/utils/apis.ts'
import AppearanceMenu from '@/components/AppearanceMenu'
import LanguageMenu from '@/components/LanguageMenu'
import type {MenuProps} from 'antd'

const {Header, Sider, Content} = Layout

/**
 * 侧栏菜单标签：展开态显示完整名称，折叠态只显示两字短标签。
 * 短标签由 CSS 控制显隐，保证同一份 DOM 无需重渲染即可切换。
 */
function MenuLabel({ text, short }: { text: string; short: string }) {
    return (
        <span className="art-menu-label">
            <span className="art-menu-label-full">{text}</span>
            <span className="art-menu-label-short">{short}</span>
        </span>
    )
}

const SIDEBAR_COLLAPSED_KEY = 'quickidc:sidebar-collapsed:v1'

/** 读取上次的折叠选择；没有记录时回退到默认值（竖版详情默认折叠） */
function readSidebarCollapsed(fallback: boolean): boolean {
    try {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        if (saved === 'true' || saved === 'false') return saved === 'true'
    } catch {
        // 浏览器禁用本地存储时使用默认值
    }
    return fallback
}

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
    const siteTitle = useSiteStore(state => state.title)
    const isRestrictedSession = Boolean((user as any)?.temp_login || ((user as any)?.temp_hs_name && (user as any)?.temp_vm_uuid))
    // 折叠状态持久化：刷新后沿用上次的选择；无记录时按当前路由给默认值
    const [collapsed, setCollapsed] = useState(() => readSidebarCollapsed(window.location.pathname.endsWith('/v2')))
    const [isMobile, setIsMobile] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [notifications, setNotifications] = useState(0)

    useEffect(() => {
        if (!user || user.is_admin === undefined) {
            api.getCurrentUser().then(res => {
                if (res.code === 200 && res.data) {
                    setUser(res.data)
                }
            }).catch(() => {})
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

    // 折叠状态落盘：顶部按钮、侧栏底部按钮和竖版详情自动折叠都会走到这里
    useEffect(() => {
        try {
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
        } catch {
            // 浏览器禁用本地存储时忽略
        }
    }, [collapsed])

    // 进入竖版详情时默认折叠主菜单，用户仍可通过侧栏底部按钮展开；
    // 首屏不强制覆盖，交给上面持久化的状态，刷新后才能保留上次的选择。
    const wasVerticalDetailRef = useRef(isVerticalDetail)
    useEffect(() => {
        if (isVerticalDetail && !wasVerticalDetailRef.current) setCollapsed(true)
        wasVerticalDetailRef.current = isVerticalDetail
    }, [isVerticalDetail])

    // 用户界面菜单项
    const userMenuItems: MenuProps['items'] = [
        { key: '/user/dashboard', icon: <DashboardOutlined/>, label: <MenuLabel text="资源概览" short="概览"/> },
        { key: '/user/vms',       icon: <CloudServerOutlined/>, label: <MenuLabel text="实例管理" short="实例"/> },
        { key: '/user/proxys',    icon: <GlobalOutlined/>,      label: <MenuLabel text="反向代理" short="反代"/> },
        { key: '/user/nat',       icon: <SwapOutlined/>,        label: <MenuLabel text="端口转发" short="端口"/> },
        { key: '/profile',        icon: <UserOutlined/>,        label: <MenuLabel text="个人资料" short="资料"/> },
    ]

    // 系统界面菜单项（仅管理员可见）
    const adminMenuItems: MenuProps['items'] = [
        { key: '/dashboard',  icon: <DashboardOutlined/>,   label: <MenuLabel text="系统概览" short="概览"/> },
        { key: '/hosts',      icon: <CloudServerOutlined/>, label: <MenuLabel text="主机管理" short="主机"/> },
        { key: '/vms',        icon: <CloudServerOutlined/>, label: <MenuLabel text="实例管理" short="实例"/> },
        { key: '/web-proxys', icon: <GlobalOutlined/>,      label: <MenuLabel text="反向代理" short="反代"/> },
        { key: '/nat-rules',  icon: <SwapOutlined/>,        label: <MenuLabel text="端口转发" short="端口"/> },
        { key: '/users',      icon: <UserOutlined/>,        label: <MenuLabel text="用户管理" short="用户"/> },
        { key: '/tasks',      icon: <ScheduleOutlined/>,    label: <MenuLabel text="任务管理" short="任务"/> },
        { key: '/logs',       icon: <FileTextOutlined/>,    label: <MenuLabel text="日志查看" short="日志"/> },
        { key: '/settings',   icon: <SettingOutlined/>,     label: <MenuLabel text="系统设置" short="设置"/> },
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

    // 用户下拉菜单：访问密钥身份只保留退出登录
    const dropdownMenuItems: MenuProps['items'] = isRestrictedSession
        ? [
            { key: 'logout', icon: <LogoutOutlined/>, label: '退出登录', onClick: () => { logout(); navigate('/login') } },
        ]
        : [
            { key: 'profile',  icon: <UserOutlined/>,  label: '个人资料', onClick: () => navigate('/profile') },
            { key: 'settings', icon: <SettingOutlined/>, label: '设置',   onClick: () => navigate('/settings') },
            { type: 'divider' },
            { key: 'logout',   icon: <LogoutOutlined/>, label: '退出登录', onClick: () => { logout(); navigate('/login') } },
        ]

    // 访问密钥身份只允许停留在绑定的虚拟机详情，其他路由强制回退
    useEffect(() => {
        if (!isRestrictedSession) return
        const restrictedHost = (user as any)?.temp_hs_name
        const restrictedVm = (user as any)?.temp_vm_uuid
        if (!restrictedHost || !restrictedVm) return
        const allowedPath = `/hosts/${restrictedHost}/vms/${restrictedVm}`
        if (location.pathname !== allowedPath) {
            navigate(allowedPath, { replace: true })
        }
    }, [isRestrictedSession, location.pathname, navigate, user])

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

    const isVMDetailRoute = /\/vms\/[^/]+/.test(location.pathname)

    return (
        <Layout className="art-layout">

            {/* ===== 全局深色顶栏：品牌 + 折叠开关 + 面包屑 + 全局操作 ===== */}
            <Header className="art-header">
                <div className="art-header-left">
                    {!isRestrictedSession && (
                        <Button
                            type="text"
                            className="art-header-btn"
                            aria-label={collapsed ? '展开导航' : '收起导航'}
                            icon={isMobile ? <MenuUnfoldOutlined/> : (collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>)}
                            onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}
                        />
                    )}
                    <div className="art-header-brand" onClick={isRestrictedSession ? undefined : goHome}>
                        <div className="art-header-logo"><img src="/logo.svg" alt="Quick IDC" className="art-brand-mark"/></div>
                        <div className="art-header-brand-text">
                            <span className="art-header-brand-name">{siteTitle}</span>
                            <span className="art-header-brand-desc">{user?.is_admin ? '管理控制台' : '用户控制台'}</span>
                        </div>
                    </div>
                    {!isVMDetailRoute && <Breadcrumb items={breadcrumbItems} />}
                </div>

                <div className="art-header-right">

                        {/* 搜索框：受限身份不展示，避免跳出当前虚拟机 */}
                        {!isRestrictedSession && (
                            <Input
                                className="art-header-search"
                                placeholder="搜索功能..."
                                variant="borderless"
                                prefix={<SearchOutlined style={{ fontSize: 14 }} />}
                            />
                        )}

                        <AppearanceMenu />

                        {/* 语言切换 */}
                        <LanguageMenu />

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
            {!isRestrictedSession && (isMobile ? (
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
                            <div className="art-logo"><img src="/logo.svg" alt="Quick IDC" className="art-brand-mark"/></div>
                            <div className="art-logo-text">
                                <span className="art-logo-title">{siteTitle}</span>
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
            ))}

                <Layout className="art-main">
                {/* 内容区域 */}
                <Content className="art-content">
                    <main className="art-page-stage">
                        <Outlet/>
                    </main>
                    {/* 底部 Footer */}
                    <footer className="art-footer">
                        <div>{siteTitle} · v{__APP_VERSION__}</div>
                        <div className="art-footer-copyright" dir="ltr">© {new Date().getFullYear()} QuickIDC Team. All rights reserved.</div>
                    </footer>
                </Content>
                </Layout>
            </Layout>

        </Layout>
    )
}

export default MainLayout
