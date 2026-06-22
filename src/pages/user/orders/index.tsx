import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { orderAPI } from '../../../services/api';
import { formatPrice, getOrderStatusColor, getUserOrderStatusText } from '../../../utils';
import './index.scss';

interface Order {
  id: number; order_no: string; total_amount: number; actual_amount: number;
  status: number; created_at: string; table_no: string; reviewed?: boolean;
}

const TABS = [
  { key: -1, label: '全部' },
  { key: 0, label: '待支付' },
  { key: 3, label: '已完成' }
];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState(-1);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isMerchant, setIsMerchant] = useState(false);

  const stateRef = useRef({ activeTab, page });
  stateRef.current = { activeTab, page };

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
    const { activeTab, page } = stateRef.current;
    loadOrders(activeTab, page);
  }

  async function loadOrders(tab: number, pg: number, append = false) {
    setLoading(true);
    try {
      const result = await orderAPI.getOrders(tab === -1 ? undefined : tab, pg);
      const list = result.list || [];
      setOrders(prev => append ? [...prev, ...list] : list);
      setHasMore(list.length >= 10);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function switchTab(key: number) {
    setActiveTab(key);
    setPage(1);
    setOrders([]);
    loadOrders(key, 1);
  }

  function loadMore() {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadOrders(activeTab, nextPage, true);
  }

  function goToDetail(id: number) {
    Taro.navigateTo({ url: `/pages/user/order-detail/index?id=${id}` });
  }

  function showActionSheet(items: string[]): Promise<number> {
    return new Promise((resolve) => {
      Taro.showActionSheet({
        itemList: items,
        success: (res) => resolve(res.tapIndex),
        fail: () => resolve(-1)
      });
    });
  }

  function showReviewModal(title: string, rating: number, content: string): Promise<{ confirm: boolean; content: string }> {
    return new Promise((resolve) => {
      Taro.showModal({
        title,
        content: `评分：${'⭐'.repeat(rating)}（1-5星）\n\n评价内容：${content || '（选填）'}`,
        editable: true,
        placeholderText: '说说这道菜怎么样...',
        success: (res) => resolve({ confirm: res.confirm || false, content: res.content || '' }),
        fail: () => resolve({ confirm: false, content: '' })
      });
    });
  }

  async function handleReview(order: Order) {
    if (order.status !== 3) return;
    try {
      const detail = await orderAPI.getOrderDetail(order.id);
      const items = detail.items || [];
      if (items.length === 0) {
        Taro.showToast({ title: '没有可评价的菜品', icon: 'none' });
        return;
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 先选评分
        const idx = await showActionSheet(['⭐ 1分', '⭐⭐ 2分', '⭐⭐⭐ 3分', '⭐⭐⭐⭐ 4分', '⭐⭐⭐⭐⭐ 5分']);
        if (idx < 0) return; // 取消
        const rating = idx + 1;

        // 弹评价框
        const modalRes = await showReviewModal(`评价 - ${item.dish_name}`, rating, '');
        if (!modalRes.confirm) return; // 取消

        try {
          await reviewAPI.addReview({
            dish_id: item.dish_id,
            order_id: order.id,
            rating,
            content: modalRes.content
          });
          // 评价成功，继续下一个
        } catch (e: any) {
          const msg = typeof e === 'object' && e !== null ? (e.message || '') : '';
          if (msg.includes('已评价')) {
            // 已评价过，跳过
          } else {
            Taro.showToast({ title: msg || '评价失败', icon: 'none' });
            return;
          }
        }
      }

      // 全部完成
      Taro.showToast({ title: '全部评价完成', icon: 'success', duration: 1500 });
      setTimeout(() => Taro.navigateTo({ url: `/pages/user/order-detail/index?id=${order.id}` }), 1500);
    } catch (err) {
      Taro.showToast({ title: '获取订单失败', icon: 'none' });
    }
  }

  function handlePay(order: Order) {
    if (order.status !== 0) return;
    Taro.showModal({
      title: '🎉 好友免单',
      content: '因为是好友，本次免单！确认后厨师将开始准备～',
      success: (res) => {
        if (res.confirm) {
          orderAPI.payOrder(order.id).then(() => {
            Taro.showModal({
              title: '🎉 免单成功！',
              content: '已通知厨师，请耐心等待～',
              showCancel: false,
              success: () => {
                const { activeTab: tab, page: pg } = stateRef.current;
                loadOrders(tab, pg);
              }
            });
          }).catch(() => {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          });
        }
      }
    });
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
    <View className='orders-page'>
      <ScrollView className='tabs' scrollX showScrollbar={false}>
        {TABS.map(tab => (
          <View
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => switchTab(tab.key)}
          >
            <Text>{tab.label}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView className='order-list' scrollY onScrollToLower={loadMore}>
        {orders.length === 0 && !loading && (
          <View className='empty-state'><Text>暂无订单</Text></View>
        )}
        {orders.map(order => (
          <View key={order.id} className='order-card' onClick={() => goToDetail(order.id)}>
            <View className='order-header'>
              <Text className='order-no'>#{order.order_no.slice(-10)}</Text>
              <Text className='order-status' style={{ color: getOrderStatusColor(order.status) }}>
                {getUserOrderStatusText(order.status)}
              </Text>
            </View>
            <View className='order-body'>
              <Text className='order-time'>{order.created_at}</Text>
              {order.table_no && <Text className='order-table'>桌号: {order.table_no}</Text>}
            </View>
            <View className='order-footer'>
              <View className='order-amount'>
                合计: <Text className='amount-price'>{formatPrice(order.actual_amount)}</Text>
              </View>
              {order.status === 0 && (
                <Text className='pay-btn' onClick={e => { e.stopPropagation(); handlePay(order); }}>去支付</Text>
              )}
              {order.status === 3 && (
                order.reviewed
                  ? <Text className='reviewed-btn'>已评价</Text>
                  : <Text className='review-btn' onClick={e => { e.stopPropagation(); handleReview(order); }}>评价</Text>
              )}
            </View>
          </View>
        ))}
        {loading && <View className='loading-more'><Text>加载中...</Text></View>}
      </ScrollView>
    </View>
  );
}
