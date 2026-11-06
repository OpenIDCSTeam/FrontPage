import { useMemo } from 'react'
import { Button, Dropdown, Segmented, Select, Switch, Tooltip } from 'antd'
import { BgColorsOutlined, CheckOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import type { CSSProperties } from 'react'
import type { ThemeMode } from '@/config/theme.config'
import { THEME_PRESET_OPTIONS } from '@/config/theme.config'
import { FONT_OPTIONS } from '@/config/fonts.config'
import { useTheme } from '@/contexts/ThemeContext'

export default function AppearanceMenu() {
    const {
        theme,
        setTheme,
        themePreset,
        setThemePreset,
        transparentMode,
        toggleTransparentMode,
        roundedMode,
        toggleRoundedMode,
        fontId,
        setFontId,
    } = useTheme()

    const panel = useMemo(() => (
        <section className="appearance-panel" aria-label="外观设置">
            <header className="appearance-panel-heading">
                <div>
                    <h2>外观设置</h2>
                    <p>选择工作台风格，偏好自动保存</p>
                </div>
                <span className="appearance-panel-heading-mark"><BgColorsOutlined /></span>
            </header>

            <div className="appearance-panel-section">
                <div className="appearance-panel-label">界面主题</div>
                <div className="appearance-preset-list" role="radiogroup" aria-label="界面主题">
                    {THEME_PRESET_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            type="button"
                            className={`appearance-preset${themePreset === option.id ? ' is-selected' : ''}`}
                            role="radio"
                            aria-checked={themePreset === option.id}
                            onClick={() => setThemePreset(option.id)}
                        >
                            <span
                                className="appearance-preset-preview"
                                aria-hidden="true"
                                style={{
                                    '--preview-bg': option.preview[0],
                                    '--preview-surface': option.preview[1],
                                    '--preview-accent': option.preview[2],
                                } as CSSProperties}
                            >
                                <span className="appearance-preset-preview-sidebar" />
                                <span className="appearance-preset-preview-content">
                                    <span />
                                    <i />
                                    <i />
                                </span>
                            </span>
                            <span className="appearance-preset-copy">
                                <strong>{option.name}</strong>
                                <small>{option.description}</small>
                            </span>
                            <span className="appearance-preset-check" aria-hidden="true">
                                {themePreset === option.id ? <CheckOutlined /> : null}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="appearance-panel-row">
                <div className="appearance-panel-label">明暗模式</div>
                <Segmented<ThemeMode>
                    size="small"
                    value={theme}
                    onChange={setTheme}
                    options={[
                        { value: 'light', label: <span><SunOutlined />浅色</span> },
                        { value: 'dark', label: <span><MoonOutlined />深色</span> },
                    ]}
                />
            </div>

            <div className="appearance-panel-row">
                <div className="appearance-setting-copy">
                    <strong>透明表面</strong>
                    <small>柔和背景透过面板</small>
                </div>
                <Switch size="small" checked={transparentMode} onChange={toggleTransparentMode} aria-label="透明表面" />
            </div>

            <div className="appearance-panel-row">
                <div className="appearance-setting-copy">
                    <strong>圆润边角</strong>
                    <small>适度放大卡片与控件圆角</small>
                </div>
                <Switch size="small" checked={roundedMode} onChange={toggleRoundedMode} aria-label="圆润边角" />
            </div>

            <div className="appearance-panel-row appearance-font-row">
                <div className="appearance-setting-copy">
                    <strong>界面字体</strong>
                    <small>数字与正文可分别优化阅读</small>
                </div>
                <Select
                    size="small"
                    aria-label="界面字体"
                    value={fontId}
                    onChange={setFontId}
                    options={FONT_OPTIONS.map(option => ({ value: option.id, label: option.name }))}
                />
            </div>
        </section>
    ), [theme, setTheme, themePreset, setThemePreset, transparentMode, toggleTransparentMode, roundedMode, toggleRoundedMode, fontId, setFontId])

    const isCustomized = themePreset !== 'minimal' || theme === 'dark' || transparentMode || roundedMode

    return (
        <Dropdown
            trigger={['click']}
            placement="bottomRight"
            overlayStyle={{ zIndex: 1050 }}
            getPopupContainer={() => document.body}
            popupRender={() => panel}
        >
            <Tooltip title="外观设置">
                <Button
                    type="text"
                    className={`art-header-btn${isCustomized ? ' is-active' : ''}`}
                    icon={<BgColorsOutlined />}
                    aria-label="打开外观设置"
                />
            </Tooltip>
        </Dropdown>
    )
}
