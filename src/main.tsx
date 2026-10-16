import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App'
// 字体资源与字体预设（提供 --font-family / --font-mono 变量）
import './styles/fonts.css'
// Tailwind 指令 + 极简基座
import './index.css'
// 设计系统本体（无 @layer 包裹，权重高于 index.css，负责最终收口）
import './styles/art-design.css'
// 导入国际化模块（会自动挂载到 window 对象）
import { initI18n } from './utils/i18n'
// 导入主题管理
import { ThemeProvider } from './contexts/ThemeContext'
// 字体后台预载（首屏用系统混排，空闲时再拉 Maple Mono）
import { prefetchCustomFonts } from './config/fonts.config'

// 设置dayjs为中文
dayjs.locale('zh-cn')

// 初始化国际化系统
initI18n().then(() => {
  console.log('i18n 初始化完成')
}).catch(err => {
  console.error('i18n 初始化失败:', err)
})

// 后台预载自定义字体（不阻塞首屏）
prefetchCustomFonts()

// 渲染React应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 主题管理 */}
    <ThemeProvider>
      <AntdApp>
        <App />
      </AntdApp>
    </ThemeProvider>
  </React.StrictMode>,
)
