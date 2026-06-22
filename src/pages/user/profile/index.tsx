import { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { authAPI } from '../../../services/api';
import './index.scss';

interface UserInfo {
  id: number; nickname: string; avatar: string; phone: string; role: number;
}

export default function Profile() {
  const [user, setUser] = useState<UserInfo | null>(Taro.getStorageSync('user') || null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!Taro.getStorageSync('token'));

  useEffect(() => {
    if (isLoggedIn) {
      authAPI.getUserInfo().then(user => {
        setUser(user);
        setIsLoggedIn(true);
        Taro.setStorageSync('user', user);
      }).catch(() => {});
    }
  }, []);

  function login(userType: 'user' | 'merchant' = 'user') {
    const openid = userType === 'merchant' ? 'merchant_001' : 'user_001';
    const nickname = userType === 'merchant' ? '测试商家' : '测试用户';
    authAPI.login({ openid, nickname }).then((data) => {
      Taro.setStorageSync('token', data.token);
      Taro.setStorageSync('user', data.user);
      Taro.removeStorageSync('cart_items');
      setUser(data.user);
      setIsLoggedIn(true);
      Taro.showToast({ title: `登录成功`, icon: 'success' });
    }).catch(() => {
      Taro.setStorageSync('token', 'dev_token');
      Taro.setStorageSync('user', { id: 1, nickname, role: userType === 'merchant' ? 1 : 0 });
      setUser({ id: 1, nickname, role: userType === 'merchant' ? 1 : 0 } as UserInfo);
      setIsLoggedIn(true);
      Taro.showToast({ title: `登录成功`, icon: 'success' });
    });
  }

  function logout() {
    Taro.showModal({
      title: '提示',
      content: '确定退出登录？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('token');
          Taro.removeStorageSync('user');
          Taro.removeStorageSync('cart_items');
          setUser(null);
          setIsLoggedIn(false);
        }
      }
    });
  }

  function goTo(path: string) {
    Taro.navigateTo({ url: path });
  }

  return (
    <View className='profile-page'>
      <View className='user-section'>
        <View className='avatar'>
          {user?.nickname ? user.nickname[0] : '?'}
        </View>
        <View className='user-info'>
          <Text className='user-name'>{user?.nickname || '未登录'}</Text>
          {user?.phone && <Text className='user-phone'>{user.phone}</Text>}
        </View>
      </View>

      <View className='menu-section'>
        <View className='menu-item' onClick={() => Taro.switchTab({ url: '/pages/user/orders/index' })}>
          <Text className='menu-icon'>📋</Text>
          <Text className='menu-label'>我的订单</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
      </View>

      {user?.role === 1 && (
        <View className='menu-section'>
          <View className='menu-title'>商家管理</View>
          <View className='menu-item' onClick={() => goTo('/pages/merchant/dashboard/index')}>
            <Text className='menu-icon'>📊</Text>
            <Text className='menu-label'>营业概览</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
          <View className='menu-item' onClick={() => goTo('/pages/merchant/orders/index')}>
            <Text className='menu-icon'>📦</Text>
            <Text className='menu-label'>订单管理</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
          <View className='menu-item' onClick={() => goTo('/pages/merchant/dishes/index')}>
            <Text className='menu-icon'>🍽️</Text>
            <Text className='menu-label'>菜品管理</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
          <View className='menu-item' onClick={() => goTo('/pages/merchant/settings/index')}>
            <Text className='menu-icon'>⚙️</Text>
            <Text className='menu-label'>店铺设置</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
        </View>
      )}

      <View className='action-section'>
        {isLoggedIn ? (
          <View className='action-btn logout' onClick={logout}>退出登录</View>
        ) : (
          <View className='action-btn login' onClick={() => login('user')}>吃货</View>
        )}
        {!isLoggedIn && (
          <View className='action-btn merchant-login' onClick={() => login('merchant')}>大厨</View>
        )}
      </View>
    </View>
  );
}
