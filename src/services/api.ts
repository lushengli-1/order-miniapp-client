import Taro from '@tarojs/taro';

const BASE_URL = 'http://192.168.1.4:3001/api';

const request = (url: string, options: any = {}) => {
  const token = Taro.getStorageSync('token');
  return new Promise<any>((resolve, reject) => {
    Taro.request({
      url: `${BASE_URL}${url}`,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      },
      ...options,
      success: (res) => {
        if (res.data.code === 0) {
          resolve(res.data.data);
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
  login: (data: { openid: string; nickname?: string; avatar?: string }) =>
    request('/auth/login', { method: 'POST', data }),
  getUserInfo: () => request('/auth/userinfo', { method: 'GET' })
};

// 店铺 & 菜品
export const dishAPI = {
  getStoreInfo: (storeId = 1) => request(`/store/${storeId}`),
  getCategories: (storeId = 1) => request(`/categories/${storeId}`),
  getDishes: (storeId = 1, categoryId?: number) =>
    request(`/dishes/${storeId}${categoryId ? `?category_id=${categoryId}` : ''}`),
  getRecommended: (storeId = 1) => request(`/dishes/recommend/${storeId}`),
  searchDishes: (keyword: string, storeId = 1) =>
    request(`/dishes/search/${storeId}?keyword=${keyword}`),
  getDishDetail: (id: number) => request(`/dish/${id}`)
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

// 订单
export const orderAPI = {
  createOrder: (data: { items: { dish_id: number; quantity: number }[]; remark?: string; table_no?: string }) =>
    request('/order/create', { method: 'POST', data }),
  getOrders: (status?: number, page = 1) =>
    request(`/order/list?page=${page}&pageSize=10${status !== undefined ? `&status=${status}` : ''}`),
  getOrderDetail: (id: number) => request(`/order/${id}`),
  cancelOrder: (id: number) => request(`/order/${id}/cancel`, { method: 'POST' })
};

// 商家端
export const merchantAPI = {
  getStatistics: () => request('/merchant/statistics'),
  getDishes: (storeId = 1) => request(`/merchant/dishes/${storeId}`),
  addDish: (storeId: number, data: any) => {
    if (!data.image) {
      return request(`/merchant/dish/add/${storeId}`, {
        method: 'POST',
        data: { ...data, image: '' }
      });
    }
    return Taro.uploadFile({
      url: `${BASE_URL}/merchant/dish/add/${storeId}`,
      filePath: data.image,
      name: 'image',
      formData: {
        category_id: data.category_id,
        name: data.name,
        price: data.price,
        original_price: data.original_price || '0',
        description: data.description || '',
        recipe: data.recipe || '',
        unit: data.unit || '份',
        stock: data.stock || '999',
        is_recommend: data.is_recommend || '0'
      },
      header: { Authorization: `Bearer ${Taro.getStorageSync('token')}` }
    }).then(res => JSON.parse(res.data));
  },
  updateDish: (id: number, data: any) => {
    if (data.image && data.image.startsWith('http')) {
      return request(`/merchant/dish/update/${id}`, {
        method: 'POST',
        data: { ...data, image: undefined }
      });
    }
    return Taro.uploadFile({
      url: `${BASE_URL}/merchant/dish/update/${id}`,
      filePath: data.image,
      name: 'image',
      formData: {
        category_id: data.category_id,
        name: data.name,
        price: data.price,
        original_price: data.original_price || '0',
        description: data.description || '',
        recipe: data.recipe || '',
        unit: data.unit || '份',
        stock: data.stock || '0',
        status: data.status ?? '1',
        is_recommend: data.is_recommend || '0'
      },
      header: { Authorization: `Bearer ${Taro.getStorageSync('token')}` }
    }).then(res => JSON.parse(res.data));
  },
  deleteDish: (id: number) =>
    request(`/merchant/dish/delete/${id}`, { method: 'POST' }),
  getCategories: (storeId = 1) => request(`/merchant/categories/${storeId}`),
  addCategory: (data: { name: string; sort?: number }) =>
    request('/merchant/category/add/1', { method: 'POST', data }),
  updateCategory: (id: number, data: { name: string; sort?: number }) =>
    request(`/merchant/category/update/${id}`, { method: 'POST', data }),
  deleteCategory: (id: number) =>
    request(`/merchant/category/delete/${id}`, { method: 'POST' }),
  getOrders: (status?: number, page = 1) =>
    request(`/merchant/orders?page=${page}&pageSize=10${status !== undefined ? `&status=${status}` : ''}`),
  updateOrderStatus: (id: number, status: number) =>
    request(`/merchant/order/${id}/status`, { method: 'POST', data: { status } })
};
