import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { cartAPI, orderAPI } from '../../../services/api';
import { formatPrice, getImageUrl } from '../../../utils';
import SafeImage from '../../../components/SafeImage';
import { useNavBarHeight } from '../../../hooks/useNavBarHeight';
import './index.scss';

interface CartItem {
  dish_id: number; name: string; image: string; price: number; quantity: number;
  stock?: number;
}

export default function Cart() {
  const storeTopMargin = useNavBarHeight();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isMerchant, setIsMerchant] = useState(false);
  const [needLogin, setNeedLogin] = useState(!Taro.getStorageSync('token'));

  const totalAmount = useMemo(() => cartItems.reduce((s, i) => s + i.price * i.quantity, 0), [cartItems]);
  const totalCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);

  useEffect(() => {
    if (needLogin) return;
    loadPageData();
  }, []);

  useDidShow(() => {
    const token = Taro.getStorageSync('token');
    if (token) {
      setNeedLogin(false);
      loadPageData();
    } else {
      setNeedLogin(true);
    }
  });

  function loadPageData() {
    const user = Taro.getStorageSync('user');
    if (user?.role === 1) {
      setIsMerchant(true);
      return;
    }
    setIsMerchant(false);
    loadCart();
  }

  function syncToStorage(items: CartItem[]) {
    Taro.setStorageSync('cart_items', items);
  }

  async function loadCart() {
    // 先从本地存储加载，确保切换 tab 时能立即看到数据
    const localCart = Taro.getStorageSync('cart_items') || [];
    if (localCart.length > 0) {
      setCartItems(localCart);
    }

    // 再异步从服务端同步
    try {
      const items = await cartAPI.getCart();
      const mapped = items.map(item => ({
        dish_id: item.dish_id, name: item.name, image: item.image,
        price: item.price, quantity: item.quantity, stock: item.stock
      }));
      setCartItems(mapped);
      syncToStorage(mapped);
    } catch (err) {
      // 服务端失败，本地存储已加载
    }
  }

  async function updateQuantity(dishId: number, delta: number) {
    const items = [...cartItems];
    const idx = items.findIndex(i => i.dish_id === dishId);
    if (idx < 0) return;

    const newQty = items[idx].quantity + delta;
    if (newQty <= 0) {
      items.splice(idx, 1);
    } else {
      items[idx].quantity = newQty;
    }
    setCartItems(items);
    syncToStorage(items);

    try {
      if (newQty <= 0) {
        await cartAPI.updateCart(dishId, 0);
      } else {
        await cartAPI.updateCart(dishId, newQty);
      }
    } catch (e) {}
  }

  async function submitOrder() {
    if (!Taro.getStorageSync('token')) {
      Taro.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => { if (res.confirm) Taro.switchTab({ url: '/pages/user/profile/index' }); }
      });
      return;
    }
    if (cartItems.length === 0) {
      Taro.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await orderAPI.createOrder({
        items: cartItems.map(i => ({ dish_id: i.dish_id, quantity: i.quantity }))
      });
      const orderId = result.order_id;
      setCartItems([]);
      Taro.removeStorageSync('cart_items');

      Taro.showModal({
        title: '🎉 好友免单',
        content: '因为是好友，本次免单！\n确认后厨师将开始准备～',
        success: (res) => {
          if (res.confirm) {
            orderAPI.payOrder(orderId).then(() => {
              Taro.showModal({
                title: '🎉 免单成功！',
                content: '已通知厨师，请耐心等待～',
                showCancel: false,
                success: () => {
                  Taro.switchTab({ url: '/pages/user/orders/index' });
                }
              });
            }).catch(() => {
              Taro.showToast({ title: '操作失败', icon: 'none' });
              Taro.switchTab({ url: '/pages/user/orders/index' });
            });
          } else {
            Taro.switchTab({ url: '/pages/user/orders/index' });
          }
        }
      });
    } catch (err) {
      console.error('下单失败:', err);
    } finally {
      setSubmitting(false);
    }
  }

  if (needLogin) {
    return (
      <View className='cart-page' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
        <View className='custom-nav' style={{ height: storeTopMargin }}>
          <Text className='custom-nav-title'>购物车</Text>
        </View>
        <View className='empty-cart'>
          <View className='empty-card'>
            <Text className='empty-icon'>👤</Text>
            <Text className='empty-text'>请先登录</Text>
            <Text className='empty-hint'>登录后才能查看购物车</Text>
            <View className='empty-btn' onClick={() => Taro.switchTab({ url: '/pages/user/profile/index' })}>
              去登录
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (isMerchant) {
    return (
      <View className='role-notice'>
        <Text className='role-notice-icon'>🧑‍🍳</Text>
        <Text className='role-notice-title'>当前为大厨身份</Text>
        <Text className='role-notice-desc'>请前往"我的"页面管理店铺</Text>
        <View className='role-notice-btn' onClick={() => Taro.switchTab({ url: '/pages/user/profile/index' })}>
          前往"我的"
        </View>
      </View>
    );
  }

  return (
    <View className='cart-page' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
      <View className='custom-nav' style={{ height: storeTopMargin }}>
        <Text className='custom-nav-title'>购物车</Text>
      </View>

      {cartItems.length > 0 && (
        <View className='cart-content' style={{ maxHeight: `calc(100vh - ${storeTopMargin}px - 80px - 24px)` }}>
          <ScrollView className='cart-list' scrollY>
            {cartItems.map(item => (
              <View key={item.dish_id} className='cart-item'>
                  <View className='item-img'>
                    {item.image ? (
                      <SafeImage className='item-img-content' src={item.image.split(',')[0]} mode='aspectFill' />
                    ) : (
                      <Text>🍽️</Text>
                    )}
                  </View>
                  <View className='item-info'>
                    <Text className='item-name'>{item.name}</Text>
                    <Text className='item-price'>{formatPrice(item.price)}</Text>
                  </View>
                  <View className='qty-control'>
                    <Text className='qty-btn' onClick={() => updateQuantity(item.dish_id, -1)}>-</Text>
                    <Text className='qty-num'>{item.quantity}</Text>
                    <Text className='qty-btn primary' onClick={() => updateQuantity(item.dish_id, 1)}>+</Text>
                  </View>
                </View>
              ))}
          </ScrollView>
        </View>
      )}
      {cartItems.length === 0 && (
        <View className='empty-cart'>
          <View className='empty-card'>
            <Text className='empty-icon'>🛒</Text>
            <Text className='empty-text'>购物车是空的</Text>
            <Text className='empty-hint'>去首页点些好吃的吧～</Text>
          </View>
        </View>
      )}

      {cartItems.length > 0 && (
        <View className='cart-bottom'>
          <View className='total'>
            <Text className='total-label'>合计: </Text>
            <Text className='total-amount'>{formatPrice(totalAmount)}</Text>
          </View>
          <View className={`submit-btn ${submitting ? 'disabled' : ''}`} onClick={submitOrder}>
            {submitting ? '提交中...' : `去支付 ¥${totalAmount.toFixed(2)}`}
          </View>
        </View>
      )}
    </View>
  );
}
