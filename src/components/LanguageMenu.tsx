import { useEffect, useState } from 'react'
import { Button, Dropdown, Tooltip } from 'antd'
import { CheckOutlined, TranslationOutlined } from '@ant-design/icons'
import {
    changeLanguage,
    getAvailableLanguages,
    getCurrentLanguage,
    type Language,
} from '@/utils/i18n.ts'

interface LanguageMenuProps {
    /** 触发按钮的样式类：控制台用 art-header-btn，认证页用 art-auth-tool-btn */
    triggerClassName?: string
    tooltipTitle?: string
}

interface LanguagePanelProps {
    languages: Language[]
    current: string
    onSelect: (code: string) => void
}

/** 语言面板本体：标题 + 两列语言卡 */
export function LanguagePanel({ languages, current, onSelect }: LanguagePanelProps) {
    return (
        <section className="language-panel" aria-label="语言">
            <div className="language-panel-heading">语言</div>
            <div className="language-panel-grid" role="listbox" aria-label="语言">
                {languages.map(lang => {
                    const selected = lang.code === current
                    return (
                        <button
                            key={lang.code}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`language-option${selected ? ' is-selected' : ''}`}
                            onClick={() => onSelect(lang.code)}
                        >
                            <span className="language-option-name">{lang.native}</span>
                            <span className="language-option-desc">{lang.english}</span>
                            {selected && <CheckOutlined className="language-option-check" />}
                        </button>
                    )
                })}
            </div>
        </section>
    )
}

/**
 * 语言选择入口
 * ------------------------------------------------------------------
 * 与「外观设置」保持同一套弹层样式，控制台与认证页共用。
 */
export default function LanguageMenu({ triggerClassName = 'art-header-btn', tooltipTitle = '切换语言' }: LanguageMenuProps) {
    const [open, setOpen] = useState(false)
    const [languages, setLanguages] = useState<Language[]>(() => getAvailableLanguages())
    const [current, setCurrent] = useState(() => getCurrentLanguage())

    useEffect(() => {
        const sync = () => setCurrent(getCurrentLanguage())
        const handleLanguagesLoaded = (event: Event) => {
            const detail = (event as CustomEvent<{ languages?: Language[] }>).detail
            setLanguages(detail?.languages?.length ? detail.languages : getAvailableLanguages())
            sync()
        }
        window.addEventListener('languageChanged', sync)
        window.addEventListener('languagesLoaded', handleLanguagesLoaded)
        return () => {
            window.removeEventListener('languageChanged', sync)
            window.removeEventListener('languagesLoaded', handleLanguagesLoaded)
        }
    }, [])

    const selectLanguage = async (code: string) => {
        await changeLanguage(code)
        setCurrent(getCurrentLanguage())
        setOpen(false)
    }

    const currentName = languages.find(item => item.code === current)?.native || current

    const panel = (
        <LanguagePanel languages={languages} current={current} onSelect={selectLanguage} />
    )

    return (
        <Dropdown
            trigger={['click']}
            placement="bottomRight"
            overlayStyle={{ zIndex: 2050 }}
            getPopupContainer={() => document.body}
            open={open}
            onOpenChange={setOpen}
            popupRender={() => panel}
        >
            <Tooltip title={`${tooltipTitle} · ${currentName}`}>
                <Button
                    type="text"
                    className={`${triggerClassName}${open ? ' is-active' : ''}`}
                    icon={<TranslationOutlined />}
                    aria-label="切换语言"
                />
            </Tooltip>
        </Dropdown>
    )
}
