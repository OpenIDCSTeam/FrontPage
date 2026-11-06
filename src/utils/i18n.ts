/**
 * OpenIDCS 前端国际化
 *
 * 翻译数据来自项目自带的 .po 文件，构建期按语言拆分 chunk 动态加载，
 * 不再依赖 /api/i18n 接口，离线/静态部署下也能切换语言。
 *
 * 采用非侵入式 DOM 翻译：页面仍以简体中文书写，切换语言时按词条替换
 * 文本节点、placeholder、title、aria-label，因此历史页面无需逐个改造。
 */

export interface Language {
  code: string
  native: string
  english: string
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'zh-cn', native: '简体中文', english: 'Simplified Chinese' },
  { code: 'zh-tw', native: '繁體中文', english: 'Traditional Chinese' },
  { code: 'en-us', native: 'English', english: 'English' },
  { code: 'ja-jp', native: '日本語', english: 'Japanese' },
  { code: 'ko-kr', native: '한국어', english: 'Korean' },
  { code: 'fr-fr', native: 'Français', english: 'French' },
  { code: 'de-de', native: 'Deutsch', english: 'German' },
  { code: 'it-it', native: 'Italiano', english: 'Italian' },
  { code: 'pt-br', native: 'Português', english: 'Portuguese' },
  { code: 'es-es', native: 'Español', english: 'Spanish' },
  { code: 'ru-ru', native: 'Русский', english: 'Russian' },
]

type LanguageLoader = () => Promise<string>

const LANGUAGE_LOADERS: Record<string, LanguageLoader> = {
  'zh-cn': async () => (await import('../i18n/locales/zh-cn.po?raw')).default,
  'zh-tw': async () => (await import('../i18n/locales/zh-tw.po?raw')).default,
  'en-us': async () => (await import('../i18n/locales/en-us.po?raw')).default,
  'ja-jp': async () => (await import('../i18n/locales/ja-jp.po?raw')).default,
  'ko-kr': async () => (await import('../i18n/locales/ko-kr.po?raw')).default,
  'fr-fr': async () => (await import('../i18n/locales/fr-fr.po?raw')).default,
  'de-de': async () => (await import('../i18n/locales/de-de.po?raw')).default,
  'it-it': async () => (await import('../i18n/locales/it-it.po?raw')).default,
  'pt-br': async () => (await import('../i18n/locales/pt-br.po?raw')).default,
  'es-es': async () => (await import('../i18n/locales/es-es.po?raw')).default,
  'ru-ru': async () => (await import('../i18n/locales/ru-ru.po?raw')).default,
}

/**
 * 词条文件是词级翻译，少量高频 UI 词在这里覆盖成更自然的界面用语。
 * 只覆盖英文，其余语言沿用项目既有 .po 译文。
 */
const ENGLISH_OVERRIDES: Record<string, string> = {
  '用户空间': 'Workspace',
  '系统空间': 'Administration',
  '资源概览': 'Overview',
  '系统概览': 'System overview',
  '实例管理': 'Instances',
  '主机管理': 'Hosts',
  '反向代理': 'Reverse proxy',
  '端口转发': 'Port forwarding',
  '用户管理': 'Users',
  '任务管理': 'Tasks',
  '日志查看': 'Logs',
  '系统设置': 'Settings',
  '个人资料': 'Profile',
  '操作': 'Actions',
  '设置': 'Settings',
  '刷新': 'Refresh',
  '保存': 'Save',
  '删除': 'Delete',
  '编辑': 'Edit',
  '创建': 'Create',
  '搜索': 'Search',
  '主机': 'Host',
  '虚拟机': 'Virtual machine',
  '所有者': 'Owner',
  '状态': 'Status',
  '类型': 'Type',
  '端口': 'Port',
  '详情': 'Details',
  '返回': 'Back',
  '关闭': 'Close',
  '启用': 'Enable',
  '禁用': 'Disable',
  '全部': 'All',
  '暂无数据': 'No data',
  '加载中': 'Loading',
  '确定': 'Confirm',
  '取消': 'Cancel',
  '保存设置': 'Save settings',
  '刷新数据': 'Refresh',
  '自动刷新': 'Auto refresh',
  '停止刷新': 'Stop refresh',
  '平台系统设置': 'Platform settings',
  '安全管理凭据、邮件、注册策略与运行参数': 'Manage credentials, email, registration, and runtime settings',
  '访问与安全': 'Access & security',
  'Token、验证码与登录保护': 'Token, verification, and sign-in protection',
  '注册与权限': 'Registration & permissions',
  '注册开关、默认权限与配额': 'Registration, default permissions, and quotas',
  '同步与接口': 'Sync & API',
  '自动同步、远程地址与 API': 'Sync schedule, remote endpoint, and API',
  '邮件服务': 'Email',
  'Resend 发信与测试': 'Resend delivery and testing',
  '配置存档': 'Configuration archive',
  '保存或重新加载配置': 'Save or reload configuration',
  '系统信息': 'System information',
  '版本与资源规模': 'Version and resource scale',
  '访问Token与验证码': 'Access token & verification',
  '访问 Token 与验证码': 'Access token & verification',
  '管理 API 访问凭据，并配置登录与注册使用的人机验证。': 'Manage API credentials and human verification for sign-in and registration.',
  '自动同步与API接口': 'Auto sync & API',
  '自动同步与 API 接口': 'Auto sync & API',
  '配置定时同步、远程地址，并查看平台提供的接口能力。': 'Configure scheduled sync, remote endpoints, and available API capabilities.',
  '把当前平台配置保存到文件，或从已有文件重新加载。': 'Save the current platform configuration to a file, or reload it from an existing file.',
  '查看平台版本与当前纳管的资源规模。': 'View platform version and managed resource scale.',
  '注册策略与默认配额': 'Registration policy & default quotas',
  '控制开放注册、邮箱验证、用户默认权限与新账号资源上限。': 'Control open registration, email verification, default permissions, and new-account quotas.',
  '邮件通知服务': 'Email notifications',
  '配置 Resend 发信服务，并发送测试邮件验证连通性。': 'Configure Resend delivery and send a test email to verify connectivity.',
  '当前Token': 'Current token',
  '安全提示': 'Security notice',
  '修改Token后，所有使用旧Token的API调用都将失效。请确保更新所有相关配置。': 'After changing the token, all API calls using the old token will fail. Update every dependent configuration.',
  'Turnstile 验证码': 'Turnstile verification',
  '开启验证码': 'Enable verification',
  '启用后登录、注册、找回密码都需要验证Turnstile': 'Require Turnstile for sign-in, registration, and password recovery.',
  'Turnstile 站点密钥': 'Turnstile site key',
  'Turnstile 密钥': 'Turnstile secret key',
  '保存验证码设置': 'Save verification settings',
  '自动同步设置': 'Auto sync settings',
  '自动同步': 'Auto sync',
  '开启后将按照设定的模式自动同步虚拟机信息': 'Automatically sync virtual machine information using the configured mode.',
  '同步选项': 'Sync mode',
  '仅拉取': 'Pull only',
  '仅推送': 'Push only',
  '拉取+推送': 'Pull + push',
  '同步地址': 'Sync URL',
  '同步Token': 'Sync token',
  '保存同步设置': 'Save sync settings',
  '保存配置': 'Save configuration',
  '将当前配置保存文件': 'Save the current configuration to a file',
  '重新加载': 'Reload',
  '从文件重新加载配置': 'Reload configuration from a file',
  '系统名称': 'System name',
  '版本': 'Version',
  '主机数量': 'Hosts',
  '虚拟机数量': 'Virtual machines',
  '开放注册': 'Allow registration',
  '允许新用户注册账号': 'Allow new users to register accounts',
  '邮箱验证': 'Email verification',
  '注册时需要验证邮箱': 'Require email verification during registration',
  '默认可访问主机': 'Default allowed hosts',
  '用户默认权限': 'Default user permissions',
  '允许自由配置': 'Allow custom configuration',
  '用户可自行调整虚拟机配置': 'Users can adjust virtual machine settings',
  '新用户默认资源配额': 'Default resource quotas for new users',
  'CPU核心(个)': 'CPU cores',
  'RAM内存(GB)': 'Memory (GB)',
  '系统磁盘(GB)': 'System disk (GB)',
  '数据磁盘(GB)': 'Data disk (GB)',
  'GPU显存(GB)': 'GPU memory (GB)',
  'NAT端口(个)': 'NAT ports',
  '内网IP(个)': 'Private IPs',
  'WEB代理(个)': 'Web proxies',
  '公网IP(个)': 'Public IPs',
  '上行带宽(Mbps)': 'Upload bandwidth (Mbps)',
  '下行带宽(Mbps)': 'Download bandwidth (Mbps)',
  '月流量(GB)': 'Monthly traffic (GB)',
  '外网URL': 'Public URL',
  '发件邮箱': 'From address',
  '发送域名': 'Sending domain',
  '测试邮件发送': 'Send test email',
  '收件邮箱': 'Recipient',
  '邮件标题': 'Subject',
  '邮件正文': 'Body',
  '发送测试邮件': 'Send test email',
  '任务列表': 'Task list',
  '任务详情': 'Task details',
  '任务 ID': 'Task ID',
  '操作人': 'Operator',
  '创建时间': 'Created',
  '开始时间': 'Started',
  '完成时间': 'Finished',
  '执行参数': 'Parameters',
  '执行结果': 'Result',
  '任务类型': 'Task type',
  '未选择任务': 'No task selected',
  '暂无任务记录': 'No tasks',
  '全部主机': 'All hosts',
  '全部状态': 'All statuses',
  '全部类型': 'All types',
  '查看与管理异步任务的执行情况': 'Review and manage asynchronous task execution',
  '管理控制台': 'Console',
  '搜索功能...': 'Search…',
  '配置分区': 'Sections',
  '平台设置': 'Platform',
  '实例': 'Instances',
  '等待中': 'Waiting',
  '执行中': 'Running',
  '已完成': 'Completed',
  '已失败': 'Failed',
  '已停止': 'Stopped',
  '结束': 'Stop',
  '重试': 'Retry',
  '开机': 'Power on',
  '关机': 'Power off',
  '重启': 'Restart',
  '强制关机': 'Force stop',
  '强制重启': 'Force restart',
  '暂停': 'Pause',
  '恢复': 'Resume',
  '创建虚拟机': 'Create VM',
  '删除虚拟机': 'Delete VM',
  '重装系统': 'Reinstall OS',
  '备份': 'Backup',
  '请输入Cloudflare Turnstile Site Key': 'Enter your Cloudflare Turnstile site key',
  '请输入Cloudflare Turnstile Secret Key': 'Enter your Cloudflare Turnstile secret key',
  '权限位说明（当前掩码包含的权限）：': 'Permission bits included in the current mask:',
  '物理主机管理': 'Hosts',
  '查看主机运行状态、资源用量及纳管配置': 'Review host runtime, resource usage, and onboarding configuration',
  '所有虚拟机': 'Instances',
  '管理与监控虚拟机实例的运行状态、资源占用与网络配置': 'Manage and monitor instance runtime, resource usage, and networking',
  '反向代理管理': 'Reverse proxy',
  '管理所有虚拟机的Web反向代理配置': 'Manage web reverse-proxy configuration for all instances',
  '管理您的Web反向代理配置': 'Manage your web reverse-proxy configuration',
  '端口转发管理': 'Port forwarding',
  '管理所有NAT端口转发规则': 'Manage all NAT port-forwarding rules',
  '管理您的NAT端口转发规则': 'Manage your NAT port-forwarding rules',
  '平台用户管理': 'Users',
  '管理系统用户、权限与资源配额': 'Manage users, permissions, and resource quotas',
  '系统日志': 'Logs',
  '查看主机运行日志与操作记录': 'Review host runtime logs and operation records',
  '主机名称': 'Host name',
  '引擎': 'Engine',
  '连接地址': 'Connection',
  '公网地址': 'Public address',
  '显卡': 'GPU',
  '网络': 'Network',
  '区域': 'Region',
  '系统': 'OS',
  '流量': 'Traffic',
  '网卡/IP': 'NIC / IP',
  '反代': 'Proxy',
  '有效期': 'Expires',
  '域名': 'Domain',
  '协议': 'Protocol',
  '后端地址': 'Backend',
  '描述': 'Description',
  '用户': 'User',
  '角色': 'Role',
  '配额概览': 'Quota overview',
  '外网IP': 'Public IP',
  '外网端口': 'Public port',
  '内网IP': 'Private IP',
  '内网端口': 'Private port',
  '备注': 'Notes',
  '时间': 'Time',
  '级别': 'Level',
  '消息内容': 'Message',
  '操作结果': 'Result',
  '添加主机': 'Add host',
  '添加反向代理': 'Add proxy',
  '添加规则': 'Add rule',
  '添加用户': 'Add user',
  '扫描主机': 'Scan host',
  '返回主机': 'Back to host',
  '导出配置': 'Export',
  '还原配置': 'Restore',
  '管理主机': 'Manage hosts',
  '已启用': 'Enabled',
  '已禁用': 'Disabled',
  '运行中': 'Running',
  '成功': 'Success',
  '失败': 'Failed',
  '暂无主机': 'No hosts',
  '暂无虚拟机实例': 'No instances',
  '暂无反向代理配置': 'No reverse-proxy rules',
  '暂无端口转发规则': 'No port-forwarding rules',
  '暂无平台用户': 'No users',
  '没有匹配的用户': 'No matching users',
  '正在加载主机列表…': 'Loading hosts…',
  '正在加载实例列表…': 'Loading instances…',
}

interface I18nState {
  currentLanguage: string
  translations: Record<string, string>
  sortedKeys: string[]
  initialized: boolean
  translating: boolean
}

const i18nState: I18nState = {
  'currentLanguage': 'zh-cn',
  translations: {},
  sortedKeys: [],
  initialized: false,
  translating: false,
}

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
  'CODE', 'PRE', 'KBD', 'SAMP', 'TEXTAREA', 'SVG',
])

/**
 * 词级 .po 只适合整词替换；开启词内拼接会把“物理主机管理”拆成
 * “physics Hosts”这类半成品。默认关闭，未收录的整句保留原文，
 * 需要本地化的页面通过整句覆盖或 key 化文案补充。
 */
const ENABLE_PARTIAL_MATCH = false

const SKIP_CLASSES = new Set(['no-translate', 'notranslate'])
const originalTexts = new WeakMap<Node, string>()
const originalAttrs = new WeakMap<Element, Record<string, string>>()
const CJK_PATTERN = /[\u3400-\u9fff]/

let observer: MutationObserver | null = null
let translationFrame = 0

function normalizeLanguage(input: string | null | undefined): string {
  if (!input) return 'zh-cn'
  const value = input.toLowerCase()
  if (value.startsWith('zh-tw') || value.startsWith('zh-hk') || value.startsWith('zh-hant')) return 'zh-tw'
  if (value.startsWith('zh')) return 'zh-cn'
  if (value.startsWith('en')) return 'en-us'
  if (value.startsWith('ja')) return 'ja-jp'
  if (value.startsWith('ko')) return 'ko-kr'
  if (value.startsWith('fr')) return 'fr-fr'
  if (value.startsWith('de')) return 'de-de'
  if (value.startsWith('it')) return 'it-it'
  if (value.startsWith('pt')) return 'pt-br'
  if (value.startsWith('es')) return 'es-es'
  if (value.startsWith('ru')) return 'ru-ru'
  return 'zh-cn'
}

function getSavedLanguage(): string {
  const saved = localStorage.getItem('language')
  return normalizeLanguage(saved || navigator.language)
}

function saveLanguage(lang: string): void {
  localStorage.setItem('language', lang)
}

function unquote(line: string): string {
  const start = line.indexOf('"')
  const end = line.lastIndexOf('"')
  if (start === -1 || end <= start) return ''
  return line
    .slice(start + 1, end)
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/** 解析 .po：支持多行 msgid/msgstr、注释与文件头 */
export function parsePo(source: string): Record<string, string> {
  const result: Record<string, string> = {}
  let msgid: string[] = []
  let msgstr: string[] = []
  let mode: 'id' | 'str' | null = null

  const flush = () => {
    const id = msgid.join('')
    const str = msgstr.join('')
    if (id && str && id !== str) result[id] = str
    msgid = []
    msgstr = []
    mode = null
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) {
      if (mode) flush()
      continue
    }
    if (line.startsWith('#')) continue
    if (line.startsWith('msgid ')) {
      if (mode) flush()
      mode = 'id'
      msgid = [unquote(line.slice(6))]
      continue
    }
    if (line.startsWith('msgstr ')) {
      mode = 'str'
      msgstr = [unquote(line.slice(7))]
      continue
    }
    if (line.startsWith('"') && line.endsWith('"')) {
      const text = unquote(line)
      if (mode === 'id') msgid.push(text)
      else if (mode === 'str') msgstr.push(text)
    }
  }
  if (mode) flush()
  return result
}

function shouldSkipElement(element: Element): boolean {
  if (SKIP_TAGS.has(element.tagName)) return true
  for (const className of SKIP_CLASSES) {
    if (element.classList?.contains(className)) return true
  }
  if (element.getAttribute('translate') === 'no') return true
  if (element.getAttribute('data-no-i18n') !== null) return true
  if ((element as HTMLElement).isContentEditable) return true
  return false
}

/**
 * 词组替换：最长匹配优先、区间不重叠，并在拉丁字母与中文/相邻译文之间补空格，
 * 避免出现 “platformSettings” 或 “Safetymanag凭据” 这类粘连文本。
 */
function findPartialTranslation(text: string): string | null {
  const matches: Array<{ start: number; end: number; value: string }> = []

  for (const key of i18nState.sortedKeys) {
    const translation = i18nState.translations[key]
    if (!translation || translation === key) continue

    let from = 0
    while (from <= text.length - key.length) {
      const index = text.indexOf(key, from)
      if (index === -1) break
      const end = index + key.length
      const overlaps = matches.some(match => index < match.end && end > match.start)
      if (!overlaps) matches.push({ start: index, end, value: translation })
      from = end
    }
  }

  if (matches.length === 0) return null
  matches.sort((a, b) => a.start - b.start)

  let result = ''
  let cursor = 0
  const startsLatin = (value: string) => /^[A-Za-z0-9]/.test(value)
  const endsLatin = (value: string) => /[A-Za-z0-9]$/.test(value)

  for (const match of matches) {
    const between = text.slice(cursor, match.start)
    if (between && endsLatin(result) && startsLatin(between)) result += ' '
    result += between

    if (endsLatin(result) && startsLatin(match.value)) result += ' '
    result += match.value
    cursor = match.end
  }

  const tail = text.slice(cursor)
  if (tail && endsLatin(result) && startsLatin(tail)) result += ' '
  result += tail

  // 中文与拉丁字母相邻时补空格，保留原有标点
  result = result
    .replace(/([A-Za-z0-9])([\u3400-\u9fff])/g, '$1 $2')
    .replace(/([\u3400-\u9fff])([A-Za-z0-9])/g, '$1 $2')
    .replace(/\s{2,}/g, ' ')

  return result
}

/** 英文下处理带数字的动态计数文案，避免整句退回中文 */
function translatePattern(text: string): string | null {
  if (i18nState.currentLanguage !== 'en-us') return null
  let match = /^显示 (\d+) \/ (\d+) (台|条|个)$/.exec(text)
  if (match) return `Showing ${match[1]} / ${match[2]}`
  match = /^共 (\d+) 条$/.exec(text)
  if (match) return `Total ${match[1]}`
  match = /^共 (\d+) 台$/.exec(text)
  if (match) return `Total ${match[1]}`
  match = /^共 (\d+) 个账号$/.exec(text)
  if (match) return `${match[1]} accounts`
  match = /^(\d+) 条记录$/.exec(text)
  if (match) return `${match[1]} records`
  return null
}

function translateTextNode(textNode: Node, forceRetranslate = false): void {
  if (!originalTexts.has(textNode)) {
    originalTexts.set(textNode, textNode.nodeValue || '')
  }

  const original = originalTexts.get(textNode) || ''
  const sourceText = forceRetranslate ? original : textNode.nodeValue || ''
  const text = sourceText.trim()

  if (!text || text.length > 160) return
  if (!CJK_PATTERN.test(text)) return
  if (/^[\d\s\-_.,;:!?()[\]{}]+$/.test(text)) return

  const exact = i18nState.translations[text]
  if (exact && exact !== text) {
    const leading = sourceText.match(/^\s*/)?.[0] || ''
    const trailing = sourceText.match(/\s*$/)?.[0] || ''
    textNode.nodeValue = leading + exact + trailing
    return
  }

  const patterned = translatePattern(text)
  if (patterned) {
    const leading = sourceText.match(/^\s*/)?.[0] || ''
    const trailing = sourceText.match(/\s*$/)?.[0] || ''
    textNode.nodeValue = leading + patterned + trailing
    return
  }

  const partial = ENABLE_PARTIAL_MATCH ? findPartialTranslation(text) : null
  if (partial) {
    const leading = sourceText.match(/^\s*/)?.[0] || ''
    const trailing = sourceText.match(/\s*$/)?.[0] || ''
    textNode.nodeValue = leading + partial + trailing
  } else if (forceRetranslate) {
    textNode.nodeValue = original
  }
}

function translateAttribute(element: Element, name: 'placeholder' | 'title' | 'aria-label' | 'alt'): void {
  const el = element as HTMLElement
  const value = name === 'aria-label' ? el.getAttribute(name) || '' : (el as any)[name] || ''
  if (!value) return

  let cache = originalAttrs.get(element)
  if (!cache) {
    cache = {}
    originalAttrs.set(element, cache)
  }
  if (!cache[name]) cache[name] = value

  const source = cache[name]
  const translation = i18nState.translations[source]
  if (!translation) return

  if (name === 'aria-label') el.setAttribute(name, translation)
  else (el as any)[name] = translation
}

function translateElement(element: Element, forceRetranslate = false): void {
  if (shouldSkipElement(element)) return

  const attributeTargets = element.matches('[placeholder], [title], [aria-label], img[alt]')
    ? [element, ...element.querySelectorAll('[placeholder], [title], [aria-label], img[alt]')]
    : [...element.querySelectorAll('[placeholder], [title], [aria-label], img[alt]')]

  attributeTargets.forEach(target => {
    translateAttribute(target, 'placeholder')
    translateAttribute(target, 'title')
    translateAttribute(target, 'aria-label')
    translateAttribute(target, 'alt')
  })

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const textNodes: Node[] = []
  let node: Node | null
  while ((node = walker.nextNode())) textNodes.push(node)
  textNodes.forEach(textNode => translateTextNode(textNode, forceRetranslate))
}

function observeDom(): void {
  observer?.disconnect()
  observer = new MutationObserver(mutations => {
    if (i18nState.translating) return
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        translateTextNode(mutation.target)
        continue
      }
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) translateElement(node as Element)
        else if (node.nodeType === Node.TEXT_NODE) translateTextNode(node)
      })
    }
  })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
}

/** 应用翻译；先断开监听，避免翻译写入触发自身死循环 */
export function applyTranslations(root: Element | Document = document.body, forceRetranslate = false): void {
  if (!root) return
  const target = root === document ? document.body : (root as Element)
  if (target.nodeType !== Node.ELEMENT_NODE) return

  i18nState.translating = true
  observer?.disconnect()
  try {
    translateElement(target, forceRetranslate)
  } finally {
    i18nState.translating = false
    observeDom()
  }
}

function updateLanguageDisplay(): void {
  document.documentElement.lang = i18nState.currentLanguage
  const label = SUPPORTED_LANGUAGES.find(item => item.code === i18nState.currentLanguage)?.native || ''
  document.documentElement.dataset.language = i18nState.currentLanguage
  document.getElementById('currentLanguageName')?.replaceChildren(label)
}

/** 加载并应用某个语言；zh-cn 直接恢复原文 */
export async function changeLanguage(lang: string): Promise<void> {
  const code = normalizeLanguage(lang)
  if (code === i18nState.currentLanguage && i18nState.initialized) return

  if (code === 'zh-cn') {
    i18nState.translations = {}
    i18nState.sortedKeys = []
    i18nState.currentLanguage = code
    saveLanguage(code)
    applyTranslations(document.body, true)
    updateLanguageDisplay()
  } else {
    const loader = LANGUAGE_LOADERS[code]
    if (!loader) return
    const source = await loader()
    let translations = parsePo(source)
    if (code === 'en-us') translations = { ...translations, ...ENGLISH_OVERRIDES }

    i18nState.translations = translations
    i18nState.sortedKeys = Object.keys(translations)
      .filter(key => key.length >= 2 && CJK_PATTERN.test(key))
      .sort((a, b) => b.length - a.length)
    i18nState.currentLanguage = code
    saveLanguage(code)
    applyTranslations(document.body, true)
    updateLanguageDisplay()
  }

  if (translationFrame) cancelAnimationFrame(translationFrame)
  translationFrame = requestAnimationFrame(() => {
    if (!i18nState.translating) applyTranslations(document.body, false)
  })

  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: code } }))
}

export function t(key: string, defaultValue: string | null = null, enablePartialMatch = false): string {
  const exact = i18nState.translations[key]
  if (exact) return exact
  if (enablePartialMatch) {
    const partial = findPartialTranslation(key)
    if (partial) return partial
  }
  return defaultValue || key
}

export function retranslate(): void {
  applyTranslations(document.body, true)
}

export function getCurrentLanguage(): string {
  return i18nState.currentLanguage
}

export function getAvailableLanguages(): Language[] {
  return SUPPORTED_LANGUAGES
}

export function getLanguage(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(item => item.code === normalizeLanguage(code))
}

export async function initI18n(): Promise<void> {
  if (i18nState.initialized) return
  const saved = getSavedLanguage()
  await changeLanguage(saved)
  i18nState.initialized = true
  window.dispatchEvent(new CustomEvent('languagesLoaded', { detail: { languages: SUPPORTED_LANGUAGES } }))
}

declare global {
  interface Window {
    i18n: {
      currentLanguage: string
      translations: Record<string, string>
      availableLanguages: Language[]
      initialized: boolean
      observers: MutationObserver[]
      changeLanguage: typeof changeLanguage
      retranslate: typeof retranslate
      getCurrentLanguage: typeof getCurrentLanguage
      init: typeof initI18n
    }
    t: typeof t
  }
}

window.i18n = {
  currentLanguage: i18nState.currentLanguage,
  translations: i18nState.translations,
  availableLanguages: SUPPORTED_LANGUAGES,
  initialized: i18nState.initialized,
  observers: [],
  changeLanguage,
  retranslate,
  getCurrentLanguage,
  init: initI18n,
}
window.t = t

export default {
  t,
  changeLanguage,
  retranslate,
  getCurrentLanguage,
  getAvailableLanguages,
  getLanguage,
  initI18n,
  SUPPORTED_LANGUAGES,
}
