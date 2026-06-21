import { useState, useEffect } from 'react';
import { View, Text, Input, Switch, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { dishAPI } from '../../../services/api';
import './index.scss';

interface StoreInfo {
  id: number; name: string; logo: string; phone: string;
  address: string; notice: string; status: number;
}

const NAV_ITEMS = [
  { key: 'dashboard', label: '营业概览', icon: '📊', path: '/pages/merchant/dashboard/index' },
  { key: 'orders', label: '订单管理', icon: '📦', path: '/pages/merchant/orders/index' },
  { key: 'dishes', label: '菜品管理', icon: '🍽️', path: '/pages/merchant/dishes/index' },
  { key: 'settings', label: '店铺设置', icon: '⚙️', path: '/pages/merchant/settings/index' },
];

export default function MerchantSettings() {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dishAPI.getStoreInfo().then(store => {
      setStore(store);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function updateField(field: string, value: any) {
    setStore(prev => prev ? { ...prev, [field]: value } : null);
  }

  function save() {
    Taro.showToast({ title: '保存成功（演示）', icon: 'success' });
  }

  if (loading) {
    return (
      <View className='merchant-layout'>
        <View className='loading'><Text>加载中...</Text></View>
        <View className='merchant-nav'>
          {NAV_ITEMS.map(item => (
            <View key={item.key} className={`nav-item ${item.key === 'settings' ? 'active' : ''}`}
              onClick={() => Taro.redirectTo({ url: item.path })}>
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
      <ScrollView className='settings-page'>
        <View className='section'>
          <View className='form-group'>
            <Text className='form-label'>店铺名称</Text>
            <Input className='form-input' value={store?.name || ''}
              onInput={e => updateField('name', e.detail.value)} />
          </View>
          <View className='form-group'>
            <Text className='form-label'>联系电话</Text>
            <Input className='form-input' value={store?.phone || ''}
              onInput={e => updateField('phone', e.detail.value)} />
          </View>
          <View className='form-group'>
            <Text className='form-label'>店铺地址</Text>
            <Input className='form-input' value={store?.address || ''}
              onInput={e => updateField('address', e.detail.value)} />
          </View>
          <View className='form-group'>
            <Text className='form-label'>店铺公告</Text>
            <Input className='form-input' value={store?.notice || ''}
              onInput={e => updateField('notice', e.detail.value)} />
          </View>
          <View className='form-group switch-group'>
            <Text className='form-label'>营业状态</Text>
            <Switch checked={store?.status === 1}
              onChange={e => updateField('status', e.detail.value ? 1 : 0)} />
          </View>
        </View>

        <View className='save-btn' onClick={save}>保存设置</View>
      </ScrollView>

      <View className='merchant-nav'>
        {NAV_ITEMS.map(item => (
          <View
            key={item.key}
            className={`nav-item ${item.key === 'settings' ? 'active' : ''}`}
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
