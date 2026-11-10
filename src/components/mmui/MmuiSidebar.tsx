import React from 'react';
import { Tooltip } from 'antd';
import {
  AppstoreOutlined, DatabaseOutlined,
  HddOutlined, CameraOutlined, GlobalOutlined, SwapOutlined,
  ArrowLeftOutlined, MenuFoldOutlined, CloseOutlined,
  MenuUnfoldOutlined, ApiOutlined, AreaChartOutlined,
  UsbOutlined, UserOutlined, OrderedListOutlined, CloudServerOutlined,
  DesktopOutlined, InfoCircleOutlined, PoweroffOutlined, SafetyOutlined, HistoryOutlined
} from '@ant-design/icons';

export interface SidebarItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  group: string;
  badge?: string;
}

interface MmuiSidebarProps {
  activeKey: string;
  collapsed: boolean;
  mobileViewport?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onSelect: (key: string) => void;
  onCollapse: (collapsed: boolean) => void;
  onBack: () => void;
  items?: SidebarItem[];
}

/** 默认侧边栏导航项 */
export const defaultSidebarItems: SidebarItem[] = [
  { key: 'panel', icon: <AppstoreOutlined />, label: '实例概览', group: '概览' },
  { key: 'monitor', icon: <AreaChartOutlined />, label: '资源监控', group: '概览' },
  { key: 'system', icon: <InfoCircleOutlined />, label: '系统信息', group: '概览' },
  { key: 'network', icon: <GlobalOutlined />, label: '网络概览', group: '概览' },
  { key: 'nic', icon: <GlobalOutlined />, label: '网卡管理', group: '资源管理' },
  { key: 'disk', icon: <HddOutlined />, label: '数据磁盘', group: '资源管理' },
  { key: 'iso', icon: <CameraOutlined />, label: '光盘镜像', group: '资源管理' },
  { key: 'snapshot', icon: <HistoryOutlined />, label: '快照', group: '资源管理' },
  { key: 'backup', icon: <DatabaseOutlined />, label: '备份管理', group: '资源管理' },
  { key: 'boot', icon: <OrderedListOutlined />, label: '启动顺序', group: '资源管理' },
  { key: 'nat', icon: <SwapOutlined />, label: '端口映射', group: '网络服务' },
  { key: 'firewall', icon: <SafetyOutlined />, label: '防火墙', group: '网络服务' },
  { key: 'proxy', icon: <CloudServerOutlined />, label: '反向代理', group: '网络服务' },
  { key: 'pci', icon: <ApiOutlined />, label: 'PCI 设备', group: '硬件设备' },
  { key: 'usb', icon: <UsbOutlined />, label: 'USB 设备', group: '硬件设备' },
  { key: 'vnc', icon: <DesktopOutlined />, label: '远程控制', group: '系统操作' },
  { key: 'sysadmin', icon: <PoweroffOutlined />, label: '电源系统', group: '系统操作' },
  { key: 'permission', icon: <UserOutlined />, label: '用户权限', group: '访问控制' },
];

/** MMUI 风格侧边栏导航项 */
function SidebarNavItem({ icon, label, active, badge, collapsed, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; badge?: string;
  collapsed?: boolean; onClick?: () => void;
}) {
  const content = (
    <button
      type="button"
      onClick={onClick}
      className="mmui-sidebar-item"
      data-active={active || undefined}
      aria-current={active ? 'page' : undefined}
    >
      <span className="mmui-sidebar-item__icon" aria-hidden="true">{icon}</span>
      {!collapsed && (
        <>
          <span className="mmui-sidebar-item__label">{label}</span>
          {badge && <span className="mmui-sidebar-item__badge">{badge}</span>}
        </>
      )}
    </button>
  );

  if (collapsed) {
    return <Tooltip title={label} placement="right">{content}</Tooltip>;
  }
  return content;
}

/** MMUI 风格侧边栏组件 */
export default function MmuiSidebar({
  activeKey, collapsed, mobileViewport = false, mobileOpen = false, onMobileClose, onSelect, onCollapse, onBack, items
}: MmuiSidebarProps) {
  const navItems = items || defaultSidebarItems;
  const navGroups = navItems.reduce<Array<{ group: string; items: SidebarItem[] }>>((groups, item) => {
    const group = item.group || '导航'
    const current = groups[groups.length - 1]
    if (current?.group === group) current.items.push(item)
    else groups.push({ group, items: [item] })
    return groups
  }, [])

  return (
    <aside
      id="vm-detail-navigation"
      className="mmui-sidebar"
      data-collapsed={collapsed || undefined}
      data-mobile-open={mobileOpen || undefined}
      aria-label="虚拟机详情导航"
      aria-hidden={mobileViewport && !mobileOpen}
    >
      {/* 品牌区域 */}
      <div className="mmui-sidebar__brand">
        <CloudServerOutlined className="mmui-sidebar__brand-icon" />
        {!collapsed && <span className="mmui-sidebar__brand-title">云管理系统</span>}
        {mobileViewport && (
          <button type="button" className="mmui-sidebar__mobile-close" onClick={onMobileClose} aria-label="关闭导航菜单">
            <CloseOutlined />
          </button>
        )}
      </div>

      {/* 导航列表 */}
      <nav className="mmui-sidebar__nav" aria-label="虚拟机功能分组">
        {navGroups.map(group => (
          <section className="mmui-sidebar__group" key={group.group} aria-label={group.group}>
            {!collapsed && <h2 className="mmui-sidebar__group-title">{group.group}</h2>}
            <div className="mmui-sidebar__group-items">
              {group.items.map(item => (
                <SidebarNavItem
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  badge={item.badge}
                  active={activeKey === item.key}
                  collapsed={collapsed}
                  onClick={() => {
                    onSelect(item.key)
                    if (mobileViewport) onMobileClose?.()
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </nav>

      {/* 底部操作 */}
      <div className="mmui-sidebar__footer">
        <SidebarNavItem
          icon={<ArrowLeftOutlined />}
          label="返回"
          collapsed={collapsed}
          onClick={onBack}
        />
        <SidebarNavItem
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          label={collapsed ? '展开' : '收起'}
          collapsed={collapsed}
          onClick={() => onCollapse(!collapsed)}
        />
      </div>
    </aside>
  );
}
