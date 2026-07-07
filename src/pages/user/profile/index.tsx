import { useState, useEffect } from 'react';
import { View, Text, Input, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { authAPI, uploadImage } from '../../../services/api';
import { getImageUrl } from '../../../utils';
import SafeImage from '../../../components/SafeImage';
import { useNavBarHeight } from '../../../hooks/useNavBarHeight';
import './index.scss';

interface UserInfo {
  id: number; nickname: string; avatar: string; phone: string; role: number;
}

export default function Profile() {
  const storeTopMargin = useNavBarHeight();

  const [user, setUser] = useState<UserInfo | null>(Taro.getStorageSync('user') || null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!Taro.getStorageSync('token'));
  const [showRegister, setShowRegister] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerNickname, setRegisterNickname] = useState('');
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      authAPI.getUserInfo().then(user => {
        setUser(user);
        Taro.setStorageSync('user', user);
      }).catch(() => {});
    }
  }, []);

  async function handleWechatLogin() {
    try {
      const [loginRes, userInfoRes] = await Promise.all([
        Taro.login(),
        Taro.getUserInfo().catch(() => ({ userInfo: null as any }))
      ]);
      if (!loginRes.code) {
        Taro.showToast({ title: '微信登录失败', icon: 'none' });
        return;
      }

      const info = userInfoRes?.userInfo;
      const wechatNickname = info?.nickName && info.nickName !== '微信用户' ? info.nickName : undefined;
      const avatar = info?.avatarUrl || undefined;

      // 先登录（已有账号直接完成，新用户先创建再补全信息）
      const data = await authAPI.wechatLogin({ code: loginRes.code, nickname: wechatNickname, avatar });
      const isNew = data.is_new;

      if (isNew) {
        // 新用户设置昵称
        const nickname = await new Promise<string>((resolve) => {
          Taro.showModal({
            title: '设置昵称',
            content: '请输入你的昵称',
            editable: true,
            placeholderText: wechatNickname || '昵称',
            success: (r) => {
              if (r.confirm && r.content) resolve(r.content);
              else if (r.confirm && wechatNickname) resolve(wechatNickname);
              else resolve('');
            },
            fail: () => resolve(wechatNickname || '')
          });
        });
        if (!nickname) return;

        // 提交补全信息
        const updated = await authAPI.setupUser({ nickname });
        Taro.setStorageSync('user', updated.user);
        setUser(updated.user);
      } else {
        // 已有账号，刷新用户信息
        Taro.removeStorageSync('cart_items');
        setUser(data.user);
      }

      Taro.setStorageSync('token', data.token);
      setIsLoggedIn(true);
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '微信登录失败', icon: 'none' });
    }
  }

  async function handleLogin() {
    if (!loginUsername || !loginPassword) {
      Taro.showToast({ title: '请输入用户名和密码', icon: 'none' });
      return;
    }
    try {
      const data = await authAPI.login({ username: loginUsername, password: loginPassword });
      Taro.setStorageSync('token', data.token);
      Taro.setStorageSync('user', data.user);
      Taro.removeStorageSync('cart_items');
      setUser(data.user);
      setIsLoggedIn(true);
      setLoginUsername('');
      setLoginPassword('');
      Taro.showToast({ title: '登录成功', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '登录失败', icon: 'none' });
    }
  }

  async function handleRegister() {
    if (!registerUsername || !registerPassword) {
      Taro.showToast({ title: '请输入用户名和密码', icon: 'none' });
      return;
    }
    if (registerUsername.length < 2) {
      Taro.showToast({ title: '用户名至少2位', icon: 'none' });
      return;
    }
    if (registerPassword.length < 4) {
      Taro.showToast({ title: '密码至少4位', icon: 'none' });
      return;
    }
    try {
      const data = await authAPI.register({
        username: registerUsername,
        password: registerPassword,
        nickname: registerNickname || registerUsername
      });
      Taro.setStorageSync('token', data.token);
      Taro.setStorageSync('user', data.user);
      Taro.removeStorageSync('cart_items');
      setUser(data.user);
      setIsLoggedIn(true);
      setShowRegister(false);
      Taro.showToast({ title: '注册成功', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '注册失败', icon: 'none' });
    }
  }

  async function handleAvatarUpload() {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] });
      if (!res.tempFilePaths || !res.tempFilePaths[0]) {
        Taro.showToast({ title: '已取消', icon: 'none' });
        return;
      }
      Taro.showLoading({ title: '上传中...' });
      const avatarUrl = await uploadImage(res.tempFilePaths[0]);
      await authAPI.updateAvatar(avatarUrl);
      Taro.hideLoading();
      setUser(prev => prev ? { ...prev, avatar: avatarUrl } : null);
      const saved = Taro.getStorageSync('user');
      if (saved) Taro.setStorageSync('user', { ...saved, avatar: avatarUrl });
      Taro.showToast({ title: '头像更新成功', icon: 'success' });
    } catch (err: any) {
      Taro.hideLoading();
      if (err?.errMsg?.includes('cancel') || err?.errMsg?.includes('fail auth')) {
        return; // 用户取消，不弹错误
      }
      console.error('头像上传失败:', err);
      Taro.showToast({ title: '头像上传失败', icon: 'none' });
    }
  }

  async function handleNicknameSave() {
    if (!nicknameValue || nicknameValue === user?.nickname) {
      setEditingNickname(false);
      return;
    }
    try {
      await authAPI.updateUserInfo({ nickname: nicknameValue });
      setUser(prev => prev ? { ...prev, nickname: nicknameValue } : null);
      const saved = Taro.getStorageSync('user');
      if (saved) Taro.setStorageSync('user', { ...saved, nickname: nicknameValue });
      setEditingNickname(false);
      Taro.showToast({ title: '昵称已更新', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '更新失败', icon: 'none' });
    }
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
    <View className='profile-page' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
      <View className='custom-nav' style={{ height: storeTopMargin }}>
        <Text className='custom-nav-title'>我的</Text>
      </View>

      <View className='profile-content'>
        {isLoggedIn && (
          <View className='user-section'>
            <View className='user-top'>
              <View className='avatar' onClick={handleAvatarUpload}>
                {user?.avatar ? (
                  <SafeImage className='avatar-img' src={user.avatar} />
                ) : (
                  <Text>{user?.nickname ? user.nickname[0] : '?'}</Text>
                )}
              </View>
              <View className='user-info'>
                {editingNickname ? (
                  <Input
                    className='user-name-input'
                    type='nickname'
                    placeholder='填写昵称'
                    value={nicknameValue}
                    onInput={e => setNicknameValue(e.detail.value)}
                    onBlur={handleNicknameSave}
                    onConfirm={handleNicknameSave}
                  />
                ) : (
                  <Text className='user-name' onClick={() => { setNicknameValue(user?.nickname || ''); setEditingNickname(true); }}>{user?.nickname || '未登录'}</Text>
                )}
                {user?.phone && <Text className='user-phone'>{user.phone}</Text>}
              </View>
            </View>
            <View className='user-divider' />
            <View className='user-order-link' onClick={() => Taro.switchTab({ url: '/pages/user/orders/index' })}>
              <Text className='link-icon'>📋</Text>
              <Text className='link-label'>我的订单</Text>
              <Text className='link-arrow'>›</Text>
            </View>
          </View>
        )}

        {user?.role === 1 && (
          <View className='menu-card'>
            <Text className='section-title'>商家管理</Text>
            <View className='menu-item' onClick={() => goTo('/pages/merchant/dashboard/index')}>
              <Text className='menu-icon'>📈</Text>
              <Text className='menu-label'>营业概览</Text>
              <Text className='menu-arrow'>›</Text>
            </View>
            <View className='menu-item' onClick={() => goTo('/pages/merchant/orders/index')}>
              <Text className='menu-icon'>🧾</Text>
              <Text className='menu-label'>订单管理</Text>
              <Text className='menu-arrow'>›</Text>
            </View>
            <View className='menu-item' onClick={() => goTo('/pages/merchant/dishes/index')}>
              <Text className='menu-icon'>🥘</Text>
              <Text className='menu-label'>菜品管理</Text>
              <Text className='menu-arrow'>›</Text>
            </View>
            <View className='menu-item' onClick={() => goTo('/pages/merchant/settings/index')}>
              <Text className='menu-icon'>🔧</Text>
              <Text className='menu-label'>店铺设置</Text>
              <Text className='menu-arrow'>›</Text>
            </View>
          </View>
        )}

        {!isLoggedIn && !showRegister && (
          <View className='form-wrapper'>
          <View className='form-card'>
            <View className='wechat-login-btn' onClick={handleWechatLogin}>
              <Text className='wechat-icon'>💬</Text>
              <Text className='wechat-text'>微信一键登录</Text>
            </View>
            <View className='login-divider'>
              <View className='divider-line' />
              <Text className='divider-text'>或使用账号密码</Text>
              <View className='divider-line' />
            </View>
            <Input className='form-input' placeholder='用户名' value={loginUsername}
              onInput={e => setLoginUsername(e.detail.value)} />
            <Input className='form-input' placeholder='密码' password value={loginPassword}
              onInput={e => setLoginPassword(e.detail.value)} />
            <View className='form-btn' onClick={handleLogin}>登录</View>
            <Text className='form-link' onClick={() => setShowRegister(true)}>没有账号？去注册</Text>
          </View>
          </View>
        )}

        {!isLoggedIn && showRegister && (
          <View className='form-wrapper'>
          <View className='form-card'>
            <Text className='form-title'>注册</Text>
            <Input className='form-input' placeholder='用户名（至少2位）' value={registerUsername}
              onInput={e => setRegisterUsername(e.detail.value)} />
            <Input className='form-input' placeholder='昵称（选填）' value={registerNickname}
              onInput={e => setRegisterNickname(e.detail.value)} />
            <Input className='form-input' placeholder='密码（至少4位）' password value={registerPassword}
              onInput={e => setRegisterPassword(e.detail.value)} />
            <View className='form-btn' onClick={handleRegister}>注册</View>
            <Text className='form-link' onClick={() => setShowRegister(false)}>已有账号？去登录</Text>
          </View>
          </View>
        )}

        {isLoggedIn && (
          <View className='action-section'>
            <View className='action-btn logout' onClick={logout}>退出登录</View>
          </View>
        )}
      </View>
    </View>
  );
}
