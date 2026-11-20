import {useEffect, useRef, useState} from 'react'
import {Alert, Button, Space, Tag} from 'antd'
import {ReloadOutlined} from '@ant-design/icons'
import {Terminal} from '@xterm/xterm'
import {FitAddon} from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {isAxiosError} from 'axios'
import {requestVMConsole} from '@/utils/apis'

interface Props {
    hostName: string
    vmUuid: string
    /** 只读控制台（如 SmolVM 串口日志）不响应键盘输入 */
    readOnly?: boolean
}

type TerminalStatus = 'connecting' | 'connected' | 'closed' | 'error'

const STATUS_META: Record<TerminalStatus, { text: string; color: string }> = {
    connecting: {text: '连接中', color: 'processing'},
    connected: {text: '已连接', color: 'success'},
    closed: {text: '已断开', color: 'default'},
    error: {text: '连接失败', color: 'error'},
}

function errorMessage(error: unknown): string {
    if (isAxiosError(error)) return error.response?.data?.msg || error.message
    return error instanceof Error ? error.message : '连接失败'
}

/**
 * 容器类平台（Docker / LXD / SmolVM）的命令行控制台。
 *
 * 这些平台没有图形帧缓冲，后端签发的是「主机 SSH + docker exec/lxc exec」票据，
 * 前端用 xterm 渲染，等价于网页版 VNC 入口。
 */
export default function VMConsolePanel({hostName, vmUuid, readOnly = false}: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const termRef = useRef<Terminal | null>(null)
    const fitRef = useRef<FitAddon | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const [status, setStatus] = useState<TerminalStatus>('connecting')
    const [error, setError] = useState('')
    const [reconnectKey, setReconnectKey] = useState(0)
    const [serverReadOnly, setServerReadOnly] = useState(readOnly)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const term = new Terminal({
            fontSize: 13,
            fontFamily: 'Consolas, "Cascadia Mono", "Courier New", monospace',
            cursorBlink: !readOnly,
            disableStdin: readOnly,
            scrollback: 4000,
            theme: {
                background: '#1e1e1e',
                foreground: '#e6e6e6',
                cursor: '#e6e6e6',
                selectionBackground: '#264f78',
            },
        })
        const fit = new FitAddon()
        term.loadAddon(fit)
        term.open(container)
        try {
            fit.fit()
        } catch {
            // 容器尚未布局时忽略
        }
        termRef.current = term
        fitRef.current = fit

        const dataSub = term.onData(data => {
            const ws = wsRef.current
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(data)
            }
        })
        const resizeSub = term.onResize(({cols, rows}) => {
            const ws = wsRef.current
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({cols, rows}))
            }
        })

        const observer = new ResizeObserver(() => {
            try {
                fit.fit()
            } catch {
                // ignore
            }
        })
        observer.observe(container)

        let disposed = false
        const connect = async () => {
            setStatus('connecting')
            setError('')
            try {
                const ticket = await requestVMConsole(hostName, vmUuid)
                if (disposed) return
                const wsUrl = ticket.data?.ws_url
                if (!wsUrl) throw new Error('未获取到控制台地址')
                // 后端可能降级为只读（如 SmolVM 拿不到 guest IP）
                const ro = ticket.data?.read_only ?? readOnly
                setServerReadOnly(ro)
                term.options.disableStdin = ro

                const ws = new WebSocket(wsUrl)
                wsRef.current = ws
                ws.onopen = () => {
                    if (disposed) return
                    setStatus('connected')
                    term.focus()
                    ws.send(JSON.stringify({cols: term.cols, rows: term.rows}))
                }
                ws.onmessage = event => {
                    if (typeof event.data === 'string') {
                        term.write(event.data)
                    }
                }
                ws.onclose = () => {
                    if (disposed) return
                    setStatus('closed')
                }
                ws.onerror = () => {
                    if (disposed) return
                    setStatus('error')
                    setError('控制台连接失败，请确认主机 SSH 可达且终端服务（默认 7681）端口已放行')
                }
            } catch (err) {
                if (disposed) return
                setStatus('error')
                setError(errorMessage(err))
            }
        }
        void connect()

        return () => {
            disposed = true
            observer.disconnect()
            dataSub.dispose()
            resizeSub.dispose()
            wsRef.current?.close()
            wsRef.current = null
            term.dispose()
            termRef.current = null
            fitRef.current = null
        }
    }, [hostName, vmUuid, reconnectKey, readOnly])

    const reconnect = () => {
        wsRef.current?.close()
        wsRef.current = null
        termRef.current?.reset()
        setReconnectKey(value => value + 1)
    }

    const meta = STATUS_META[status]

    return (
        <div className="art-stack">
            <Space wrap>
                <Tag color={meta.color} style={{margin: 0}}>{meta.text}</Tag>
                <Button icon={<ReloadOutlined />} onClick={reconnect} size="small">
                    重新连接
                </Button>
                <span className="art-table-muted" style={{fontSize: 12}}>
                    {serverReadOnly
                        ? '该平台仅提供只读串口日志；交互请使用 SSH'
                        : '控制台经主机 SSH 进入容器，关闭窗口即断开'}
                </span>
            </Space>
            {error && <Alert type="error" showIcon message={error} />}
            <div
                ref={containerRef}
                style={{
                    height: 460,
                    padding: 8,
                    borderRadius: 6,
                    background: '#1e1e1e',
                    overflow: 'hidden',
                }}
            />
        </div>
    )
}
