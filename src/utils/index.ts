import Taro from '@tarojs/taro';

// 服务器基础地址（不含 /api）
const SERVER_BASE = 'http://192.168.1.4:3001';

// 获取完整图片 URL
export function getImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${SERVER_BASE}${path}`;
}

// 获取用户登录状态
export function getToken(): string {
  return Taro.getStorageSync('token') || '';
}

// 检查是否已登录
export function isLoggedIn(): boolean {
  return !!getToken();
}

// 简单登录（开发调试用）
export function devLogin() {
  Taro.setStorageSync('token', '');
  Taro.setStorageSync('user', null);
}

// 格式化金额
export function formatPrice(price: number): string {
  return `¥${(Number(price) || 0).toFixed(2)}`;
}

// 订单状态文本
export function getOrderStatusText(status: number): string {
  const map: Record<number, string> = {
    0: '待支付',
    1: '待处理',
    2: '制作中',
    3: '已完成',
    4: '已取消'
  };
  return map[status] || '未知';
}

// 订单状态颜色
export function getOrderStatusColor(status: number): string {
  const map: Record<number, string> = {
    0: '#ff9800',
    1: '#f44336',
    2: '#2196f3',
    3: '#4caf50',
    4: '#999'
  };
  return map[status] || '#999';
}
