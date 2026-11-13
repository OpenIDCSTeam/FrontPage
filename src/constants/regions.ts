/**
 * 国家 / 地区代码（ISO 3166-1 Alpha-2）
 *
 * 用于主机配置里的「区域代码」下拉：server_area 存储为 "代码,名称"，
 * 前半段的代码从这里选择，后半段仍是手填的区域名称（如 成都）。
 */

export interface RegionOption {
    value: string
    label: string
    /** 纯中文名，用于展示与反查 */
    name: string
}

export interface RegionGroup {
    label: string
    options: RegionOption[]
}

function region(code: string, name: string): RegionOption {
    return {value: code, label: `${code} · ${name}`, name}
}

export const REGION_GROUPS: RegionGroup[] = [
    {
        label: '常用地区',
        options: [
            region('CN', '中国'),
            region('HK', '中国香港'),
            region('TW', '中国台湾'),
            region('MO', '中国澳门'),
            region('SG', '新加坡'),
            region('JP', '日本'),
            region('KR', '韩国'),
            region('US', '美国'),
            region('GB', '英国'),
            region('DE', '德国'),
        ],
    },
    {
        label: '亚洲',
        options: [
            region('MY', '马来西亚'),
            region('TH', '泰国'),
            region('VN', '越南'),
            region('PH', '菲律宾'),
            region('ID', '印度尼西亚'),
            region('IN', '印度'),
            region('PK', '巴基斯坦'),
            region('BD', '孟加拉国'),
            region('LK', '斯里兰卡'),
            region('NP', '尼泊尔'),
            region('MM', '缅甸'),
            region('KH', '柬埔寨'),
            region('LA', '老挝'),
            region('BN', '文莱'),
            region('MN', '蒙古'),
            region('KZ', '哈萨克斯坦'),
            region('UZ', '乌兹别克斯坦'),
            region('AE', '阿联酋'),
            region('SA', '沙特阿拉伯'),
            region('QA', '卡塔尔'),
            region('KW', '科威特'),
            region('BH', '巴林'),
            region('OM', '阿曼'),
            region('JO', '约旦'),
            region('LB', '黎巴嫩'),
            region('IL', '以色列'),
            region('TR', '土耳其'),
            region('IR', '伊朗'),
            region('IQ', '伊拉克'),
        ],
    },
    {
        label: '欧洲',
        options: [
            region('FR', '法国'),
            region('NL', '荷兰'),
            region('BE', '比利时'),
            region('LU', '卢森堡'),
            region('CH', '瑞士'),
            region('AT', '奥地利'),
            region('IT', '意大利'),
            region('ES', '西班牙'),
            region('PT', '葡萄牙'),
            region('IE', '爱尔兰'),
            region('SE', '瑞典'),
            region('NO', '挪威'),
            region('DK', '丹麦'),
            region('FI', '芬兰'),
            region('IS', '冰岛'),
            region('PL', '波兰'),
            region('CZ', '捷克'),
            region('SK', '斯洛伐克'),
            region('HU', '匈牙利'),
            region('RO', '罗马尼亚'),
            region('BG', '保加利亚'),
            region('GR', '希腊'),
            region('HR', '克罗地亚'),
            region('SI', '斯洛文尼亚'),
            region('RS', '塞尔维亚'),
            region('UA', '乌克兰'),
            region('BY', '白俄罗斯'),
            region('RU', '俄罗斯'),
            region('LT', '立陶宛'),
            region('LV', '拉脱维亚'),
            region('EE', '爱沙尼亚'),
        ],
    },
    {
        label: '美洲',
        options: [
            region('CA', '加拿大'),
            region('MX', '墨西哥'),
            region('BR', '巴西'),
            region('AR', '阿根廷'),
            region('CL', '智利'),
            region('CO', '哥伦比亚'),
            region('PE', '秘鲁'),
            region('VE', '委内瑞拉'),
            region('UY', '乌拉圭'),
            region('EC', '厄瓜多尔'),
            region('BO', '玻利维亚'),
            region('PY', '巴拉圭'),
        ],
    },
    {
        label: '大洋洲',
        options: [
            region('AU', '澳大利亚'),
            region('NZ', '新西兰'),
            region('FJ', '斐济'),
            region('PG', '巴布亚新几内亚'),
        ],
    },
    {
        label: '非洲',
        options: [
            region('ZA', '南非'),
            region('EG', '埃及'),
            region('NG', '尼日利亚'),
            region('KE', '肯尼亚'),
            region('MA', '摩洛哥'),
            region('DZ', '阿尔及利亚'),
            region('TN', '突尼斯'),
            region('ET', '埃塞俄比亚'),
            region('GH', '加纳'),
            region('TZ', '坦桑尼亚'),
            region('UG', '乌干达'),
            region('AO', '安哥拉'),
            region('MZ', '莫桑比克'),
            region('ZW', '津巴布韦'),
        ],
    },
]

/** 扁平化的全部选项 */
export const REGION_OPTIONS: RegionOption[] = REGION_GROUPS.flatMap(group => group.options)

/** 代码 → 中文名（历史数据里的非标准代码查不到时回退为代码本身） */
export const REGION_NAME_MAP: Record<string, string> = Object.fromEntries(
    REGION_OPTIONS.map(item => [item.value, item.name]),
)
