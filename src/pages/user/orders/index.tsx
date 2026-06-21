import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { orderAPI } from '../../../services/api';
import { formatPrice, getOrderStatusColor, getUserOrderStatusText } from '../../../utils';
import './index.scss';

interface Order {
  id: number; order_no: string; total_amount: number; actual_amount: number;
  status: number; created_at: string; table_no: string;
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
            </View>
          </View>
        ))}
        {loading && <View className='loading-more'><Text>加载中...</Text></View>}
      </ScrollView>
    </View>
  );
}
