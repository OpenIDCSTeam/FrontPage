import { Breadcrumb, Button, Segmented } from 'antd'
import { HomeOutlined, AppstoreOutlined, MenuOutlined, MenuUnfoldOutlined } from '@ant-design/icons'

export type VmDetailLayoutMode = 'horizontal' | 'vertical'

interface VmDetailTopBarProps {
  uuid: string
  layout: VmDetailLayoutMode
  onChange: (layout: VmDetailLayoutMode) => void
  onMenu?: () => void
  showMenu?: boolean
  showLayoutSwitch?: boolean
}

/** 横版/竖版共用的面包屑与布局切换顶栏 */
export default function VmDetailTopBar({ uuid, layout, onChange, onMenu, showMenu = false, showLayoutSwitch = true }: VmDetailTopBarProps) {
  return (
    <div className="vm-detail-topbar">
      <Breadcrumb
        separator="/"
        items={[
          { title: <HomeOutlined /> },
          { title: 'VPS' },
          { title: uuid },
        ]}
      />
      <div className="vm-detail-topbar-actions">
        {showMenu && onMenu && (
          <Button
            className="vm-detail-topbar-menu"
            size="small"
            icon={<MenuUnfoldOutlined />}
            onClick={onMenu}
            aria-label="打开实例导航"
          />
        )}
        {showLayoutSwitch && (
          <Segmented<VmDetailLayoutMode>
            size="small"
            aria-label="虚拟机详情布局"
            value={layout}
            onChange={onChange}
            options={[
              { value: 'horizontal', label: <span><AppstoreOutlined /> 默认布局</span> },
              { value: 'vertical', label: <span><MenuOutlined /> 竖版菜单</span> },
            ]}
          />
        )}
      </div>
    </div>
  )
}
