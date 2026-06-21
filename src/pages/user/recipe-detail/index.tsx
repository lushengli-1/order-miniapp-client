import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { dishAPI, cartAPI } from '../../../services/api';
import { formatPrice, getImageUrl } from '../../../utils';
import './index.scss';

interface DishDetail {
  id: number; name: string; image: string; price: number;
  original_price: number; description: string; recipe: string;
  unit: string; sales: number; stock: number;
}

export default function RecipeDetail() {
  const [dish, setDish] = useState<DishDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    } catch (err) {
      setLoading(false);
      setError('菜品不存在');
    }
  }

  async function addToCart() {
    if (!dish) return;
    try {
      await cartAPI.addToCart(dish.id);
      Taro.showToast({ title: '已加入购物车', icon: 'success', duration: 800 });
    } catch (err) {
      Taro.showToast({ title: '加入失败', icon: 'none' });
    }
  }

  if (loading) {
    return <View className='recipe-page'><View className='recipe-loading'><Text>加载中...</Text></View></View>;
  }

  if (error || !dish) {
    return (
      <View className='recipe-page'>
        <View className='recipe-error'>
          <Text>{error || '菜品不存在'}</Text>
          <Text className='error-btn' onClick={() => Taro.navigateBack()}>← 返回</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='recipe-page'>
      <ScrollView scrollY>
        <View className='dish-hero'>
          {dish.image ? (
            <Image className='dish-hero-img' src={getImageUrl(dish.image)} mode='aspectFill' />
          ) : (
            <Text>🍽️</Text>
          )}
        </View>

        <View className='dish-summary'>
          <Text className='dish-name'>{dish.name}</Text>
          <Text className='dish-price'>{formatPrice(dish.price)}</Text>
          {dish.description && <Text className='dish-desc'>{dish.description}</Text>}
        </View>

        <View className='recipe-section'>
          <Text className='section-title'>📖 做法</Text>
          {dish.recipe ? (
            <Text className='recipe-content'>{dish.recipe}</Text>
          ) : (
            <Text className='recipe-empty'>暂无做法说明</Text>
          )}
        </View>
      </ScrollView>

      <View className='recipe-bottom-bar'>
        <View className='add-cart-btn' onClick={addToCart}>加入购物车</View>
      </View>
    </View>
  );
}
