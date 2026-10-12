import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '@/types';

// 扩展AxiosRequestConfig，支持silent选项（静默模式不弹出错误提示）
declare module 'axios' {
  export interface AxiosRequestConfig {
    silent?: boolean;
  }
}

// 创建axios实例
const axio: AxiosInstance = axios.create({
  baseURL: '', // 不设置baseURL，直接使用完整路径（/api会被Vite代理处理）
  timeout: 30000, // 请求超时时间30秒
  withCredentials: true, // 允许跨域请求携带Cookie（Session认证必须）
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF防护：标识为AJAX请求
  },
});

// CSRF Token 管理
let csrfToken: string | null = null;

// 获取 CSRF Token
const fetchCSRFToken = async (): Promise<string> => {
  try {
    const response = await axios.get('/api/csrf-token', { 
      withCredentials: true,
      timeout: 5000 
    });
    csrfToken = response.data.csrf_token;
    return csrfToken;
  } catch (error) {
    console.error('获取 CSRF Token 失败:', error);
    throw error;
  }
};

// 初始化获取 CSRF Token
fetchCSRFToken().catch(() => {
  console.warn('初始 CSRF Token 获取失败，将在首次请求时重试');
});

// 请求拦截器
axio.interceptors.request.use(
  async (config) => {
    // 仅从当前浏览器会话获取认证 Token，避免跨会话残留
    const token = sessionStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 为非安全方法添加 CSRF Token
    const method = config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      // 如果没有 CSRF Token，先获取
      if (!csrfToken) {
        await fetchCSRFToken();
      }
      if (csrfToken && config.headers) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
axio.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data;

    // 如果返回的状态码不是200，则认为是错误
    if (res.code !== 200) {
      // 非静默模式下显示错误消息
      if (!response.config?.silent) {
        message.error(res.msg || '请求失败');
      }

      // 401: 未授权，跳转到登录页（排除用于检查登录状态的接口）
      if (res.code === 401) {
        const url = response.config?.url || '';
        const isCheckUrl = url.includes('/api/users/current') || url.includes('/api/login');
        if (!isCheckUrl) {
          sessionStorage.removeItem('token');
          localStorage.removeItem('token');
          localStorage.removeItem('user-storage');
          window.location.href = '/login';
        }
      }

      // 403: 权限不足
      if (res.code === 403 && !response.config?.silent) {
        message.error('权限不足，无法执行此操作');
      }

      return Promise.reject(new Error(res.msg || '请求失败'));
    }

    // 返回数据
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    console.error('响应错误:', error);

    const isSilent = (error.config as AxiosRequestConfig)?.silent;

    // 处理网络错误
    if (!error.response) {
      if (!isSilent) {
        message.error('网络连接失败，请检查网络设置');
      }
      return Promise.reject(error);
    }

    // 处理HTTP错误状态码
    const { status, data } = error.response;
    
    // 403 且提示 CSRF token 问题时，刷新 token 并重试一次
    if (status === 403 && data?.error?.includes('CSRF')) {
      try {
        await fetchCSRFToken();
        // 重试原请求
        if (error.config) {
          error.config.headers = error.config.headers || {};
          error.config.headers['X-CSRF-Token'] = csrfToken || '';
          return axio.request(error.config);
        }
      } catch (retryError) {
        console.error('CSRF Token 刷新后重试失败:', retryError);
      }
    }
    
    if (!isSilent) {
      switch (status) {
        case 400:
          message.error(data?.msg || '请求参数错误');
          break;
        case 401:
          message.error('未授权，请重新登录');
          break;
        case 403:
          message.error(data?.error || data?.msg || '权限不足');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 500:
          message.error(data?.msg || '服务器内部错误');
          break;
        case 502:
          message.error('网关错误');
          break;
        case 503:
          message.error('服务暂时不可用');
          break;
        default:
          message.error(data?.msg || `请求失败 (${status})`);
      }
    }

    // 401需要跳转登录（排除用于检查登录状态的接口）
    if (status === 401) {
      const url = (error.config as AxiosRequestConfig)?.url || '';
      const isCheckUrl = url.includes('/api/users/current') || url.includes('/api/login');
      if (!isCheckUrl) {
        localStorage.removeItem('token');
        localStorage.removeItem('user-storage');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// 导出请求方法
export default axio;

// 封装常用的请求方法
export const http = {
  // GET请求
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axio.get<ApiResponse<T>>(url, config).then(res => res.data);
  },

  // POST请求
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axio.post<ApiResponse<T>>(url, data, config).then(res => res.data);
  },

  // PUT请求
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axio.put<ApiResponse<T>>(url, data, config).then(res => res.data);
  },

  // DELETE请求
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axio.delete<ApiResponse<T>>(url, config).then(res => res.data);
  },

  // PATCH请求
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axio.patch<ApiResponse<T>>(url, data, config).then(res => res.data);
  },
};
