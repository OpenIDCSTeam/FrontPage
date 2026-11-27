<div align="center">
  <img src="public/logo.svg" width="120" height="120" alt="QuickIDC" />

  <h1>QuickIDC FrontPage</h1>

  <p><em>QuickIDC 虚拟化管理平台的 Web 控制台前端</em></p>
  <p>React 18 + TypeScript + Vite，对接 CloudHost 的 RESTful API，提供虚拟机、主机、网络、用户与任务的统一操作界面</p>

<a href="https://github.com/QuickIDC/FrontPage/stargazers"><img src="https://img.shields.io/github/stars/QuickIDC/FrontPage?style=flat-square&logo=github&color=2F6BFF" alt="Stars" /></a>
<a href="https://github.com/QuickIDC/FrontPage/network/members"><img src="https://img.shields.io/github/forks/QuickIDC/FrontPage?style=flat-square&logo=github&color=57C9FF" alt="Forks" /></a>
<a href="https://github.com/QuickIDC/FrontPage/issues"><img src="https://img.shields.io/github/issues/QuickIDC/FrontPage?style=flat-square&color=ED8936" alt="Issues" /></a>
<a href="https://github.com/QuickIDC/FrontPage/commits/main"><img src="https://img.shields.io/github/last-commit/QuickIDC/FrontPage?style=flat-square" alt="Last commit" /></a>
<a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.2-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-9F7AEA?style=flat-square" alt="License" /></a>

🌐 [在线文档](https://idcdoc.opkg.cn) · 🖥️ [CloudHost 后端](https://github.com/QuickIDC/CloudHost) · 🐛 [问题反馈](https://github.com/QuickIDC/FrontPage/issues)

</div>

---

## 项目简介

FrontPage 是 [QuickIDC](https://github.com/QuickIDC) 的 Web 控制台源码，对应 CloudHost（`hostagent`）内置的 `static/` 前端。它把多虚拟化平台的管理操作收敛到一个界面：资源概览、主机与虚拟机管理、Web 控制台、网络与 NAT、用户与权限、任务与日志、系统设置等。

- **统一体验**：一套界面适配 VMware、PVE、LXC、Docker、Hyper-V、ESXi 等平台
- **实时交互**：基于 WebSocket / xterm.js 的 VNC 与 SSH 终端
- **可定制外观**：亮色 / 暗色主题、多语言、可配置字体与品牌信息
- **类型安全**：完整的 TypeScript 类型定义与 API 封装

## 功能页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/dashboard` | 仪表盘 | 资源概览、主机与虚拟机状态、性能图表 |
| `/hosts` | 主机管理 | 添加与维护虚拟化主机，查看主机状态 |
| `/hosts/:hostName/vms` | 虚拟机列表 | 按主机查看、创建、批量操作虚拟机 |
| `/hosts/:hostName/vms/:uuid` | 虚拟机详情 | 配置、磁盘、快照、网络、监控与电源操作 |
| `/hosts/:hostName/vms/:uuid/v2` | 虚拟机详情（纵向布局） | 详情页的另一种信息布局 |
| `/vms` | 全局容器管理 | 跨主机的虚拟机总览 |
| `/users` | 用户管理 | 用户、角色、配额与权限 |
| `/tasks` | 任务管理 | 异步任务进度与历史 |
| `/logs` | 日志管理 | 操作日志与系统日志 |
| `/settings` | 系统设置 | 平台参数、主题、语言等 |
| `/web-proxys` | 反向代理 | Web 反代规则管理 |
| `/nat-rules` | NAT 规则 | 端口转发与网络映射 |
| `/profile` | 个人中心 | 当前账号信息与密码修改 |
| `/login` `/init` `/register` `/reset-password` | 认证 | 登录、初始化向导、注册、找回密码 |

> 用户角色拥有独立的 `/user/*` 路由（仪表盘、我的虚拟机、我的反代、我的 NAT），按权限展示。

## 技术栈

| 分类 | 技术 |
|------|------|
| 核心框架 | React 18 + TypeScript 5.2 |
| 构建工具 | Vite 7 |
| UI 组件 | Ant Design 5 + TailwindCSS 3.4 + DaisyUI 4 |
| 图标 | `@ant-design/icons` / `@heroicons/react` / `@iconify/react` |
| 图表 | ECharts 5 + echarts-for-react |
| 状态管理 | Zustand 4 |
| 路由 | React Router DOM 6 |
| HTTP | Axios（统一拦截器与鉴权） |
| 终端 | `@xterm/xterm` + `@xterm/addon-fit` |
| 其他 | dayjs、sweetalert2 |
| 国际化 | 11 种语言（`src/i18n/locales`） |

## 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9

### 启动开发环境

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（http://localhost:5179）
npm run dev
```

开发服务器会把 `/api` 与 `/static` 代理到后端 `http://localhost:1881`：

```ts
// vite.config.ts
server: {
  port: 5179,
  host: true,
  proxy: {
    '/api': { target: 'http://localhost:1881', changeOrigin: true },
    '/static': { target: 'http://localhost:1881', changeOrigin: true },
  },
}
```

### 启动后端

后端为 [CloudHost](https://github.com/QuickIDC/CloudHost)（Go），在仓库根目录构建并运行：

```bash
go build -o hostagent ./cmd/server
./hostagent --data-dir ./data
```

后端默认监听 `1881`，首次访问会进入初始化向导。

### 生产构建

```bash
npm run build     # 类型检查 + 构建，产物输出到 dist/
npm run preview   # 本地预览构建产物
```

将 `dist/` 内容放入 CloudHost 的 `static/` 目录，即可由后端直接托管。

## 项目结构

```text
FrontPage/
├── src/
│   ├── pages/                  # 页面组件
│   │   ├── Dashboards.tsx      # 仪表盘
│   │   ├── HostManage.tsx      # 主机管理
│   │   ├── DockManage.tsx      # 虚拟机列表
│   │   ├── DockDetail.tsx      # 虚拟机详情
│   │   ├── DockDetailV2.tsx    # 虚拟机详情（纵向布局）
│   │   ├── UserManage.tsx      # 用户管理
│   │   ├── UserConfig.tsx      # 用户配置
│   │   ├── UserPasswd.tsx      # 密码修改
│   │   ├── TaskManage.tsx      # 任务管理
│   │   ├── LogsManage.tsx      # 日志管理
│   │   ├── CoreConfig.tsx      # 系统设置
│   │   ├── HttpProxys.tsx      # 反向代理
│   │   ├── SystemInit.tsx      # 初始化向导
│   │   ├── UserLogins.tsx      # 登录
│   │   ├── UserPostin.tsx      # 注册
│   │   └── MainLayout.tsx      # 主布局（侧边栏 + 顶栏）
│   ├── components/             # 通用组件（主机、虚拟机、防火墙、快照、终端等）
│   ├── contexts/               # React Context
│   ├── hooks/                  # 自定义 Hooks
│   ├── utils/                  # Axios 封装、API、工具函数
│   ├── config/                 # 主题与字体配置
│   ├── constants/              # 常量
│   ├── i18n/                   # 多语言（locales/*.po）
│   ├── types/                  # TypeScript 类型定义
│   ├── styles/                 # 全局样式
│   ├── App.tsx                 # 路由与应用入口
│   ├── main.tsx                # React 挂载入口
│   └── index.css               # 全局 CSS
├── public/                     # 静态资源（logo、字体）
├── index.html                  # HTML 模板
├── vite.config.ts              # Vite 配置（端口、代理、分包）
├── tailwind.config.js          # TailwindCSS 配置
├── tsconfig.json               # TypeScript 配置
└── package.json
```

## 前后端对接

### 认证流程

1. 登录成功后获取 Token / Session
2. 凭据由前端保存，Axios 拦截器自动附加到请求
3. 后端校验通过后返回数据；失效时统一跳转登录页

### API 调用示例

```ts
import { getHosts, createVM } from '@/utils/apis';

const hosts = await getHosts();

await createVM('host-name', {
  vm_uuid: 'xxx',
  vm_name: 'test-vm',
  cpu_num: 2,
  mem_num: 4096,
  hdd_num: 50,
  os_name: 'ubuntu-22.04',
});
```

> API 路径、参数与返回结构以 CloudHost 的接口实现为准。

## 开发规范

- 组件与页面使用函数组件 + Hooks，类型定义放在 `src/types`
- 网络请求统一走 `src/utils` 中的封装，不在组件内直接创建 Axios 实例
- 新增页面需在 `src/App.tsx` 注册路由，并在主布局中添加导航入口
- 新增文案时同步更新 `src/i18n/locales` 下对应语言文件
- 颜色、圆角、阴影等视觉变量优先使用 `src/config/theme.config.ts` 与 Tailwind 工具类

### 可用脚本

```bash
npm run dev       # 开发模式（热更新）
npm run build     # 类型检查 + 生产构建
npm run preview   # 预览构建产物
npm run lint      # ESLint 检查
```

## 常见问题

**前端无法连接后端？** 确认 CloudHost 已在 `1881` 端口运行，且 `vite.config.ts` 中的代理目标一致。

**依赖安装失败？** 清理后重装：

```bash
rm -rf node_modules package-lock.json
npm install
```

**端口被占用？** 修改 `vite.config.ts` 中的 `server.port` 即可。

## 相关仓库

| 仓库 | 说明 |
|------|------|
| [CloudHost](https://github.com/QuickIDC/CloudHost) | 后端服务与内置 Web 控制台 |
| [FrontPage](https://github.com/QuickIDC/FrontPage) | 本仓库，Web 控制台前端 |
| [CloudInit](https://github.com/QuickIDC/CloudInit) | 虚拟机内初始化与状态上报服务 |
| [Documents](https://github.com/QuickIDC/Documents) | 官方文档站 |

## 开源许可

本项目采用 [MIT](https://opensource.org/licenses/MIT) 许可证。

---

<div align="center">
  <strong>欢迎提交 Issue 与 Pull Request</strong>
</div>
