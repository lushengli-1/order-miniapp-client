import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { cartAPI, orderAPI } from '../../../services/api';
import { formatPrice, getImageUrl } from '../../../utils';
import './index.scss';

interface CartItem {
  dish_id: number; name: string; image: string; price: number; quantity: number;
  stock?: number;
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [tableNo, setTableNo] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isMerchant, setIsMerchant] = useState(false);

  const totalAmount = useMemo(() => cartItems.reduce((s, i) => s + i.price * i.quantity, 0), [cartItems]);
  const totalCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);

  useEffect(() => {
    loadPageData();
  }, []);

  useDidShow(() => {
    loadPageData();
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
    if (cartItems.length === 0) {
      Taro.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await orderAPI.createOrder({
        items: cartItems.map(i => ({ dish_id: i.dish_id, quantity: i.quantity })),
        table_no: tableNo,
        remark
      });
      const orderId = result.order_id;
      setCartItems([]);
      Taro.removeStorageSync('cart_items');
      setTableNo('');
      setRemark('');

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
    <View className='cart-page'>
      {cartItems.length === 0 ? (
        <View className='empty-cart'>
          <Text className='empty-icon'>🛒</Text>
          <Text className='empty-text'>购物车是空的</Text>
          <View className='go-home-btn' onClick={() => Taro.switchTab({ url: '/pages/user/home/index' })}>
            去点餐
          </View>
        </View>
      ) : (
        <>
          <ScrollView className='cart-list' scrollY>
            {cartItems.map(item => (
              <View key={item.dish_id} className='cart-item'>
                <View className='item-img'>
                  {item.image ? (
                    <Image className='item-img-content' src={getImageUrl(item.image)} mode='aspectFill' />
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

          <View className='order-info'>
            <View className='info-row'>
              <Text className='info-label'>桌号</Text>
              <Input className='info-input' placeholder='请输入桌号（选填）' value={tableNo}
                onInput={e => setTableNo(e.detail.value)} />
            </View>
            <View className='info-row'>
              <Text className='info-label'>备注</Text>
              <Input className='info-input' placeholder='口味、要求等（选填）' value={remark}
                onInput={e => setRemark(e.detail.value)} />
            </View>
          </View>

          <View className='bottom-bar'>
            <View className='total'>
              <Text className='total-label'>合计: </Text>
              <Text className='total-amount'>{formatPrice(totalAmount)}</Text>
            </View>
            <View className={`submit-btn ${submitting ? 'disabled' : ''}`} onClick={submitOrder}>
              {submitting ? '提交中...' : `去支付 ¥${totalAmount.toFixed(2)}`}
            </View>
          </View>
        </>
      )}
    </View>
  );
}
