import { useState, useEffect } from 'react';
import { View, Text, Swiper, SwiperItem } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { dishAPI, cartAPI, reviewAPI } from '../../../services/api';
import { formatPrice, getImageUrl } from '../../../utils';
import SafeImage from '../../../components/SafeImage';
import { useNavBarHeight } from '../../../hooks/useNavBarHeight';
import './index.scss';

interface DishDetail {
  id: number; name: string; image: string; price: number;
  original_price: number; description: string; recipe: string;
  unit: string; sales: number; stock: number;
}

export default function RecipeDetail() {
  const storeTopMargin = useNavBarHeight();

  const [dish, setDish] = useState<DishDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    loadDish();
  }, []);

  async function loadDish() {
    const params = Taro.getCurrentInstance().router?.params;
    const id = params?.id;
    if (!id) {
      setLoading(false);
      setError('参数错误');
      return;
    }
    try {
      const dish = await dishAPI.getDishDetail(Number(id));
      setDish(dish);
      setLoading(false);
      try {
        const result = await reviewAPI.getDishReviews(Number(id));
        setReviews(result.list || []);
        setAvgRating(result.avg_rating || 0);
      } catch (_) {}
    } catch (err) {
      setLoading(false);
      setError('菜品不存在');
    }
  }

  async function addToCart() {
    if (!dish) return;
    if (!Taro.getStorageSync('token')) {
      Taro.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => { if (res.confirm) Taro.switchTab({ url: '/pages/user/profile/index' }); }
      });
      return;
    }
    try {
      await cartAPI.addToCart(dish.id);
      Taro.showToast({ title: '已加入购物车', icon: 'success', duration: 800 });
    } catch (err) {
      Taro.showToast({ title: '加入失败', icon: 'none' });
    }
  }

  if (loading) {
    return (
      <View className='recipe-page' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
        <View className='custom-nav' style={{ height: storeTopMargin }}>
          <View className='nav-back' onClick={() => Taro.navigateBack()}>
            <Text className='nav-back-icon'>‹</Text>
          </View>
          <Text className='custom-nav-title'>商品详情</Text>
        </View>
        <View className='recipe-scroll'>
          <View className='recipe-scroll-inner recipe-skeleton'>
            <View className='skeleton-hero' />
            <View className='glass-section'>
              <View className='skeleton-line w60' />
              <View className='skeleton-line w30' style={{ marginTop: 8 }} />
              <View className='skeleton-line w80' style={{ marginTop: 8 }} />
            </View>
            <View className='glass-section'>
              <View className='skeleton-line w40' />
              <View className='skeleton-line w90' style={{ marginTop: 12 }} />
              <View className='skeleton-line w70' style={{ marginTop: 8 }} />
              <View className='skeleton-line w50' style={{ marginTop: 8 }} />
            </View>
            <View className='glass-section'>
              <View className='skeleton-line w40' />
              <View className='skeleton-line w90' style={{ marginTop: 12 }} />
            </View>
          </View>
        </View>
        <View className='recipe-bottom-bar'>
          <View className='skeleton-bar-btn' />
        </View>
      </View>
    );
  }

  if (error || !dish) {
    return (
      <View className='recipe-page' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
        <View className='custom-nav' style={{ height: storeTopMargin }}>
          <View className='nav-back' onClick={() => Taro.navigateBack()}>
            <Text className='nav-back-icon'>‹</Text>
          </View>
          <Text className='custom-nav-title'>商品详情</Text>
        </View>
        <View className='recipe-error'>
          <Text>{error || '菜品不存在'}</Text>
          <Text className='error-btn' onClick={() => Taro.navigateBack()}>← 返回</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='recipe-page' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
      <View className='custom-nav' style={{ height: storeTopMargin }}>
        <View className='nav-back' onClick={() => Taro.navigateBack()}>
          <Text className='nav-back-icon'>‹</Text>
        </View>
        <Text className='custom-nav-title'>商品详情</Text>
      </View>

      <View className='recipe-scroll'>
        <View className='recipe-scroll-inner'>
        <View className='dish-hero'>
          {dish.image ? (
            <Swiper
              className='dish-hero-swiper'
              indicatorColor='rgba(255,255,255,0.4)'
              indicatorActiveColor='#fff'
              circular
              indicatorDots
            >
              {dish.image.split(',').map((img, idx) => (
                <SwiperItem key={idx}>
                  <SafeImage
                    className='dish-hero-img'
                    src={img.trim()}
                    mode='aspectFill'
                    onClick={() => {
                      const urls = dish.image.split(',').map(u => getImageUrl(u.trim()));
                      Taro.previewImage({ current: urls[idx], urls });
                    }}
                  />
                </SwiperItem>
              ))}
            </Swiper>
          ) : (
            <Text>🍽️</Text>
          )}
        </View>

        <View className='glass-section dish-summary'>
          <Text className='dish-name'>{dish.name}</Text>
          <Text className='dish-price'>{formatPrice(dish.price)}</Text>
          {dish.description && <Text className='dish-desc'>{dish.description}</Text>}
        </View>

        <View className='glass-section'>
          <Text className='section-title'>📖 做法</Text>
          {dish.recipe ? (
            <Text className='recipe-content'>{dish.recipe}</Text>
          ) : (
            <Text className='recipe-empty'>暂无做法说明</Text>
          )}
        </View>

        <View className='glass-section'>
          <Text className='section-title'>
            ⭐ 评价 {avgRating > 0 ? <Text className='rating-avg'>{avgRating}</Text> : ''}
          </Text>
          {reviews.length === 0 ? (
            <Text className='recipe-empty'>暂无评价</Text>
          ) : (
            reviews.map(r => (
              <View key={r.id} className='review-item'>
                <View className='review-header'>
                  <Text className='review-user'>{r.nickname || '匿名用户'}</Text>
                  <Text className='review-stars'>{'⭐'.repeat(r.rating)}</Text>
                  <Text className='review-time'>{r.created_at?.slice(0, 10)}</Text>
                </View>
                {r.content && <Text className='review-content'>{r.content}</Text>}
              </View>
            ))
          )}
        </View>
        </View>
      </View>

      <View className='recipe-bottom-bar'>
        <View className='add-cart-btn' onClick={addToCart}>加入购物车</View>
      </View>
    </View>
  );
}
