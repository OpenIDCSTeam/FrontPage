import {useState, useEffect, useMemo, useCallback} from 'react'
import type {CSSProperties} from 'react'
import {Outlet, useNavigate, useLocation} from 'react-router-dom'
import {Layout, Menu, Avatar, Dropdown, Badge, Button, Input, Tooltip, Modal, Form, Space, Popconfirm, message, Breadcrumb, Drawer} from 'antd'
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
    SunOutlined,
    MoonOutlined,
    BgColorsOutlined,
    RadiusSettingOutlined,
    FormatPainterOutlined,
    CheckOutlined,
    SearchOutlined,
    QuestionCircleOutlined,
    AppstoreOutlined,
    PictureOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    CloseOutlined,
} from '@ant-design/icons'
import { addCustomAnimeTheme, updateCustomAnimeTheme, deleteCustomAnimeTheme, AnimeTheme, isSolidTheme } from '@/config/animeThemes.config'
import { FONT_OPTIONS } from '@/config/fonts.config'
import {useUserStore} from '@/utils/data.ts'
import api from '@/utils/apis.ts'
import { changeLanguage, getAvailableLanguages, getCurrentLanguage } from '@/utils/i18n.ts'
import { useTheme } from '@/contexts/ThemeContext'
import type {MenuProps} from 'antd'

const {Header, Sider, Content} = Layout

/**
 * 主布局组件
 * ------------------------------------------------------------------
 * 结构：品牌侧边栏（桌面端固定 / 移动端抽屉） + 玻璃顶栏 + 内容区
 * 视觉令牌全部来自 src/styles/art-design.css，组件内不写业务配色，
 * 保证「亮色 / 暗色 / 透明 / 壁纸」四种模式共用同一套结构。
 */
function MainLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const {user, logout, setUser} = useUserStore()
    const { theme: currentTheme, toggleTheme, transparentMode, toggleTransparentMode, roundedMode, toggleRoundedMode, liquidMode, toggleLiquidMode, fontId, setFontId, animeThemeId, setAnimeTheme, animeThemes, refreshAnimeThemes, animeBlurMode, toggleAnimeBlurMode } = useTheme()
    const [collapsed, setCollapsed] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [notifications, setNotifications] = useState(0)
    const [currentLang, setCurrentLang] = useState('zh-cn')
    const [languages, setLanguages] = useState<any[]>([])
    // 二次元主题管理弹窗
    const [animeModalOpen, setAnimeModalOpen] = useState(false)
    const [editingTheme, setEditingTheme] = useState<AnimeTheme | null>(null)
    const [themeForm] = Form.useForm()

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

    // 语言菜单项
    const languageMenuItems: MenuProps['items'] = (languages.length > 0 ? languages : [
        { code: 'zh-cn', native: '简体中文' },
        { code: 'en-us', native: 'English' }
    ]).map(lang => ({
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
            v2: '新版面板',
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

    // ---------- 主题设置面板 ----------
    // 五个开关共用同一个强调色，不再各配一种色相（单一强调色约束）
    const themeToggles = [
        { key: 'mode',    label: currentTheme === 'dark' ? '浅色' : '深色', active: currentTheme === 'dark', icon: currentTheme === 'dark' ? <SunOutlined /> : <MoonOutlined />, onClick: toggleTheme },
        { key: 'glass',   label: '透明', active: transparentMode, icon: <BgColorsOutlined />, onClick: toggleTransparentMode },
        { key: 'rounded', label: '圆角', active: roundedMode,     icon: <RadiusSettingOutlined />, onClick: toggleRoundedMode },
        { key: 'liquid',  label: '玻璃', active: liquidMode,      icon: <AppstoreOutlined />, onClick: toggleLiquidMode },
        { key: 'blur',    label: '模糊', active: animeBlurMode,   icon: <FormatPainterOutlined />, onClick: toggleAnimeBlurMode },
    ]

    const themePanelContent = (
        <div className="art-theme-panel">
            {/* 显示开关 */}
            <div className="art-theme-panel-label">
                <span>显示</span>
            </div>
            <div className="art-theme-toggle-grid">
                {themeToggles.map(item => (
                    <div
                        key={item.key}
                        className={`art-theme-toggle${item.active ? ' is-active' : ''}`}
                        onClick={item.onClick}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') item.onClick() }}
                    >
                        <span className="art-theme-toggle-icon">{item.icon}</span>
                        <span className="art-theme-toggle-text">{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="art-theme-divider" />

            {/* 字体 */}
            <div className="art-theme-panel-label">
                <span>字体</span>
            </div>
            <div className="art-font-list">
                {FONT_OPTIONS.map(option => (
                    <div
                        key={option.id}
                        className={`art-font-item${fontId === option.id ? ' is-active' : ''}`}
                        onClick={() => setFontId(option.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFontId(option.id) }}
                    >
                        <span className="art-font-item-sample" style={{ fontFamily: option.previewStack }}>
                            {option.sample}
                        </span>
                        <span className="art-font-item-body">
                            <span className="art-font-item-name">{option.name}</span>
                            <span className="art-font-item-desc">{option.desc}</span>
                        </span>
                    </div>
                ))}
            </div>

            <div className="art-theme-divider" />

            {/* 壁纸 */}
            <div className="art-theme-panel-label">
                <span>壁纸</span>
                <span
                    className="art-theme-panel-action"
                    onClick={(e) => { e.stopPropagation(); setAnimeModalOpen(true) }}
                >管理</span>
            </div>
            <div className="art-wallpaper-grid">
                {animeThemes.map(t => (
                    <div
                        key={t.id}
                        className={`art-wallpaper-item${animeThemeId === t.id ? ' is-active' : ''}`}
                        style={{ '--tile-color': t.primaryColor } as CSSProperties}
                        onClick={() => setAnimeTheme(t.id)}
                        title={t.description || t.name}
                    >
                        <div
                            className="art-wallpaper-thumb"
                            style={{
                                background: isSolidTheme(t)
                                    ? t.solidColor!
                                    : (t.thumbnail
                                        ? `url(${t.thumbnail}) center/cover no-repeat`
                                        : `linear-gradient(135deg, ${t.primaryColor}, ${t.accentColor})`),
                                border: isSolidTheme(t) && t.solidColor === '#ffffff' ? '1px solid #e0e0e0' : 'none',
                            }}
                        >
                            {!isSolidTheme(t) && !t.thumbnail && <PictureOutlined style={{ fontSize: 16, color: '#fff' }} />}
                        </div>
                        <span className="art-wallpaper-name">{t.name}</span>
                    </div>
                ))}
            </div>
        </div>
    )

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

    // 检测是否为 V2 详情页（MMUI 风格），如果是则隐藏系统侧边栏和顶栏
    const isV2Page = location.pathname.endsWith('/v2')

    // V2 页面：全屏模式
    if (isV2Page) {
        return (
            <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
                <Content style={{ overflow: 'auto', height: '100vh' }}>
                    <Outlet />
                </Content>
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

                        {/* 主题切换 */}
                        <Dropdown
                            placement="bottomRight"
                            overlayStyle={{ zIndex: 1050 }}
                            getPopupContainer={() => document.body}
                            popupRender={() => themePanelContent}
                        >
                            <Tooltip title="主题设置">
                                <Button
                                    type="text"
                                    className={`art-header-btn${
                                        (currentTheme === 'dark' || transparentMode || roundedMode || liquidMode) ? ' is-active' : ''
                                    }`}
                                    icon={<FormatPainterOutlined />}
                                />
                            </Tooltip>
                        </Dropdown>

                        {/* 语言切换 */}
                        <Dropdown
                            menu={{ items: languageMenuItems, onClick: ({key}) => changeLanguage(key) }}
                            placement="bottomRight"
                            overlayStyle={{ zIndex: 1050 }}
                            getPopupContainer={() => document.body}
                        >
                            <Tooltip title="切换语言">
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
                                className="art-header-btn"
                                icon={<QuestionCircleOutlined />}
                            />
                        </Tooltip>

                        {/* 通知 */}
                        <Tooltip title="消息中心">
                            <Badge count={notifications} size="small" offset={[-4, 4]}>
                                <Button
                                    type="text"
                                    className="art-header-btn"
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

            {/* 二次元主题管理弹窗 */}
            <Modal
                title="二次元主题管理"
                open={animeModalOpen}
                onCancel={() => { setAnimeModalOpen(false); setEditingTheme(null); themeForm.resetFields(); }}
                footer={null}
                width={640}
                styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
            >
                {/* 添加/编辑表单 */}
                <div className="art-theme-editor">
                    <div className="art-theme-editor-title">
                        {editingTheme ? '编辑主题' : '添加自定义主题'}
                    </div>
                    <Form
                        form={themeForm}
                        layout="vertical"
                        size="small"
                        onFinish={(values) => {
                            if (editingTheme) {
                                updateCustomAnimeTheme(editingTheme.id, values);
                                message.success('主题已更新');
                            } else {
                                addCustomAnimeTheme(values);
                                message.success('主题已添加');
                            }
                            refreshAnimeThemes();
                            themeForm.resetFields();
                            setEditingTheme(null);
                        }}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Form.Item name="name" label="主题名称" rules={[{ required: true, message: '请输入名称' }]}>
                                <Input placeholder="如：三月七" />
                            </Form.Item>
                            <Form.Item name="description" label="描述">
                                <Input placeholder="如：崩坏：星穹铁道" />
                            </Form.Item>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Form.Item name="pcBackground" label="PC端背景图URL" rules={[{ required: true, message: '请输入URL' }]}>
                                <Input placeholder="https://..." />
                            </Form.Item>
                            <Form.Item name="mobileBackground" label="手机端背景图URL" rules={[{ required: true, message: '请输入URL' }]}>
                                <Input placeholder="https://..." />
                            </Form.Item>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <Form.Item name="primaryColor" label="主色调" rules={[{ required: true }]}>
                                <Input type="color" style={{ height: 32, padding: 2 }} />
                            </Form.Item>
                            <Form.Item name="accentColor" label="强调色" rules={[{ required: true }]}>
                                <Input type="color" style={{ height: 32, padding: 2 }} />
                            </Form.Item>
                            <Form.Item name="thumbnail" label="缩略图URL">
                                <Input placeholder="可选" />
                            </Form.Item>
                        </div>
                        <Space>
                            <Button type="primary" htmlType="submit" icon={editingTheme ? <EditOutlined /> : <PlusOutlined />}>
                                {editingTheme ? '保存修改' : '添加主题'}
                            </Button>
                            {editingTheme && (
                                <Button onClick={() => { setEditingTheme(null); themeForm.resetFields(); }}>
                                    取消编辑
                                </Button>
                            )}
                        </Space>
                    </Form>
                </div>

                {/* 主题列表 */}
                <div className="art-theme-editor-title">
                    主题列表（{animeThemes.length}）
                </div>
                <div className="art-theme-collection">
                    {animeThemes.map(t => (
                        <div
                            key={t.id}
                            className={`art-theme-item${animeThemeId === t.id ? ' is-active' : ''}`}
                            style={{ '--tile-color': t.primaryColor } as CSSProperties}
                            onClick={() => setAnimeTheme(t.id)}
                        >
                            <div
                                className="art-theme-item-thumb"
                                style={{
                                    background: isSolidTheme(t)
                                        ? t.solidColor!
                                        : (t.thumbnail
                                            ? `url(${t.thumbnail}) center/cover no-repeat`
                                            : `linear-gradient(135deg, ${t.primaryColor}, ${t.accentColor})`),
                                }}
                            >
                                {!isSolidTheme(t) && !t.thumbnail && (
                                    <PictureOutlined style={{ fontSize: 22, color: '#fff' }} />
                                )}
                                {animeThemeId === t.id && (
                                    <span className="art-theme-item-check">
                                        <CheckOutlined style={{ fontSize: 10, color: '#fff' }} />
                                    </span>
                                )}
                            </div>
                            <div className="art-theme-item-body">
                                <div className="art-theme-item-name">{t.name}</div>
                                <div className="art-theme-item-desc">{t.description}</div>
                                {!t.builtin ? (
                                    <div className="art-theme-item-actions" onClick={e => e.stopPropagation()}>
                                        <Button
                                            size="small" type="text" icon={<EditOutlined />}
                                            onClick={() => {
                                                setEditingTheme(t);
                                                themeForm.setFieldsValue(t);
                                            }}
                                        />
                                        <Popconfirm
                                            title="确定删除此主题？"
                                            onConfirm={() => {
                                                if (animeThemeId === t.id) setAnimeTheme(null);
                                                deleteCustomAnimeTheme(t.id);
                                                refreshAnimeThemes();
                                                message.success('已删除');
                                            }}
                                        >
                                            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    </div>
                                ) : (
                                    <div className="art-theme-item-builtin">内置主题</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </Layout>
    )
}

export default MainLayout
