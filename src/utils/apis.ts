import { http } from '@/utils/axio.ts';
import type {
  ApiResponse,
  User,
  LoginRequest,
  Host,
  VM,
  CreateVMRequest,
  VMPowerAction,
  NATRule,
  FirewallRule,
  FirewallPayload,
  SnapshotInfo,
  ProxyConfig,
  SystemStats,
  PaginationParams,
} from '@/types';

// ============================================================================
// 认证相关API
// ============================================================================

/**
 * 用户登录
 */
export const login = (data: LoginRequest): Promise<ApiResponse<{ token: string; user_info: User; redirect: string; is_token: boolean }>> => {
  return http.post('/api/login', data);
};

/**
 * 用户登出
 */
export const logout = (): Promise<ApiResponse> => {
  return http.get('/api/logout');
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = (): Promise<ApiResponse<User>> => {
  return http.get('/api/users/current');
};

/**
 * 获取Turnstile验证码公开配置（无需认证）
 */
export const getTurnstileConfig = (): Promise<ApiResponse<{ enabled: boolean; site_key: string }>> => {
  return http.get('/api/public/turnstile-config');
};

/**
 * 找回密码
 */
export const forgotPassword = (email: string, turnstile_token?: string): Promise<ApiResponse> => {
  return http.post('/api/system/forgot-password', { email, turnstile_token });
};

/**
 * 重置密码
 */
export const resetPassword = (data: { token: string; new_password: string; confirm_password: string }): Promise<ApiResponse> => {
  return http.post('/api/system/reset-password', data);
};

// ============================================================================
// 系统管理API
// ============================================================================

/**
 * 获取系统统计信息
 */
export const getSystemStats = (): Promise<ApiResponse<SystemStats>> => {
  return http.get('/api/system/stats');
};

/**
 * 获取支持的引擎类型
 */
export const getEngineTypes = (): Promise<ApiResponse<any[]>> => {
  return http.get('/api/system/engine');
};

/**
 * 获取当前Token
 */
export const getCurrentToken = (): Promise<ApiResponse<{ token: string }>> => {
  return http.get('/api/token/current');
};

/**
 * 设置新Token
 */
export const setToken = (token: string): Promise<ApiResponse<{ token: string }>> => {
  return http.post('/api/token/set', { token });
};

/**
 * 重置Token
 */
export const resetToken = (): Promise<ApiResponse<{ token: string }>> => {
  return http.post('/api/token/reset');
};

// ============================================================================
// 主机管理API
// ============================================================================

/**
 * 获取主机列表
 */
export const getHosts = (): Promise<ApiResponse<Record<string, Host>>> => {
  return http.get('/api/server/detail');
};

/**
 * 获取单个主机详情
 */
export const getHostDetail = (hsName: string): Promise<ApiResponse<Host>> => {
  return http.get(`/api/server/detail/${hsName}`);
};

export interface HostConfigBackup {
  format: 'openidcs-host-config';
  version: 1;
  exported_at: string;
  hosts: Array<Record<string, unknown>>;
}

export interface HostConfigRestoreItem {
  name: string;
  type: string;
  addr: string;
  enable_host: boolean;
  action: 'create' | 'overwrite';
}

export const exportHostConfigs = (hsName?: string): Promise<ApiResponse<HostConfigBackup>> => {
  return http.get('/api/server/config/export', { params: { hs_name: hsName }, silent: true });
};

export const restoreHostConfigs = (
  backup: HostConfigBackup,
  overwrite = false,
  dryRun = true,
): Promise<ApiResponse<{ hosts: HostConfigRestoreItem[] }>> => {
  return http.post('/api/server/config/restore', { backup, overwrite, dry_run: dryRun }, { silent: true, timeout: 120000 });
};

/**
 * 添加主机
 */
export const createHost = (data: Partial<Host> & { server_pass: string }): Promise<ApiResponse> => {
  return http.post('/api/server/create', data);
};

/**
 * 更新主机配置
 */
export const updateHost = (hsName: string, data: Partial<Host>): Promise<ApiResponse> => {
  return http.put(`/api/server/update/${hsName}`, data);
};

/**
 * 删除主机
 */
export const deleteHost = (hsName: string): Promise<ApiResponse> => {
  return http.delete(`/api/server/delete/${hsName}`);
};

/**
 * 主机电源控制（启用/禁用）
 *
 * 注意：后端只认 {enable: boolean}，缺省视为 true。
 * 该封装此前发送 {action: string}，后端读不到 enable 会走默认分支，
 * 传入任何字符串都无法表达「禁用」意图，属于误用陷阱。
 */
export const hostPower = (hsName: string, action: boolean | string): Promise<ApiResponse> => {
  const enable = typeof action === 'boolean'
    ? action
    : !['disable', 'off', 'stop', 'false', '0'].includes(String(action).toLowerCase());
  return http.post(`/api/server/powers/${hsName}`, { enable });
};

/**
 * 启用/禁用主机
 */
export const setHostEnabled = (hsName: string, enable: boolean): Promise<ApiResponse> => {
  return http.post(`/api/server/powers/${hsName}`, { enable });
};

/**
 * 获取主机状态
 */
export const getHostStatus = (hsName: string): Promise<ApiResponse> => {
  return http.get(`/api/server/status/${hsName}`);
};

/**
 * 获取主机的操作系统镜像列表
 */
export const getOSImages = (hsName: string): Promise<ApiResponse<Record<string, any[]>>> => {
  return http.get(`/api/client/os-images/${hsName}`);
};

/**
 * 获取主机GPU列表（兼容旧接口）
 */
export const getGPUList = (hsName: string): Promise<ApiResponse<Record<string, any>>> => {
  return http.get(`/api/client/gpu-list/${hsName}`);
};

/**
 * 获取主机可直通PCI 设备列表
 */
export const getPCIList = (hsName: string): Promise<ApiResponse<Record<string, { gpu_uuid: string; gpu_mdev: string; gpu_hint: string }>>> => {
  return http.get(`/api/client/pci-list/${hsName}`, { timeout: 300000 });
};

/**
 * PCI 设备直通操作（需要关机）
 */
export const setupPCI = (hsName: string, vmUuid: string, data: {
  pci_key: string; gpu_uuid: string; gpu_mdev: string; gpu_hint: string; action: 'add' | 'remove';
}): Promise<ApiResponse> => {
  return http.post(`/api/client/pci/setup/${hsName}/${vmUuid}`, data);
};

/**
 * 获取主机可用USB 设备列表
 */
export const getUSBList = (hsName: string): Promise<ApiResponse<Record<string, { vid_uuid: string; pid_uuid: string; usb_hint: string }>>> => {
  return http.get(`/api/client/usb-list/${hsName}`);
};

/**
 * USB 设备直通操作（无需关机）
 */
export const setupUSB = (hsName: string, vmUuid: string, data: {
  usb_key: string; vid_uuid: string; pid_uuid: string; usb_hint: string; action: 'add' | 'remove';
}): Promise<ApiResponse> => {
  return http.post(`/api/client/usb/setup/${hsName}/${vmUuid}`, data);
};

/**
 * 获取主机套餐列表
 */
export const getServerPlan = (hsName: string): Promise<ApiResponse<Record<string, any>>> => {
  return http.get(`/api/server/plan/${hsName}`);
};

// ============================================================================
// 虚拟机管理API
// ============================================================================

/**
 * 获取虚拟机列表
 */
export const getVMs = (hsName: string): Promise<ApiResponse<VM[]>> => {
  return http.get(`/api/client/detail/${hsName}`);
};

/**
 * 获取虚拟机详情
 */
export const getVMDetail = (hsName: string, vmUuid: string): Promise<ApiResponse<VM>> => {
  return http.get(`/api/client/detail/${hsName}/${vmUuid}`);
};

/**
 * 创建虚拟机
 */
export const createVM = (hsName: string, data: CreateVMRequest): Promise<ApiResponse> => {
  return http.post(`/api/client/create/${hsName}`, data);
};

/**
 * 更新虚拟机配置
 */
export const updateVM = (hsName: string, vmUuid: string, data: Partial<CreateVMRequest>): Promise<ApiResponse> => {
  return http.put(`/api/client/update/${hsName}/${vmUuid}`, data);
};

/**
 * 删除虚拟机
 *
 * recordOnly=true 时只移除本机纳管记录（不删除平台上的虚拟机），
 * 用于清理扫描时被错前缀纳入的历史记录。
 */
export const deleteVM = (hsName: string, vmUuid: string, force = false, confirmOwner?: string, recordOnly = false): Promise<ApiResponse> => {
  const query = `?force=${force}&record_only=${recordOnly}`;
  if (confirmOwner) {
    return http.delete(`/api/client/delete/${hsName}/${vmUuid}${query}`, { data: { confirm_owner: confirmOwner } });
  }
  return http.delete(`/api/client/delete/${hsName}/${vmUuid}${query}`);
};

/**
 * 清理不匹配主机「过滤器名称」前缀的历史纳管记录
 *
 * dryRun=true 时只预览将删除的记录，不执行删除。
 * 该操作只移除本机记录，不会删除平台上的虚拟机。
 */
export const cleanupVMRecords = (hsName: string, dryRun = false): Promise<ApiResponse> => {
  return http.post(`/api/client/scaner/${hsName}/cleanup?dry_run=${dryRun}`);
};

/**
 * 合并同一主机下的重复虚拟机记录
 *
 * Proxmox 平台名称使用连字符，而早期驱动扫描时用下划线保存 vm_uuid，
 * 导致同一台虚拟机出现 pve-xxx 与 pve_xxx 两条记录。
 * 该操作只合并本机记录（保留数据更完整的一条），不会删除平台上的虚拟机。
 *
 * dryRun=true 时只预览将合并的分组。
 */
export const dedupeVMRecords = (hsName: string, dryRun = false): Promise<ApiResponse> => {
  return http.post(`/api/client/scaner/${hsName}/dedupe?dry_run=${dryRun}`);
};

/**
 * 虚拟机电源控制
 */
export const vmPower = (hsName: string, vmUuid: string, action: VMPowerAction): Promise<ApiResponse> => {
  return http.post(`/api/client/powers/${hsName}/${vmUuid}`, { action });
};

/**
 * 获取虚拟机状态
 */
export const getVMStatus = (hsName: string, vmUuid: string): Promise<ApiResponse> => {
  return http.get(`/api/client/status/${hsName}/${vmUuid}`);
};

/**
 * 扫描主机虚拟机
 */
export const scanVMs = (hsName: string): Promise<ApiResponse> => {
  return http.post(`/api/client/scaner/${hsName}`);
};

/**
 * 获取控制台访问地址
 */
export const getVMConsole = (hsName: string, vmUuid: string): Promise<ApiResponse<{
  console_url: string;
  terminal_url: string;
  /** 后端无法生成控制台地址时给出的具体原因（如该平台仅提供命令行控制台） */
  console_error?: string;
}>> => {
  return http.get(`/api/client/remote/${hsName}/${vmUuid}`);
};

/**
 * 修改虚拟机密码
 * type: os_password-修改系统密码, vnc_password-修改VNC密码, vnc_port-修改VNC端口
 */
export const changeVMPassword = (hsName: string, vmUuid: string, data: { type?: string; password?: string; vnc_password?: string; vnc_port?: number }): Promise<ApiResponse> => {
  return http.post(`/api/client/password/${hsName}/${vmUuid}`, data);
};

/**
 * 重装系统
 */
export const reinstallVM = (hsName: string, vmUuid: string, data: { os_name: string; password?: string }): Promise<ApiResponse> => {
  return http.post(`/api/client/reinstall/${hsName}/${vmUuid}`, data);
};

/**
 * 获取虚拟机IP地址列表
 */
export const getVMIPAddresses = (hsName: string, vmUuid: string): Promise<ApiResponse<any[]>> => {
  return http.get(`/api/hosts/${hsName}/vms/${vmUuid}/ip_addresses`);
};

/**
 * 添加IP地址
 */
export const addIPAddress = (hsName: string, vmUuid: string, data: any): Promise<ApiResponse> => {
  return http.post(`/api/hosts/${hsName}/vms/${vmUuid}/ip_addresses`, data);
};

/**
 * 删除IP地址
 */
export const deleteIPAddress = (hsName: string, vmUuid: string, nicName: string): Promise<ApiResponse> => {
  return http.delete(`/api/hosts/${hsName}/vms/${vmUuid}/ip_addresses/${nicName}`);
};

/**
 * 获取虚拟机监控数据
 */
export const getVMMonitorData = (hsName: string, vmUuid: string, range: number): Promise<ApiResponse<any>> => {
  return http.get(`/api/client/status/${hsName}/${vmUuid}?limit=${range}`);
};

/**
 * 获取虚拟机截图
 */
export const getVMScreenshot = (hsName: string, vmUuid: string): Promise<ApiResponse<{ screenshot: string }>> => {
  return http.get(`/api/client/screenshot/${hsName}/${vmUuid}`, { silent: true });
};

/**
 * 获取虚拟机备份列表
 */
export const getVMBackups = (hsName: string, vmUuid: string): Promise<ApiResponse<any[]>> => {
  return http.get(`/api/client/detail/${hsName}/${vmUuid}`);
};

/**
 * 创建虚拟机备份
 */
export const createVMBackup = (hsName: string, vmUuid: string, data: { vm_tips: string }): Promise<ApiResponse> => {
  return http.post(`/api/client/backup/create/${hsName}/${vmUuid}`, data);
};

/**
 * 还原虚拟机备份
 */
export const restoreVMBackup = (hsName: string, vmUuid: string, backupName: string): Promise<ApiResponse> => {
  return http.post(`/api/client/backup/restore/${hsName}/${vmUuid}`, { vm_back: backupName });
};

/**
 * 删除虚拟机备份
 */
export const deleteVMBackup = (hsName: string, vmUuid: string, backupName: string): Promise<ApiResponse> => {
  return http.delete(`/api/client/backup/delete/${hsName}/${vmUuid}`, { data: { vm_back: backupName } });
};

// ============================================================================
// ISO管理API
// ============================================================================

/**
 * 获取虚拟机ISO挂载列表
 */
export const getVMISOs = (hsName: string, vmUuid: string): Promise<ApiResponse<any[]>> => {
  return http.get(`/api/client/detail/${hsName}/${vmUuid}`);
};

/**
 * 挂载ISO
 */
// iso_name 由后端自动生成，调用方通常不需要传
export const addISO = (hsName: string, vmUuid: string, data: { iso_file: string; iso_name?: string; iso_hint?: string }): Promise<ApiResponse> => {
  return http.post(`/api/client/iso/mount/${hsName}/${vmUuid}`, data);
};

/**
 * 卸载ISO
 */
export const deleteISO = (hsName: string, vmUuid: string, isoName: string): Promise<ApiResponse> => {
  return http.delete(`/api/client/iso/unmount/${hsName}/${vmUuid}/${isoName}`);
};

// ============================================================================
// USB管理API
// ============================================================================

/**
 * 添加USB 设备
 */
export const addUSB = (hsName: string, vmUuid: string, data: { usb_vid: string; usb_pid: string; usb_remark?: string }): Promise<ApiResponse> => {
  return http.post(`/api/client/usb/mount/${hsName}/${vmUuid}`, data);
};

/**
 * 删除USB 设备
 */
export const deleteUSB = (hsName: string, vmUuid: string, usbKey: string): Promise<ApiResponse> => {
  return http.delete(`/api/client/usb/delete/${hsName}/${vmUuid}/${usbKey}`);
};

// ============================================================================
// EFI启动项管理API
// ============================================================================

/**
 * 获取虚拟机启动项列表
 */
export const getEFIList = (hsName: string, vmUuid: string): Promise<ApiResponse<{ efi_type: boolean; efi_name: string }[]>> => {
  return http.get(`/api/client/efi-list/${hsName}/${vmUuid}`);
};

/**
 * 设置虚拟机启动项顺序
 */
export const setupEFI = (hsName: string, vmUuid: string, efiList: { efi_type: boolean; efi_name: string }[]): Promise<ApiResponse> => {
  return http.post(`/api/client/efi/setup/${hsName}/${vmUuid}`, { efi_list: efiList });
};

// ============================================================================
// 硬盘管理API
// ============================================================================

/**
 * 获取虚拟机硬盘列表
 */
export const getVMHDDs = (hsName: string, vmUuid: string): Promise<ApiResponse<any[]>> => {
  return http.get(`/api/client/detail/${hsName}/${vmUuid}`);
};

/**
 * 添加硬盘
 */
// hdd_name 由后端自动生成，调用方通常不需要传
export const addHDD = (hsName: string, vmUuid: string, data: { hdd_size: number; hdd_name?: string; hdd_type?: number }): Promise<ApiResponse> => {
  return http.post(`/api/client/hdd/mount/${hsName}/${vmUuid}`, data);
};

/**
 * 删除硬盘
 */
export const deleteHDD = (hsName: string, vmUuid: string, hddIndex: number): Promise<ApiResponse> => {
  return http.delete(`/api/client/hdd/delete/${hsName}/${vmUuid}/${hddIndex}`);
};

/**
 * 获取虚拟机分享用户
 */
export const getVMOwners = (hsName: string, vmUuid: string): Promise<ApiResponse<any[]>> => {
  return http.get(`/api/client/owners/${hsName}/${vmUuid}`);
};

/**
 * 添加虚拟机分享用户
 */
export const addVMOwner = (hsName: string, vmUuid: string, data: { username: string }): Promise<ApiResponse> => {
  return http.post(`/api/client/owners/${hsName}/${vmUuid}`, data);
};

/**
 * 删除虚拟机分享用户
 */
export const deleteVMOwner = (hsName: string, vmUuid: string, username: string): Promise<ApiResponse> => {
  return http.delete(`/api/client/owners/${hsName}/${vmUuid}`, { data: { username } });
};

/**
 * 更新虚拟机所有者权限
 */
export const updateVMOwnerPermission = (hsName: string, vmUuid: string, username: string, permission: number): Promise<ApiResponse> => {
  return http.put(`/api/client/owners/${hsName}/${vmUuid}/permission`, { username, permission });
};

// ============================================================================
// 虚拟机访问密钥API（16 位字母数字长期凭据）
// ============================================================================

export interface VMAccessKeyInfo {
  hs_name: string;
  vm_uuid: string;
  enabled: boolean;
  access_key: string;
  login_url: string;
  length: number;
}

/**
 * 查询虚拟机访问密钥（未生成时 enabled=false）
 */
export const getVMAccessKey = (hsName: string, vmUuid: string): Promise<ApiResponse<VMAccessKeyInfo>> => {
  // 受限身份（临时凭据/访问密钥登录）无权读取，静默处理避免打扰用户
  return http.get(`/api/client/access-key/${hsName}/${vmUuid}`, { silent: true });
};

/**
 * 生成（或重置）虚拟机访问密钥，旧密钥立即失效
 */
export const generateVMAccessKey = (hsName: string, vmUuid: string): Promise<ApiResponse<VMAccessKeyInfo>> => {
  return http.post(`/api/client/access-key/${hsName}/${vmUuid}`);
};

/**
 * 撤销虚拟机访问密钥
 */
export const deleteVMAccessKey = (hsName: string, vmUuid: string): Promise<ApiResponse<VMAccessKeyInfo>> => {
  return http.delete(`/api/client/access-key/${hsName}/${vmUuid}`);
};

// ============================================================================
// 网络管理API
// ============================================================================

/**
 * 获取NAT规则
 */
export const getNATRules = (hsName: string, vmUuid: string): Promise<ApiResponse<NATRule[]>> => {
  return http.get(`/api/client/natget/${hsName}/${vmUuid}`);
};

/**
 * 添加NAT规则
 */
export const addNATRule = (hsName: string, vmUuid: string, data: Omit<NATRule, 'rule_index' | 'enabled' | 'created_time'>): Promise<ApiResponse> => {
  return http.post(`/api/client/natadd/${hsName}/${vmUuid}`, data);
};

/**
 * 删除NAT规则
 */
export const deleteNATRule = (hsName: string, vmUuid: string, ruleIndex: number): Promise<ApiResponse> => {
  return http.delete(`/api/client/natdel/${hsName}/${vmUuid}/${ruleIndex}`);
};

/**
 * 获取虚拟机快照列表
 * 仅支持快照能力的平台（PVE / ESXi / Hyper-V / QEMU / LXD / VirtualBox / Workstation）可用
 */
export const getVMSnapshots = (hsName: string, vmUuid: string): Promise<ApiResponse<SnapshotInfo[]>> => {
  return http.get(`/api/client/snapshot/${hsName}/${vmUuid}`);
};

/**
 * 创建虚拟机快照
 */
export const createVMSnapshot = (
  hsName: string,
  vmUuid: string,
  data: { name?: string; description?: string },
): Promise<ApiResponse> => {
  return http.post(`/api/client/snapshot/${hsName}/${vmUuid}`, data);
};

/**
 * 回滚到指定快照
 */
export const restoreVMSnapshot = (hsName: string, vmUuid: string, name: string): Promise<ApiResponse> => {
  return http.post(`/api/client/snapshot/${hsName}/${vmUuid}/restore`, { name });
};

/**
 * 删除指定快照
 */
export const deleteVMSnapshot = (hsName: string, vmUuid: string, name: string): Promise<ApiResponse> => {
  return http.delete(`/api/client/snapshot/${hsName}/${vmUuid}`, { params: { name } });
};

/**
 * 获取虚拟机防火墙状态与规则
 * 仅支持防火墙能力的平台（Proxmox VE / Hyper-V）可用
 */
export const getFirewall = (hsName: string, vmUuid: string): Promise<ApiResponse<FirewallPayload>> => {
  return http.get(`/api/client/firewall/${hsName}/${vmUuid}`);
};

/**
 * 保存虚拟机防火墙开关与默认策略
 */
export const updateFirewallOptions = (
  hsName: string,
  vmUuid: string,
  data: { enable: boolean; policy_in?: string; policy_out?: string },
): Promise<ApiResponse> => {
  return http.put(`/api/client/firewall/${hsName}/${vmUuid}/options`, data);
};

/**
 * 新增防火墙规则
 */
export const createFirewallRule = (
  hsName: string,
  vmUuid: string,
  data: Omit<FirewallRule, 'pos'>,
): Promise<ApiResponse> => {
  return http.post(`/api/client/firewall/${hsName}/${vmUuid}/rules`, data);
};

/**
 * 按位置更新防火墙规则
 */
export const updateFirewallRule = (
  hsName: string,
  vmUuid: string,
  pos: number,
  data: Omit<FirewallRule, 'pos'>,
): Promise<ApiResponse> => {
  return http.put(`/api/client/firewall/${hsName}/${vmUuid}/rules/${pos}`, data);
};

/**
 * 按位置删除防火墙规则
 */
export const deleteFirewallRule = (hsName: string, vmUuid: string, pos: number): Promise<ApiResponse> => {
  return http.delete(`/api/client/firewall/${hsName}/${vmUuid}/rules/${pos}`);
};

/**
 * 获取反向代理配置
 */
export const getProxyConfigs = (hsName: string, vmUuid: string): Promise<ApiResponse<ProxyConfig[]>> => {
  return http.get(`/api/client/proxys/detail/${hsName}/${vmUuid}`);
};

/**
 * 添加反向代理配置
 */
export const addProxyConfig = (hsName: string, vmUuid: string, data: Omit<ProxyConfig, 'proxy_index' | 'enabled'>): Promise<ApiResponse> => {
  return http.post(`/api/client/proxys/create/${hsName}/${vmUuid}`, data);
};

/**
 * 删除反向代理配置
 */
export const deleteProxyConfig = (hsName: string, vmUuid: string, proxyIndex: number): Promise<ApiResponse> => {
  return http.delete(`/api/client/proxys/delete/${hsName}/${vmUuid}/${proxyIndex}`);
};

// ============================================================================
// Web反向代理管理API
// ============================================================================

/**
 * 获取当前用户的Web反向代理列表
 */
export const getWebProxys = (): Promise<ApiResponse<{ list: any[] }>> => {
  return http.get('/api/client/proxys/list');
};

/**
 * 管理员获取所有Web反向代理列表
 */
export const getAdminWebProxys = (): Promise<ApiResponse<{ list: any[] }>> => {
  return http.get('/api/admin/proxys/list');
};

/**
 * 创建Web反向代理
 */
export const createWebProxy = (
  hsName: string,
  vmUuid: string,
  data: {
    domain: string;
    backend_ip?: string;
    backend_port: number;
    ssl_enabled?: boolean;
    description?: string;
  }
): Promise<ApiResponse> => {
  return http.post(`/api/client/proxys/create/${hsName}/${vmUuid}`, data);
};

/**
 * 更新Web反向代理
 */
export const updateWebProxy = (
  hsName: string,
  vmUuid: string,
  proxyIndex: number,
  data: {
    domain: string;
    backend_ip?: string;
    backend_port: number;
    ssl_enabled?: boolean;
    description?: string;
  }
): Promise<ApiResponse> => {
  return http.put(`/api/client/proxys/update/${hsName}/${vmUuid}/${proxyIndex}`, data);
};

/**
 * 删除Web反向代理
 */
export const deleteWebProxy = (
  hsName: string,
  vmUuid: string,
  proxyIndex: number
): Promise<ApiResponse> => {
  return http.delete(`/api/client/proxys/delete/${hsName}/${vmUuid}/${proxyIndex}`);
};

// ============================================================================
// 用户管理API
// ============================================================================

/**
 * 获取用户列表
 */
export const getUsers = (params?: PaginationParams): Promise<ApiResponse<User[]>> => {
  return http.get('/api/users', { params });
};

/**
 * 创建用户
 */
export const createUser = (data: Partial<User> & { password: string }): Promise<ApiResponse> => {
  return http.post('/api/users', data);
};

/**
 * 更新用户信息
 */
export const updateUser = (userId: number, data: Partial<User>): Promise<ApiResponse> => {
  return http.put(`/api/users/${userId}`, data);
};

/**
 * 删除用户
 */
export const deleteUser = (userId: number): Promise<ApiResponse> => {
  return http.delete(`/api/users/${userId}`);
};

/**
 * 修改用户邮箱
 */
export const changeEmail = (newEmail: string): Promise<ApiResponse> => {
  return http.post('/api/users/change-email', { new_email: newEmail });
};

/**
 * 修改用户密码
 */
export const changePassword = (newPassword: string, confirmPassword: string): Promise<ApiResponse> => {
  return http.post('/api/users/change-password', { new_password: newPassword, confirm_password: confirmPassword });
};

// ============================================================================
// 任务管理API
// ============================================================================

/**
 * 获取任务列表
 */
export const getTasks = (hsName: string, limit?: number): Promise<ApiResponse<any[]>> => {
  const params = limit ? { limit } : {};
  return http.get(`/api/tasks/${hsName}`, { params });
};

// ============================================================================
// 备份管理API
// ============================================================================

/**
 * 获取系统日志详情
 */
export const getLoggerDetail = (): Promise<ApiResponse<any[]>> => {
  return http.get('/api/system/logger/detail');
};

/**
 * 清空系统日志
 */
export const clearLogs = (hsName?: string): Promise<ApiResponse> => {
  const params = hsName ? { hs_name: hsName } : {};
  return http.post('/api/system/logger/clear', null, { params });
};

/**
 * 获取系统设置
 */
export const getSystemSettings = (): Promise<ApiResponse<any>> => {
  return http.get('/api/system/settings');
};

/**
 * 保存系统设置
 */
export const saveSystemSettings = (data: any): Promise<ApiResponse> => {
  return http.post('/api/system/settings', data);
};

/**
 * 保存系统配置
 */
export const saveSystemConfig = (): Promise<ApiResponse> => {
  return http.post('/api/system/config/save');
};

/**
 * 加载系统配置
 */
export const loadSystemConfig = (): Promise<ApiResponse> => {
  return http.post('/api/system/config/load');
};

/**
 * 更新系统设置
 */
export const updateSystemSettings = (data: any): Promise<ApiResponse> => {
  return http.post('/api/system/settings', data);
};

/**
 * 发送测试邮件
 */
export const sendTestEmail = (data: { test_email: string; subject?: string; body?: string; resend_email?: string; resend_apikey?: string }): Promise<ApiResponse> => {
  return http.post('/api/system/test-email', data);
};



/**
 * 扫描主机备份文件
 */
export const scanBackups = (hsName: string): Promise<ApiResponse> => {
  return http.post(`/api/server/backup/scan/${hsName}`);
};

// ============================================================================
// 主机镜像/文件管理（系统模板 + ISO 目录）
// ============================================================================

export type HostImageKind = 'system' | 'iso';

export interface HostImageFile {
  name: string;
  size: number;
  mod_time: number;
  bound: boolean;
  sys_name?: string;
  sys_size?: string;
  sys_type?: string;
  sys_flag?: boolean;
}

export interface HostImageListResult {
  kind: HostImageKind;
  host_name: string;
  dir?: string;
  files: HostImageFile[];
  /** 读取主机目录失败时的原因（接口仍返回 200，便于前端展示目录信息） */
  error?: string;
}

export interface HostImageBindPayload {
  kind: HostImageKind;
  file: string;
  sys_name: string;
  sys_size: string;
  sys_type: string;
}

/**
 * 列出主机镜像目录中的文件（含镜像管理绑定状态）
 */
export const getHostImageFiles = (hsName: string, kind: HostImageKind): Promise<ApiResponse<HostImageListResult>> => {
  return http.get(`/api/server/images/${hsName}`, { params: { kind }, silent: true });
};

/**
 * 上传镜像文件到主机目录
 */
export const uploadHostImageFile = (
  hsName: string,
  kind: HostImageKind,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ApiResponse<{ kind: string; name: string; size: number }>> => {
  const form = new FormData();
  // kind 必须在 file 之前：后端按 multipart 顺序流式转发，先拿到类型再落盘
  form.append('kind', kind);
  form.append('file', file, file.name);
  return http.post(`/api/server/images/${hsName}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
    silent: true,
    onUploadProgress: (event: any) => {
      if (!onProgress || !event?.total) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    },
  });
};

/**
 * 重命名主机镜像文件
 */
export const renameHostImageFile = (
  hsName: string,
  kind: HostImageKind,
  oldName: string,
  newName: string,
): Promise<ApiResponse> => {
  return http.post(`/api/server/images/${hsName}/rename`, { kind, old_name: oldName, new_name: newName }, { silent: true });
};

/**
 * 删除主机镜像文件
 */
export const deleteHostImageFile = (
  hsName: string,
  kind: HostImageKind,
  name: string,
): Promise<ApiResponse> => {
  return http.delete(`/api/server/images/${hsName}`, { params: { kind, name }, silent: true });
};

/**
 * 绑定主机镜像文件到镜像管理
 */
export const bindHostImageFile = (hsName: string, payload: HostImageBindPayload): Promise<ApiResponse> => {
  return http.post(`/api/server/images/${hsName}/bind`, payload, { silent: true });
};

// ---------------------------------------------------------------------------
// 主机平台配置（按平台不同而不同：PVE 网络/存储、QEMU 网桥、Hyper-V 虚拟交换机）
// ---------------------------------------------------------------------------

export interface HostPlatformSection {
  key: string;
  title: string;
  hint?: string;
  columns: string[];
  rows: string[][];
  error?: string;
}

export interface HostPlatformInfo {
  host_name: string;
  server_type: string;
  /** 目标主机操作系统：linux / windows */
  host_os?: string;
  sections: HostPlatformSection[];
}

/**
 * 获取主机平台配置项目
 */
export const getHostPlatformInfo = (hsName: string): Promise<ApiResponse<HostPlatformInfo>> => {
  return http.get(`/api/server/platform/${hsName}`, { silent: true });
};

// ============================================================================
// 主机运维：终端 / 文件 / 防火墙 / 进程 / 服务
// ============================================================================

export interface HostProcessItem {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  /** 展示文本：Linux 为百分比，Windows 为累计 CPU 秒 */
  cpu_desc?: string;
  mem_desc?: string;
  state: string;
  command: string;
}

export interface HostServiceItem {
  name: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

export interface HostFirewallRule {
  id: string;
  target: string;
  protocol: string;
  source: string;
  port: string;
  comment: string;
}

export interface HostFileItem {
  name: string;
  is_dir: boolean;
  size: number;
  mode: string;
  owner: string;
  mod_time: number;
}

export interface HostTerminalTicket {
  ws_url: string;
  token: string;
  expires_in: number;
  user: string;
}

export const requestHostTerminal = (hsName: string): Promise<ApiResponse<HostTerminalTicket>> => {
  return http.post(`/api/server/ops/${hsName}/terminal`, {}, { silent: true });
};

export const getHostProcesses = (hsName: string): Promise<ApiResponse<{ os: string; items: HostProcessItem[] }>> => {
  return http.get(`/api/server/ops/${hsName}/processes`, { silent: true });
};

export const killHostProcess = (hsName: string, pid: number): Promise<ApiResponse> => {
  return http.post(`/api/server/ops/${hsName}/processes/kill`, { pid }, { silent: true });
};

export const getHostServices = (hsName: string): Promise<ApiResponse<{ os: string; items: HostServiceItem[] }>> => {
  return http.get(`/api/server/ops/${hsName}/services`, { silent: true });
};

export const controlHostService = (
  hsName: string,
  name: string,
  action: 'start' | 'stop' | 'restart',
): Promise<ApiResponse> => {
  return http.post(`/api/server/ops/${hsName}/services/control`, { name, action }, { silent: true });
};

export const getHostFirewallRules = (hsName: string): Promise<ApiResponse<{ os: string; rules: HostFirewallRule[] }>> => {
  return http.get(`/api/server/ops/${hsName}/firewall`, { silent: true });
};

export const addHostFirewallRule = (hsName: string, rule: Partial<HostFirewallRule>): Promise<ApiResponse> => {
  return http.post(`/api/server/ops/${hsName}/firewall`, rule, { silent: true });
};

export const deleteHostFirewallRule = (hsName: string, id: string): Promise<ApiResponse> => {
  return http.delete(`/api/server/ops/${hsName}/firewall`, { params: { id }, silent: true });
};

export const getHostFiles = (hsName: string, path: string): Promise<ApiResponse<{ os: string; path: string; items: HostFileItem[] }>> => {
  return http.get(`/api/server/ops/${hsName}/files`, { params: { path }, silent: true });
};

export const uploadHostFile = (
  hsName: string,
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ApiResponse<{ name: string; size: number }>> => {
  const form = new FormData();
  form.append('path', path);
  form.append('file', file, file.name);
  return http.post(`/api/server/ops/${hsName}/files/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
    silent: true,
    onUploadProgress: (event: any) => {
      if (!onProgress || !event?.total) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    },
  });
};

/** 文件下载地址（浏览器直接打开即可，Session Cookie 会带上认证） */
export const hostFileDownloadUrl = (hsName: string, path: string, name: string): string => {
  return `/api/server/ops/${hsName}/files/download?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`;
};

export const createHostDir = (hsName: string, path: string, name: string): Promise<ApiResponse> => {
  return http.post(`/api/server/ops/${hsName}/files/mkdir`, { path, name }, { silent: true });
};

export const renameHostPath = (
  hsName: string,
  path: string,
  name: string,
  newName: string,
): Promise<ApiResponse> => {
  return http.post(`/api/server/ops/${hsName}/files/rename`, { path, name, new_name: newName }, { silent: true });
};

export const deleteHostPath = (hsName: string, path: string, name: string): Promise<ApiResponse> => {
  return http.delete(`/api/server/ops/${hsName}/files`, { params: { path, name }, silent: true });
};

/**
 * 解除主机镜像文件的镜像管理绑定
 */
export const unbindHostImageFile = (
  hsName: string,
  kind: HostImageKind,
  name: string,
): Promise<ApiResponse> => {
  return http.delete(`/api/server/images/${hsName}/bind`, { params: { kind, name }, silent: true });
};

// ============================================================================
// 默认导出
// ============================================================================

/**
 * 默认导出所有API函数
 * 支持 import api from '@/services/api' 的使用方式
 */
export default {
  // 认证相关
  login,
  logout,
  getCurrentUser,
  getTurnstileConfig,
  forgotPassword,
  resetPassword,
  
  // 系统管理
  getSystemStats,
  getEngineTypes,
  getCurrentToken,
  setToken,
  resetToken,
  getLoggerDetail,
  clearLogs,
  getSystemSettings,
  saveSystemSettings,
  
  // 主机管理
  getHosts,
  getHostDetail,
  exportHostConfigs,
  restoreHostConfigs,
  createHost,
  updateHost,
  deleteHost,
  hostPower,
  setHostEnabled,
  getHostStatus,
  getOSImages,
  getGPUList,
  getPCIList,
  setupPCI,
  getUSBList,
  setupUSB,
  getServerPlan,
  getHostImageFiles,
  uploadHostImageFile,
  renameHostImageFile,
  deleteHostImageFile,
  bindHostImageFile,
  unbindHostImageFile,
  getHostPlatformInfo,
  requestHostTerminal,
  getHostProcesses,
  killHostProcess,
  getHostServices,
  controlHostService,
  getHostFirewallRules,
  addHostFirewallRule,
  deleteHostFirewallRule,
  getHostFiles,
  uploadHostFile,
  hostFileDownloadUrl,
  createHostDir,
  renameHostPath,
  deleteHostPath,
  
  // 虚拟机管理
  getVMs,
  getVMDetail,
  createVM,
  updateVM,
  deleteVM,
  vmPower,
  getVMStatus,
  scanVMs,
  cleanupVMRecords,
  dedupeVMRecords,
  getVMConsole,
  changeVMPassword,
  reinstallVM,
  getVMIPAddresses,
  addIPAddress,
  deleteIPAddress,
  getVMMonitorData,
  getVMScreenshot,
  getVMHDDs,
  addHDD,
  deleteHDD,
  getVMISOs,
  addISO,
  deleteISO,
  addUSB,
  deleteUSB,
  getVMBackups,
  createVMBackup,
  restoreVMBackup,
  deleteVMBackup,
  getVMOwners,
  addVMOwner,
  deleteVMOwner,
  updateVMOwnerPermission,

  // 访问密钥管理
  getVMAccessKey,
  generateVMAccessKey,
  deleteVMAccessKey,
  
  // EFI启动项管理
  getEFIList,
  setupEFI,
  
  // 虚拟机快照
  getVMSnapshots,
  createVMSnapshot,
  restoreVMSnapshot,
  deleteVMSnapshot,

  // 虚拟机防火墙
  getFirewall,
  updateFirewallOptions,
  createFirewallRule,
  updateFirewallRule,
  deleteFirewallRule,

  // 网络管理
  getNATRules,
  addNATRule,
  deleteNATRule,
  getProxyConfigs,
  addProxyConfig,
  deleteProxyConfig,
  
  // Web反向代理管理
  getWebProxys,
  getAdminWebProxys,
  createWebProxy,
  updateWebProxy,
  deleteWebProxy,
  
  // 用户管理
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  changeEmail,
  changePassword,
  
  // 任务管理
  getTasks,
  
  // 备份管理
  scanBackups,
  
  // 系统配置
  saveSystemConfig,
  loadSystemConfig,
  updateSystemSettings,
  sendTestEmail,
  
  // HTTP方法（用于自定义请求）
  ...http,
};
