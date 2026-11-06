/** 结构化数据展示：把接口返回的对象/数组/JSON 字符串摊平成可读的字段条目。 */

export interface StructuredEntry {
  label: string
  value: string
  mono?: boolean
}

const FIELD_LABELS: Record<string, string> = {
  vm_uuid: '虚拟机',
  vm_name: '虚拟机名称',
  uuid: 'UUID',
  hs_name: '主机',
  host_name: '主机',
  host: '主机',
  cpu_num: 'CPU 核心',
  mem_num: '内存 (MB)',
  hdd_num: '硬盘 (MB)',
  gpu_num: 'GPU 数量',
  gpu_mem: 'GPU 显存 (MB)',
  os_name: '操作系统',
  os_pass: '系统密码',
  vc_pass: 'VNC 密码',
  vc_port: 'VNC 端口',
  password: '密码',
  speed_u: '上行带宽',
  speed_d: '下行带宽',
  nat_num: '端口配额',
  web_num: '代理配额',
  flu_num: '流量配额',
  name: '名称',
  ipv4_address: 'IPv4 地址',
  ipv6_address: 'IPv6 地址',
  ip: 'IP 地址',
  mac_addr: 'MAC 地址',
  nic_name: '网卡名称',
  nic_type: '网卡类型',
  disk_size: '磁盘容量',
  disks: '磁盘',
  disk: '磁盘',
  network: '网络',
  config: '配置',
  settings: '设置',
  options: '选项',
  flags: '标志',
  backup_name: '备份名称',
  status: '状态',
  message: '消息',
  code: '状态码',
  result: '结果',
  data: '数据',
  items: '条目',
  total: '总数',
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 后端偶尔把 JSON 作为字符串返回，先尝试还原为结构。 */
export function tryParseJson(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed || !/^[[{]/.test(trimmed)) return text
  try {
    return JSON.parse(trimmed)
  } catch {
    return text
  }
}

export function formatStructuredScalar(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—'
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.length ? `${value.length} 项数据` : '—'
  if (isPlainObject(value)) return `${Object.keys(value).length} 项数据`
  return String(value)
}

/**
 * 把任意结构摊平成「字段 → 值」条目。
 * 嵌套对象/数组递归展开，最多保留 3 层路径，避免详情面板被无限层级撑开。
 */
export function collectStructuredEntries(value: unknown, path = '', depth = 0): StructuredEntry[] {
  const parsed = typeof value === 'string' ? tryParseJson(value) : value

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return [{ label: path || '数据', value: '—' }]
    const primitivesOnly = parsed.every(item => item === null || ['string', 'number', 'boolean'].includes(typeof item))
    if (primitivesOnly) {
      return [{ label: path || '数据', value: parsed.map(formatStructuredScalar).join('、') }]
    }
    return parsed.flatMap((item, index) =>
      collectStructuredEntries(item, path ? `${path} · 第 ${index + 1} 项` : `第 ${index + 1} 项`, depth + 1),
    )
  }

  if (isPlainObject(parsed)) {
    const entries = Object.entries(parsed)
    if (entries.length === 0) return [{ label: path || '数据', value: '—' }]
    return entries.flatMap(([key, child]) => {
      const label = FIELD_LABELS[key] || key
      const childPath = path ? `${path} · ${label}` : label
      const childValue = typeof child === 'string' ? tryParseJson(child) : child

      if (depth >= 3) {
        return [{ label: childPath, value: formatStructuredScalar(childValue) }]
      }
      if (isPlainObject(childValue) || Array.isArray(childValue)) {
        return collectStructuredEntries(childValue, childPath, depth + 1)
      }
      return [{
        label: childPath,
        value: formatStructuredScalar(childValue),
        mono: typeof childValue === 'number' || typeof childValue === 'boolean',
      }]
    })
  }

  return [{
    label: path || '数据',
    value: formatStructuredScalar(parsed),
    mono: typeof parsed === 'number' || typeof parsed === 'boolean',
  }]
}

export function hasStructuredPayload(value: unknown): boolean {
  const parsed = typeof value === 'string' ? tryParseJson(value) : value
  if (parsed === null || parsed === undefined) return false
  if (typeof parsed === 'string') return parsed.trim().length > 0
  if (Array.isArray(parsed)) return parsed.length > 0
  if (isPlainObject(parsed)) return Object.keys(parsed).length > 0
  return true
}
