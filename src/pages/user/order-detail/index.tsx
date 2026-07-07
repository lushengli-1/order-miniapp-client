import { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { orderAPI } from '../../../services/api';
import { formatPrice, getImageUrl, getOrderStatusColor, getUserOrderStatusText } from '../../../utils';
import { useNavBarHeight } from '../../../hooks/useNavBarHeight';
import './index.scss';

interface OrderItem {
  dish_id: number; dish_name: string; dish_image: string;
  price: number; quantity: number;
  review?: { rating: number; content: string; created_at: string } | null;
}

interface Order {
  id: number; order_no: string; total_amount: number; actual_amount: number;
  status: number; remark: string; table_no: string; created_at: string;
  items: OrderItem[];
}

export default function OrderDetail() {
  const storeTopMargin = useNavBarHeight();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Taro.getStorageSync('token')) {
      setLoading(false);
      Taro.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => { if (res.confirm) Taro.switchTab({ url: '/pages/user/profile/index' }); }
      });
      return;
    }
    const params = Taro.getCurrentInstance().router?.params;
    const id = params?.id;
    if (id) {
      orderAPI.getOrderDetail(parseInt(id as string)).then(order => {
        setOrder(order);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
        Taro.showToast({ title: '获取订单失败', icon: 'none' });
      });
    }
  }, []);

  function payOrder() {
    if (!order || order.status !== 0) return;
    Taro.showModal({
      title: '🎉 好友免单',
      content: '因为是好友，本次免费！\n确定后厨师将开始准备～',
      success: (res) => {
        if (res.confirm) {
          orderAPI.payOrder(order.id).then(() => {
            Taro.showModal({
              title: '🎉 免单成功！',
              content: '已通知厨师，请耐心等待～',
              showCancel: false,
              success: () => {
                setOrder(prev => prev ? { ...prev, status: 1 } : null);
              }
            });
          }).catch(() => {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          });
        }
      }
    });
  }

  function cancelOrder() {
    if (!order) return;
    Taro.showModal({
      title: '提示',
      content: '确定取消订单？',
      success: (res) => {
        if (res.confirm) {
          orderAPI.cancelOrder(order.id).then(() => {
            Taro.showToast({ title: '已取消', icon: 'success' });
            setOrder(prev => prev ? { ...prev, status: 4 } : null);
          });
        }
      }
    });
  }

  if (loading) {
    return (
      <View className='detail-page' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
        <View className='custom-nav' style={{ height: storeTopMargin }}>
            <View className='nav-back' onClick={() => Taro.navigateBack()}>
            <Text className='nav-back-icon'>‹</Text>
          </View>
        <Text className='custom-nav-title'>订单详情</Text>
        </View>
        <View className='detail-content'>
          <View className='skeleton-section'>
            <View className='skeleton-line w40' />
            <View className='skeleton-line w50' style={{ marginTop: 8 }} />
          </View>
          <View className='skeleton-section'>
            <View className='skeleton-line w30' />
            {[1,2,3].map(i => (
              <View key={i} className='skeleton-row' style={{ marginTop: 16 }}>
                <View className='skeleton-square' />
                <View className='skeleton-line w50' />
                <View className='skeleton-line w15' />
              </View>
            ))}
          </View>
          <View className='skeleton-section'>
            {[1,2,3].map(i => (
              <View key={i} className='skeleton-row' style={{ marginTop: 12 }}>
                <View className='skeleton-line w40' />
                <View className='skeleton-line w30' />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View className='detail-page' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
        <View className='custom-nav' style={{ height: storeTopMargin }}>
            <View className='nav-back' onClick={() => Taro.navigateBack()}>
            <Text className='nav-back-icon'>‹</Text>
          </View>
        <Text className='custom-nav-title'>订单详情</Text>
        </View>
        <View className='error'><Text>订单不存在</Text></View>
      </View>
    );
  }

  return (
    <View className='detail-page' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
      <View className='custom-nav' style={{ height: storeTopMargin }}>
        <View className='nav-back' onClick={() => Taro.navigateBack()}>
          <Text className='nav-back-icon'>‹</Text>
        </View>
        <Text className='custom-nav-title'>订单详情</Text>
      </View>

      <View className='detail-content'>
        <View className='status-section' style={{ backgroundColor: getOrderStatusColor(order.status) }}>
          <Text className='status-icon'>
            {order.status === 0 ? '🎉' : order.status === 3 ? '✅' : order.status === 4 ? '❌' : '⏳'}
          </Text>
          <Text className='status-text'>{getUserOrderStatusText(order.status)}</Text>
          {order.status === 0 && (
            <Text className='status-hint'>因为是好友，点击下方按钮免单～</Text>
          )}
          {order.status === 1 && (
            <Text className='status-hint'>已通知厨师，请耐心等待～</Text>
          )}
          {order.status === 2 && (
            <Text className='status-hint'>厨师正在准备，请稍候...</Text>
          )}
        </View>

        <View className='glass-section'>
          <Text className='section-title'>商品信息</Text>
          {(order.items || []).map(item => (
            <View key={item.dish_id} className='order-item'>
              <View className='item-img'><Text>🍽️</Text></View>
              <View className='item-info'>
                <Text className='item-name'>{item.dish_name}</Text>
                <Text className='item-meta'>{formatPrice(item.price)} x {item.quantity}</Text>
                {item.review && (
                  <View className='item-review'>
                    <Text className='review-stars'>{'⭐'.repeat(item.review.rating)}</Text>
                    {item.review.content && <Text className='review-text'>{item.review.content}</Text>}
                  </View>
                )}
              </View>
              <Text className='item-total'>{formatPrice(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View className='glass-section'>
          <View className='total-row'>
            <Text className='label'>订单编号</Text>
            <Text className='value'>{order.order_no}</Text>
          </View>
          {order.table_no && (
            <View className='total-row'>
              <Text className='label'>桌号</Text>
              <Text className='value'>{order.table_no}</Text>
            </View>
          )}
          {order.remark && (
            <View className='total-row'>
              <Text className='label'>备注</Text>
              <Text className='value'>{order.remark}</Text>
            </View>
          )}
          <View className='total-row'>
            <Text className='label'>下单时间</Text>
            <Text className='value'>{order.created_at}</Text>
          </View>
          <View className='total-row total'>
            <Text className='label'>合计</Text>
            <Text className='value price'>{formatPrice(order.actual_amount)}</Text>
          </View>
        </View>

        {(order.status === 0 || order.status === 1) && (
          <View className='action-bar'>
            {order.status === 0 && (
              <View className='pay-btn' onClick={payOrder}>🎉 去支付</View>
            )}
            <View className='cancel-btn' onClick={cancelOrder}>取消订单</View>
          </View>
        )}
      </View>
    </View>
  );
}
