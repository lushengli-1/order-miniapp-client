import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { merchantAPI } from '../../../services/api';
import { formatPrice, getOrderStatusText, getOrderStatusColor } from '../../../utils';
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
  { key: 'dashboard', label: '营业概览', icon: '📊', path: '/pages/merchant/dashboard/index' },
  { key: 'orders', label: '订单管理', icon: '📦', path: '/pages/merchant/orders/index' },
  { key: 'dishes', label: '菜品管理', icon: '🍽️', path: '/pages/merchant/dishes/index' },
  { key: 'settings', label: '店铺设置', icon: '⚙️', path: '/pages/merchant/settings/index' },
];

export default function MerchantOrders() {
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
    <View className='merchant-layout'>
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

        <ScrollView className='order-list' scrollY>
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
          {orders.length === 0 && !loading && (
            <View className='empty'><Text>暂无订单</Text></View>
          )}
        </ScrollView>
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
