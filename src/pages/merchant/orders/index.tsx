import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { merchantAPI } from '../../../services/api';
import { formatPrice, getImageUrl, getOrderStatusText, getOrderStatusColor } from '../../../utils';
import { useNavBarHeight } from '../../../hooks/useNavBarHeight';
import './index.scss';

interface OrderItem {
  id: number; order_no: string; total_amount: number; actual_amount: number;
  status: number; nickname: string; created_at: string; table_no: string; remark: string;
}

const TABS = [
  { key: '', label: '全部' },
  { key: '1', label: '待处理' },
  { key: '2', label: '制作中' },
  { key: '3', label: '已完成' }
];

const NAV_ITEMS = [
  { key: 'dashboard', label: '营业概览', icon: '📈', path: '/pages/merchant/dashboard/index' },
  { key: 'orders', label: '订单管理', icon: '🧾', path: '/pages/merchant/orders/index' },
  { key: 'dishes', label: '菜品管理', icon: '🥘', path: '/pages/merchant/dishes/index' },
  { key: 'settings', label: '店铺设置', icon: '🔧', path: '/pages/merchant/settings/index' },
];

export default function MerchantOrders() {
  const storeTopMargin = useNavBarHeight();

  useEffect(() => {
    const user = Taro.getStorageSync('user');
    if (!user || user.role !== 1) Taro.redirectTo({ url: '/pages/user/profile/index' });
  }, []);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrdersByTab(activeTab);
  }, []);

  async function loadOrdersByTab(tabIdx: number) {
    const status = TABS[tabIdx].key || undefined;
    setLoading(true);
    try {
      const result = await merchantAPI.getOrders(status);
      setOrders(result.list || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  }

  function switchTab(idx: number) {
    setActiveTab(idx);
    loadOrdersByTab(idx);
  }

  async function updateStatus(id: number, status: number) {
    try {
      await merchantAPI.updateOrderStatus(id, status);
      Taro.showToast({ title: '更新成功', icon: 'success' });
      loadOrdersByTab(activeTab);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <View className='merchant-layout' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
      <View className='custom-nav' style={{ height: storeTopMargin }}>
        <View className='nav-back' onClick={() => Taro.switchTab({ url: '/pages/user/profile/index' })}>
          <Text className='nav-back-icon'>‹</Text>
        </View>
        <Text className='custom-nav-title'>订单管理</Text>
      </View>
      <View className='merchant-main'>
        <ScrollView className='tabs' scrollX showScrollbar={false}>
          {TABS.map((tab, idx) => (
            <View
              key={idx}
              className={`tab-item ${activeTab === idx ? 'active' : ''}`}
              onClick={() => switchTab(idx)}
            >
              <Text>{tab.label}</Text>
            </View>
          ))}
        </ScrollView>

        {loading && orders.length === 0 ? (
          <View className='order-list' style={{ maxHeight: `calc(100vh - ${storeTopMargin}px - 130px)` }}>
            {[1,2,3].map(i => (
              <View key={i} className='order-card-skeleton'>
                <View className='skeleton-row'>
                  <View><View className='skeleton-line w30' /><View className='skeleton-line w20' style={{ marginTop: 6 }} /></View>
                  <View className='skeleton-line w15' />
                </View>
                <View className='skeleton-line w60' style={{ marginTop: 10 }} />
                <View className='skeleton-line w40' style={{ marginTop: 6 }} />
                <View className='skeleton-divider' />
                <View className='skeleton-row'>
                  <View className='skeleton-line w25' />
                  <View className='skeleton-btn-sm' />
                </View>
              </View>
            ))}
            <View style='height: 80px'></View>
          </View>
        ) : orders.length > 0 ? (
          <ScrollView className='order-list' scrollY style={{ maxHeight: `calc(100vh - ${storeTopMargin}px - 130px)` }}>
            {orders.map(order => (
              <View key={order.id} className='order-card'>
                <View className='order-header'>
                  <View>
                    <Text className='user-name'>{order.nickname || '用户'}</Text>
                    {order.table_no && <Text className='table-no'>桌号: {order.table_no}</Text>}
                  </View>
                  <Text className='order-status' style={{ color: getOrderStatusColor(order.status) }}>
                    {getOrderStatusText(order.status)}
                  </Text>
                </View>
                <Text className='order-no'>#{order.order_no}</Text>
                <Text className='order-time'>{order.created_at}</Text>
                {order.remark && <Text className='order-remark'>备注: {order.remark}</Text>}
                <View className='order-footer'>
                  <Text className='order-amount'>{formatPrice(order.actual_amount)}</Text>
                  <View className='action-btns'>
                    {order.status === 1 && (
                      <View className='action-btn accept' onClick={() => updateStatus(order.id, 2)}>
                        接单
                      </View>
                    )}
                    {order.status === 2 && (
                      <View className='action-btn complete' onClick={() => updateStatus(order.id, 3)}>
                        完成
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
            <View style='height: 80px'></View>
          </ScrollView>
        ) : !loading && (
          <View className='empty-state'>
            <View className='empty-card'>
              <Text className='empty-icon'>📋</Text>
              <Text className='empty-text'>暂无订单</Text>
              <Text className='empty-hint'>新的订单会在这里显示</Text>
            </View>
          </View>
        )}
      </View>

      <View className='merchant-nav'>
        {NAV_ITEMS.map(item => (
          <View
            key={item.key}
            className={`nav-item ${item.key === 'orders' ? 'active' : ''}`}
            onClick={() => Taro.redirectTo({ url: item.path })}
          >
            <Text className='nav-icon'>{item.icon}</Text>
            <Text className='nav-label'>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
