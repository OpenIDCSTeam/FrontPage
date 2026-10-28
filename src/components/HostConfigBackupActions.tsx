import {useRef, useState} from 'react'
import {Alert, Button, Checkbox, Modal, Select, Space, Table, Tag, Upload, message} from 'antd'
import {DownloadOutlined, InboxOutlined, UploadOutlined} from '@ant-design/icons'
import {isAxiosError} from 'axios'
import {exportHostConfigs, restoreHostConfigs} from '@/utils/apis'
import type {HostConfigBackup, HostConfigRestoreItem} from '@/utils/apis'

const MAX_FILE_SIZE = 10 * 1024 * 1024

function errorMessage(error: unknown): string {
    if (isAxiosError(error)) return error.response?.data?.msg || error.message
    return error instanceof Error ? error.message : '操作失败，请重试'
}

interface Props {
    hostNames: string[]
    onRestored: () => Promise<void>
}

export default function HostConfigBackupActions({hostNames, onRestored}: Props) {
    const [mode, setMode] = useState<'export' | 'restore' | null>(null)
    const [exportHost, setExportHost] = useState('')
    const [backup, setBackup] = useState<HostConfigBackup | null>(null)
    const [preview, setPreview] = useState<HostConfigRestoreItem[]>([])
    const [fileName, setFileName] = useState('')
    const [confirmed, setConfirmed] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const inFlight = useRef(false)
    const conflicts = preview.filter(item => item.action === 'overwrite').length

    const open = (nextMode: 'export' | 'restore') => {
        setMode(nextMode)
        setExportHost('')
        setBackup(null)
        setPreview([])
        setFileName('')
        setConfirmed(false)
        setError('')
    }

    const close = () => {
        if (inFlight.current) return
        setMode(null)
        setBackup(null)
        setPreview([])
        setFileName('')
        setConfirmed(false)
        setError('')
    }

    const download = async () => {
        if (inFlight.current) return
        inFlight.current = true
        setBusy(true)
        setError('')
        try {
            const result = await exportHostConfigs(exportHost || undefined)
            if (!result.data) throw new Error('未收到主机配置')
            const content = JSON.stringify(result.data, null, 2)
            const blob = new Blob([content], {type: 'application/json;charset=utf-8'})
            if (blob.size > MAX_FILE_SIZE) throw new Error('配置文件超过 10 MB，请按单台主机导出')
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `host-config-${exportHost ? exportHost.replace(/[^\p{L}\p{N}_.-]/gu, '_') : 'all'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.setTimeout(() => URL.revokeObjectURL(url), 1000)
            setMode(null)
            message.success('主机配置已导出，请妥善保管文件')
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            inFlight.current = false
            setBusy(false)
        }
    }

    const readBackup = async (file: File) => {
        if (inFlight.current) return false
        inFlight.current = true
        setBusy(true)
        setError('')
        setBackup(null)
        setPreview([])
        setFileName(file.name)
        setConfirmed(false)
        try {
            if (file.size > MAX_FILE_SIZE) throw new Error('配置文件不能超过 10 MB')
            let parsed: HostConfigBackup
            try {
                parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, ''))
            } catch {
                throw new Error('文件不是有效的 JSON 配置文件')
            }
            if (!parsed || parsed.format !== 'openidcs-host-config' || parsed.version !== 1 || !Array.isArray(parsed.hosts) || parsed.hosts.length === 0) {
                throw new Error('请选择本平台导出的主机配置文件（版本 1）')
            }
            const result = await restoreHostConfigs(parsed, false, true)
            if (!result.data?.hosts?.length) throw new Error('配置文件中没有可还原的主机')
            setBackup(parsed)
            setPreview(result.data.hosts)
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            inFlight.current = false
            setBusy(false)
        }
        return false
    }

    const restore = async () => {
        if (!backup || inFlight.current || (conflicts > 0 && !confirmed)) return
        inFlight.current = true
        setBusy(true)
        setError('')
        try {
            const result = await restoreHostConfigs(backup, conflicts > 0, false)
            if (!result.data) throw new Error('未收到还原结果')
            setMode(null)
            setBackup(null)
            setPreview([])
            setFileName('')
            setConfirmed(false)
            message.success(`已还原 ${result.data.hosts.length} 台主机配置`)
            await onRestored()
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            inFlight.current = false
            setBusy(false)
        }
    }

    return (
        <>
            <Button icon={<DownloadOutlined />} disabled={hostNames.length === 0} onClick={() => open('export')}>
                导出配置
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => open('restore')}>
                还原配置
            </Button>
            <Modal
                title={mode === 'export' ? '导出主机配置' : '还原主机配置'}
                open={mode !== null}
                onCancel={close}
                maskClosable={!busy}
                closable={!busy}
                keyboard={!busy}
                width={mode === 'export' ? 520 : 760}
                footer={[
                    <Button key="cancel" disabled={busy} onClick={close}>取消</Button>,
                    <Button
                        key="submit"
                        type="primary"
                        danger={mode === 'restore' && conflicts > 0}
                        loading={busy}
                        disabled={mode === 'restore' ? !backup || (conflicts > 0 && !confirmed) : hostNames.length === 0}
                        onClick={mode === 'export' ? download : restore}
                    >
                        {mode === 'export' ? '导出 JSON 文件' : conflicts > 0 ? '确认覆盖并还原' : '确认还原'}
                    </Button>,
                ]}
            >
                <Space direction="vertical" size="middle" className="w-full">
                    <Alert
                        type="warning"
                        showIcon
                        message={mode === 'export' ? '导出文件包含主机密码及扩展参数中的连接凭据' : '仅还原主机配置，不还原虚拟机、磁盘、任务或日志'}
                        description={mode === 'export' ? '用于完整还原的 JSON 文件未加密，请存放在安全位置，不要公开分享。包含全部镜像映射、网络、套餐、价格及启用状态。' : '同名且同类型的主机将完整覆盖配置（包括密码和空列表），其他主机保持不变。还原后按文件中的启用状态刷新主机连接，现有虚拟机记录保留。'}
                    />
                    {mode === 'export' ? (
                        <div>
                            <label className="block mb-2" htmlFor="host-config-export-scope">导出范围</label>
                            <Select
                                id="host-config-export-scope"
                                className="w-full"
                                value={exportHost}
                                onChange={setExportHost}
                                disabled={busy}
                                showSearch
                                optionFilterProp="label"
                                options={[
                                    {value: '', label: `全部主机（${hostNames.length} 台）`},
                                    ...hostNames.map(name => ({value: name, label: name})),
                                ]}
                            />
                        </div>
                    ) : (
                        <>
                            <Upload.Dragger
                                accept=".json,application/json"
                                multiple={false}
                                showUploadList={false}
                                disabled={busy}
                                beforeUpload={readBackup}
                            >
                                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                <p className="ant-upload-text">{fileName || '点击或拖入主机配置 JSON 文件'}</p>
                                <p className="ant-upload-hint">最大 10 MB · 上传后先校验和预览，不会立即还原</p>
                            </Upload.Dragger>
                            {preview.length > 0 && (
                                <>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Tag color="success">新增 {preview.length - conflicts} 台</Tag>
                                        <Tag color={conflicts > 0 ? 'warning' : 'default'}>覆盖 {conflicts} 台</Tag>
                                        <span className="art-muted">共 {preview.length} 台主机</span>
                                    </div>
                                    <Table<HostConfigRestoreItem>
                                        rowKey="name"
                                        size="small"
                                        dataSource={preview}
                                        pagination={preview.length > 5 ? {pageSize: 5, showSizeChanger: false} : false}
                                        scroll={{x: 580}}
                                        columns={[
                                            {title: '主机', dataIndex: 'name', ellipsis: true},
                                            {title: '引擎', dataIndex: 'type', ellipsis: true},
                                            {title: '连接地址', dataIndex: 'addr', ellipsis: true},
                                            {title: '启用状态', dataIndex: 'enable_host', width: 90, render: (enabled: boolean) => enabled ? '启用' : '禁用'},
                                            {title: '操作', dataIndex: 'action', width: 80, render: (action: string) => <Tag color={action === 'overwrite' ? 'warning' : 'success'}>{action === 'overwrite' ? '覆盖' : '新增'}</Tag>},
                                        ]}
                                    />
                                    {conflicts > 0 && (
                                        <Checkbox checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)}>
                                            我确认覆盖以上 {conflicts} 台同名主机，建议已导出当前配置作为备份
                                        </Checkbox>
                                    )}
                                </>
                            )}
                        </>
                    )}
                    {error && <Alert type="error" showIcon message={error} />}
                </Space>
            </Modal>
        </>
    )
}
