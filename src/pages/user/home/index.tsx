import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { dishAPI, cartAPI } from '../../../services/api';
import { formatPrice, getImageUrl } from '../../../utils';
import './index.scss';

interface Category {
  id: number; name: string;
}

interface Dish {
  id: number; category_id: number; name: string; image: string;
  price: number; original_price: number; description: string; sales: number;
  stock: number; is_recommend: number; unit: string;
}

interface CartItem {
  dish_id: number; name: string; image: string; price: number; quantity: number;
}

export default function Home() {
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadPageData();
  }, []);

  useDidShow(() => {
    loadPageData();
  });

  function loadPageData() {
    // 从本地存储恢复购物车数据（即时显示）
    const savedCart = Taro.getStorageSync('cart_items') || [];
    setCart(savedCart);

    const user = Taro.getStorageSync('user');
    if (user?.role === 1) {
      setIsMerchant(true);
      setLoading(false);
      return;
    }
    setIsMerchant(false);
    loadData();
    syncCartFromServer();
  }

  async function syncCartFromServer() {
    try {
      const items = await cartAPI.getCart();
      const serverCart = items.map(item => ({
        dish_id: item.dish_id, name: item.name, image: item.image,
        price: item.price, quantity: item.quantity, stock: item.stock
      }));
      if (serverCart.length > 0) {
        setCart(serverCart);
        Taro.setStorageSync('cart_items', serverCart);
      }
    } catch (err) {
      // 服务端同步失败，本地存储的数据已展示
    }
  }

  async function loadData() {
    try {
      const [storeInfo, categories, dishes] = await Promise.all([
        dishAPI.getStoreInfo(),
        dishAPI.getCategories(),
        dishAPI.getDishes()
      ]);
      setStoreInfo(storeInfo);
      setCategories(categories);
      setDishes(dishes);
      setActiveCategory(categories[0]?.id || 0);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  }

  const filteredDishes = useMemo(
    () => isSearching ? dishes : dishes.filter(d => d.category_id === activeCategory),
    [dishes, activeCategory, isSearching]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  function saveCartToStorage(newCart: CartItem[]) {
    Taro.setStorageSync('cart_items', newCart);
  }

  function addToCart(dish: Dish) {
    const token = Taro.getStorageSync('token');
    if (!token) {
      Taro.showModal({
        title: '提示',
        content: '请先登录',
        success: () => Taro.switchTab({ url: '/pages/user/profile/index' })
      });
      return;
    }

    cartAPI.addToCart(dish.id).catch(() => {});

    const newCart = [...cart];
    const idx = newCart.findIndex(item => item.dish_id === dish.id);
    if (idx >= 0) {
      newCart[idx].quantity += 1;
    } else {
      newCart.push({ dish_id: dish.id, name: dish.name, image: dish.image, price: dish.price, quantity: 1 });
    }
    setCart(newCart);
    saveCartToStorage(newCart);
    Taro.showToast({ title: '已加入购物车', icon: 'success', duration: 800 });
  }

  function removeFromCart(dishId: number) {
    const newCart = [...cart];
    const idx = newCart.findIndex(item => item.dish_id === dishId);
    if (idx >= 0) {
      if (newCart[idx].quantity > 1) {
        newCart[idx].quantity -= 1;
        cartAPI.updateCart(dishId, newCart[idx].quantity).catch(() => {});
      } else {
        newCart.splice(idx, 1);
        cartAPI.updateCart(dishId, 0).catch(() => {});
      }
      setCart(newCart);
      saveCartToStorage(newCart);
    }
  }

  function onSearch() {
    if (keyword.trim()) {
      setIsSearching(true);
      dishAPI.searchDishes(keyword).then(dishes => {
        setDishes(dishes);
        setActiveCategory(0);
      });
    } else {
      setIsSearching(false);
      loadData();
    }
  }

  function goToCart() {
    if (cartCount === 0) {
      Taro.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    Taro.setStorageSync('cart_items', cart);
    Taro.switchTab({ url: '/pages/user/cart/index' });
  }

  if (isMerchant) {
    return (
      <View className='role-notice'>
        <Text className='role-notice-icon'>📊</Text>
        <Text className='role-notice-title'>当前为商家身份</Text>
        <Text className='role-notice-desc'>请前往"我的"页面管理店铺</Text>
        <View className='role-notice-btn' onClick={() => Taro.switchTab({ url: '/pages/user/profile/index' })}>
          前往"我的"
        </View>
      </View>
    );
  }

  return (
    <View className='home'>
      {storeInfo && (
        <View className='store-header'>
          <Text className='store-name'>{storeInfo.name}</Text>
          <Text className='store-notice'>{storeInfo.notice}</Text>
        </View>
      )}

      <View className='search-bar'>
        <Input
          className='search-input'
          placeholder='搜索菜品'
          value={keyword}
          onInput={e => setKeyword(e.detail.value)}
          onConfirm={onSearch}
        />
        <Text className='search-btn' onClick={onSearch}>搜索</Text>
      </View>

      {loading ? (
        <View className='loading'><Text>加载中...</Text></View>
      ) : (
        <View className='content'>
          <ScrollView className='category-sidebar' scrollY>
            {categories.map(cat => (
              <View
                key={cat.id}
                className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => { setIsSearching(false); setKeyword(''); setActiveCategory(cat.id); }}
              >
                <Text>{cat.name}</Text>
              </View>
            ))}
          </ScrollView>

          <ScrollView className='dish-list' scrollY>
            <View className='dish-list-inner'>
              {filteredDishes.map(dish => (
                <View key={dish.id} className='dish-card'>
                  <View className='dish-img'>
                    {dish.image ? (
                      <Image className='dish-img-content' src={getImageUrl(dish.image)} mode='aspectFill' />
                    ) : (
                      <Text className='dish-img-placeholder'>🍽️</Text>
                    )}
                  </View>
                  <View className='dish-info'>
                    <View className='dish-name'>{dish.name}
                      <Text className='recipe-link' onClick={() => Taro.navigateTo({ url: `/pages/user/recipe-detail/index?id=${dish.id}` })}>查看做法</Text>
                    </View>
                    <Text className='dish-desc'>{dish.description}</Text>
                    <Text className='dish-sales'>月售{dish.sales}{dish.unit}</Text>
                    <View className='dish-bottom'>
                      <View className='dish-price'>
                        <Text className='price-current'>{formatPrice(dish.price)}</Text>
                        {dish.original_price > 0 && (
                          <Text className='price-original'>{formatPrice(dish.original_price)}</Text>
                        )}
                      </View>
                      <View className='qty-control'>
                        {cart.some(c => c.dish_id === dish.id) && (
                          <Text className='qty-btn' onClick={() => removeFromCart(dish.id)}>-</Text>
                        )}
                        <Text className='qty-num'>
                          {cart.find(c => c.dish_id === dish.id)?.quantity || ''}
                        </Text>
                        <Text className='qty-btn primary' onClick={() => addToCart(dish)}>+</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              {filteredDishes.length === 0 && (
                <View className='empty'><Text>暂无菜品</Text></View>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <View className='cart-bar' onClick={goToCart}>
        <View className='cart-icon-wrapper'>
          <Text className='cart-icon'>🛒</Text>
          {cartCount > 0 && (
            <Text className='cart-badge'>{cartCount}</Text>
          )}
        </View>
        <View className='cart-info'>
          {cartCount > 0 ? (
            <Text className='cart-amount'>¥{cartAmount.toFixed(2)}</Text>
          ) : (
            <Text className='cart-empty-text'>购物车是空的</Text>
          )}
        </View>
        <View className={`cart-submit ${cartCount > 0 ? 'active' : ''}`} onClick={e => { e.stopPropagation(); goToCart(); }}>
          去结算
        </View>
      </View>
    </View>
  );
}
