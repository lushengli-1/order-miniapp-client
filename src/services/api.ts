import Taro from '@tarojs/taro';
import { API_BASE_URL } from '../config';

const BASE_URL = API_BASE_URL;

const request = (url: string, options: any = {}) => {
  const token = Taro.getStorageSync('token');
  const header: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) header.Authorization = `Bearer ${token}`;
  return new Promise<any>((resolve, reject) => {
    Taro.request({
      url: `${BASE_URL}${url}`,
      header,
      ...options,
      success: (res) => {
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else if (res.data.code === 401) {
          // 未登录，由页面处理（弹窗等），不 toast
          reject(res.data);
        } else {
          Taro.showToast({ title: res.data.message || '请求失败', icon: 'none' });
          reject(res.data);
        }
      },
      fail: (err) => {
        Taro.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      }
    });
  });
};

// 用户认证
export const authAPI = {
  login: (data: { username: string; password: string }) =>
    request('/auth/login', { method: 'POST', data }),
  register: (data: { username: string; password: string; nickname: string; role?: number }) =>
    request('/auth/register', { method: 'POST', data }),
  wechatLogin: (data: { code: string; nickname?: string; avatar?: string }) =>
    request('/auth/wechat/login', { method: 'POST', data }),
  setupUser: (data: { role?: number; nickname?: string; invite_code?: string }) =>
    request('/auth/setup', { method: 'POST', data }),
  getUserInfo: () => request('/auth/userinfo', { method: 'GET' }),
  updateAvatar: (url: string) =>
    request('/auth/avatar/update', { method: 'POST', data: { url } }),
  updateUserInfo: (data: { nickname?: string }) =>
    request('/auth/userinfo/update', { method: 'POST', data })
};

// 店铺 & 菜品
export const dishAPI = {
  getStoreInfo: (storeId?: number) => request(`/store${storeId ? `/${storeId}` : ''}`),
  getCategories: (storeId?: number) => request(`/categories${storeId ? `/${storeId}` : ''}`),
  getDishes: (storeId?: number, categoryId?: number) =>
    request(`/dishes${storeId ? `/${storeId}` : ''}${categoryId ? `?category_id=${categoryId}` : ''}`),
  getRecommended: (storeId?: number) => request(`/dishes/recommend${storeId ? `/${storeId}` : ''}`),
  searchDishes: (keyword: string, storeId?: number) =>
    request(`/dishes/search${storeId ? `/${storeId}` : ''}?keyword=${encodeURIComponent(keyword)}`),
  getDishDetail: (id: number) => request(`/dish/${id}`),
  getPopularDishes: (storeId?: number, limit = 10) => request(`/dishes/popular${storeId ? `/${storeId}` : ''}?limit=${limit}`)
};

// 购物车
export const cartAPI = {
  getCart: () => request('/cart'),
  addToCart: (dish_id: number, quantity = 1) =>
    request('/cart/add', { method: 'POST', data: { dish_id, quantity } }),
  updateCart: (dish_id: number, quantity: number) =>
    request('/cart/update', { method: 'POST', data: { dish_id, quantity } }),
  clearCart: () => request('/cart/clear', { method: 'POST' })
};

// 收藏
export const favoriteAPI = {
  getFavorites: () => request('/favorites'),
  addFavorite: (dish_id: number) => request('/favorite/add', { method: 'POST', data: { dish_id } }),
  removeFavorite: (dish_id: number) => request('/favorite/remove', { method: 'POST', data: { dish_id } })
};

// 评价
export const reviewAPI = {
  addReview: (data: { dish_id: number; order_id: number; rating: number; content?: string }) =>
    request('/review/add', { method: 'POST', data }),
  getDishReviews: (dishId: number) => request(`/reviews/${dishId}`),
  getReviewStats: (storeId?: number) => request(`/reviews/stats${storeId ? `/${storeId}` : ''}`)
};

// 订单
export const orderAPI = {
  createOrder: (data: { items: { dish_id: number; quantity: number }[]; remark?: string; table_no?: string }) =>
    request('/order/create', { method: 'POST', data }),
  payOrder: (id: number) => request(`/order/${id}/pay`, { method: 'POST' }),
  getOrders: (status?: number, page = 1) =>
    request(`/order/list?page=${page}&pageSize=10${status !== undefined ? `&status=${status}` : ''}`),
  getOrderDetail: (id: number) => request(`/order/${id}`),
  cancelOrder: (id: number) => request(`/order/${id}/cancel`, { method: 'POST' })
};

// 单张图片上传，返回URL
export async function uploadImage(filePath: string): Promise<string> {
  const res = await Taro.uploadFile({
    url: `${BASE_URL}/upload/image`,
    filePath,
    name: 'image',
    header: { Authorization: `Bearer ${Taro.getStorageSync('token')}` }
  });
  const data = JSON.parse(res.data);
  if (data.code !== 0) throw new Error(data.message || '上传失败');
  return data.data.url;
}

// 批量上传图片，返回逗号分隔的URL
async function uploadImages(filePaths: string[]): Promise<string> {
  const urls: string[] = [];
  for (const fp of filePaths) {
    const url = await uploadImage(fp);
    urls.push(url);
  }
  return urls.join(',');
}

// 商家端
export const merchantAPI = {
  updateStore: (storeId: number, data: { name: string; phone: string; address: string; notice: string; status: number }) =>
    request(`/merchant/store/update/${storeId}`, { method: 'POST', data }),
  getStatistics: () => request('/merchant/statistics'),
  getDishes: (storeId = 1) => request(`/merchant/dishes/${storeId}`),
  addDish: async (storeId: number, data: any) => {
    let imageUrl = '';
    if (data.image) {
      const images = Array.isArray(data.image) ? data.image : [data.image];
      const newFiles = images.filter(p => p.startsWith('http://tmp') || p.startsWith('wxfile://') || p.startsWith('https://tmp'));
      const existingUrls = images.filter(p => !p.startsWith('http://tmp') && !p.startsWith('wxfile://') && !p.startsWith('https://tmp'));
      if (newFiles.length > 0) {
        imageUrl = await uploadImages(newFiles);
      }
      if (existingUrls.length > 0) {
        imageUrl = imageUrl ? imageUrl + ',' + existingUrls.join(',') : existingUrls.join(',');
      }
    }
    return request(`/merchant/dish/add/${storeId}`, {
      method: 'POST',
      data: { ...data, image: imageUrl }
    });
  },
  updateDish: async (id: number, data: any) => {
    let imageUrl = data.image || '';
    if (Array.isArray(data.image)) {
      const newFiles = data.image.filter(p => p.startsWith('http://tmp') || p.startsWith('wxfile://') || p.startsWith('https://tmp'));
      const existingUrls = data.image.filter(p => !p.startsWith('http://tmp') && !p.startsWith('wxfile://') && !p.startsWith('https://tmp'));
      if (newFiles.length > 0) {
        imageUrl = await uploadImages(newFiles);
      } else {
        imageUrl = '';
      }
      if (existingUrls.length > 0) {
        imageUrl = imageUrl ? imageUrl + ',' + existingUrls.join(',') : existingUrls.join(',');
      }
    }
    return request(`/merchant/dish/update/${id}`, {
      method: 'POST',
      data: { ...data, image: imageUrl }
    });
  },
  deleteDish: (id: number) =>
    request(`/merchant/dish/delete/${id}`, { method: 'POST' }),
  getCategories: (storeId: number) => request(`/merchant/categories/${storeId}`),
  addCategory: (storeId: number, data: { name: string; sort?: number }) =>
    request(`/merchant/category/add/${storeId}`, { method: 'POST', data }),
  updateCategory: (id: number, data: { name: string; sort?: number }) =>
    request(`/merchant/category/update/${id}`, { method: 'POST', data }),
  deleteCategory: (id: number) =>
    request(`/merchant/category/delete/${id}`, { method: 'POST' }),
  getOrders: (status?: number, page = 1) =>
    request(`/merchant/orders?page=${page}&pageSize=10${status !== undefined ? `&status=${status}` : ''}`),
  updateOrderStatus: (id: number, status: number) =>
    request(`/merchant/order/${id}/status`, { method: 'POST', data: { status } }),
  getReviews: () => request('/merchant/reviews')
};
