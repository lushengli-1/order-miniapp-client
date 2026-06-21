import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { merchantAPI } from '../../../services/api';
import { formatPrice } from '../../../utils';
import './index.scss';

const NAV_ITEMS = [
  { key: 'dashboard', label: '营业概览', icon: '📊', path: '/pages/merchant/dashboard/index' },
  { key: 'orders', label: '订单管理', icon: '📦', path: '/pages/merchant/orders/index' },
  { key: 'dishes', label: '菜品管理', icon: '🍽️', path: '/pages/merchant/dishes/index' },
  { key: 'settings', label: '店铺设置', icon: '⚙️', path: '/pages/merchant/settings/index' },
];

interface TrendItem {
  date: string; count: number; amount: number;
}

export default function MerchantDashboard() {
  const [stats, setStats] = useState<{
    todaySales: number;
    todayOrders: number;
    pendingOrders: number;
    processingOrders: number;
    totalDishes: number;
    trend: TrendItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    merchantAPI.getStatistics().then(stats => {
      setStats(stats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View className='merchant-layout'>
        <View className='loading'><Text>加载中...</Text></View>
        <View className='merchant-nav'>
          {NAV_ITEMS.map(item => (
            <View key={item.key} className={`nav-item ${item.key === 'dashboard' ? 'active' : ''}`}>
              <Text className='nav-icon'>{item.icon}</Text>
              <Text className='nav-label'>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View className='merchant-layout'>
        <View className='error'><Text>获取数据失败</Text></View>
        <View className='merchant-nav'>
          {NAV_ITEMS.map(item => (
            <View key={item.key} className={`nav-item ${item.key === 'dashboard' ? 'active' : ''}`}>
              <Text className='nav-icon'>{item.icon}</Text>
              <Text className='nav-label'>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className='merchant-layout'>
      <View className='merchant-main'>
        <ScrollView className='dashboard'>
          <View className='stats-grid'>
            <View className='stat-card sales'>
              <Text className='stat-value'>{formatPrice(stats.todaySales)}</Text>
              <Text className='stat-label'>今日营业额</Text>
            </View>
            <View className='stat-card orders'>
              <Text className='stat-value'>{stats.todayOrders}</Text>
              <Text className='stat-label'>今日订单</Text>
            </View>
            <View className='stat-card pending'>
              <Text className='stat-value'>{stats.pendingOrders}</Text>
              <Text className='stat-label'>待处理</Text>
            </View>
            <View className='stat-card processing'>
              <Text className='stat-value'>{stats.processingOrders}</Text>
              <Text className='stat-label'>制作中</Text>
            </View>
          </View>

          <View className='section'>
            <Text className='section-title'>营业概况</Text>
            <View className='info-grid'>
              <View className='info-item'>
                <Text className='info-label'>总菜品数</Text>
                <Text className='info-value'>{stats.totalDishes}</Text>
              </View>
            </View>
          </View>

          <View className='section'>
            <Text className='section-title'>近7天订单趋势</Text>
            {stats.trend.length === 0 ? (
              <View className='empty'><Text>暂无数据</Text></View>
            ) : (
              <View className='trend-list'>
                {stats.trend.map((item, idx) => (
                  <View key={idx} className='trend-item'>
                    <Text className='trend-date'>{item.date?.slice(5) || '--'}</Text>
                    <Text className='trend-orders'>订单: {item.count}</Text>
                    <Text className='trend-amount'>{formatPrice(item.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <View className='merchant-nav'>
        {NAV_ITEMS.map(item => (
          <View
            key={item.key}
            className={`nav-item ${item.key === 'dashboard' ? 'active' : ''}`}
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
