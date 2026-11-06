export type VMDetailLayout = 'horizontal' | 'vertical'

const VM_DETAIL_LAYOUT_PREFIX = 'openidcs:vm-detail-layout:v1:'

export function getVMDetailLayoutKey(username?: string | null): string {
  return `${VM_DETAIL_LAYOUT_PREFIX}${username || 'anonymous'}`
}

export function readVMDetailLayout(username?: string | null): VMDetailLayout {
  try {
    const saved = localStorage.getItem(getVMDetailLayoutKey(username))
    return saved === 'vertical' ? 'vertical' : 'horizontal'
  } catch {
    return 'horizontal'
  }
}

export function saveVMDetailLayout(username: string | null | undefined, layout: VMDetailLayout): void {
  try {
    localStorage.setItem(getVMDetailLayoutKey(username), layout)
  } catch {
    // Keep the selected route usable when browser storage is unavailable.
  }
}
