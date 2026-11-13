import {useEffect, useRef, useState} from 'react'
import {Alert, Button, Space, Tag} from 'antd'
import {ReloadOutlined} from '@ant-design/icons'
import {Terminal} from '@xterm/xterm'
import {FitAddon} from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {isAxiosError} from 'axios'
import {requestHostTerminal} from '@/utils/apis'

interface Props {
    hostName: string
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

export default function HostTerminalPanel({hostName}: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const termRef = useRef<Terminal | null>(null)
    const fitRef = useRef<FitAddon | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const [status, setStatus] = useState<TerminalStatus>('connecting')
    const [error, setError] = useState('')
    const [reconnectKey, setReconnectKey] = useState(0)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const term = new Terminal({
            fontSize: 13,
            fontFamily: 'Consolas, "Cascadia Mono", "Courier New", monospace',
            cursorBlink: true,
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
                const ticket = await requestHostTerminal(hostName)
                if (disposed) return
                const wsUrl = ticket.data?.ws_url
                if (!wsUrl) throw new Error('未获取到终端地址')

                const ws = new WebSocket(wsUrl)
                wsRef.current = ws
                ws.onopen = () => {
                    if (disposed) return
                    setStatus('connected')
                    term.focus()
                    // 首次连接同步一次终端尺寸
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
                    setError('终端连接失败，请确认主机 SSH 端口可达且终端服务（默认 7681）已放行')
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
    }, [hostName, reconnectKey])

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
                    终端通过 SSH 直连主机，关闭抽屉即断开
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
