import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { dishAPI, cartAPI, favoriteAPI, reviewAPI } from '../../../services/api';
import { formatPrice, getImageUrl } from '../../../utils';
import SafeImage from '../../../components/SafeImage';
import { useNavBarHeight } from '../../../hooks/useNavBarHeight';
import './index.scss';

interface Category {
  id: number; name: string;
}

interface Dish {
  id: number; category_id: number; name: string; image: string;
  price: number; original_price: number; description: string; sales: number;
  stock: number; is_recommend: number; unit: string;
}

interface CartItem {
  dish_id: number; name: string; image: string; price: number; quantity: number;
}

export default function Home() {
  const storeTopMargin = useNavBarHeight();

const [storeInfo, setStoreInfo] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [showPopular, setShowPopular] = useState(true);
  const [popularDishes, setPopularDishes] = useState<Dish[]>([]);
  const [reviewStats, setReviewStats] = useState<Record<number, { count: number; avg: number }>>({});

  useEffect(() => {
    loadPageData();
  }, []);

  useDidShow(() => {
    loadPageData();
  });

  function loadPageData() {
    // 商家跳转到营业概览
    const u = Taro.getStorageSync('user');
    if (u?.role === 1) {
      Taro.redirectTo({ url: '/pages/merchant/dashboard/index' });
      return;
    }
    // 从本地存储恢复购物车数据（即时显示）
    const savedCart = Taro.getStorageSync('cart_items') || [];
    setCart(savedCart);

    const token = Taro.getStorageSync('token');
    loadData();
    if (token) syncCartFromServer();
  }

  async function syncCartFromServer() {
    try {
      const items = await cartAPI.getCart();
      const serverCart = items.map(item => ({
        dish_id: item.dish_id, name: item.name, image: item.image,
        price: item.price, quantity: item.quantity, stock: item.stock
      }));
      if (serverCart.length > 0) {
        setCart(serverCart);
        Taro.setStorageSync('cart_items', serverCart);
      }
    } catch (err) {
      // 服务端同步失败，本地存储的数据已展示
    }
  }

  async function loadData() {
    try {
      const [storeInfo, categories, dishes] = await Promise.all([
        dishAPI.getStoreInfo(),
        dishAPI.getCategories(),
        dishAPI.getDishes()
      ]);
      setStoreInfo(storeInfo);
      setCategories(categories);
      setDishes(dishes);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
    dishAPI.getPopularDishes().then(setPopularDishes).catch(() => {});
    if (Taro.getStorageSync('token')) {
      loadFavorites();
    }
    loadReviewStats();
  }

  async function loadFavorites() {
    try {
      const list = await favoriteAPI.getFavorites();
      setFavorites(new Set(list.map((f: any) => f.id)));
    } catch (_) {}
  }

  async function loadReviewStats() {
    try {
      const stats = await reviewAPI.getReviewStats();
      const map: Record<number, { count: number; avg: number }> = {};
      for (const s of stats) {
        map[s.dish_id] = { count: s.count, avg: s.avg_rating };
      }
      setReviewStats(map);
    } catch (_) {}
  }

  const filteredDishes = useMemo(
    () => {
      if (isSearching) return dishes;
      if (showPopular) return popularDishes.length > 0 ? popularDishes : dishes;
      if (showFavorites) return dishes.filter(d => favorites.has(d.id));
      return dishes.filter(d => d.category_id === activeCategory);
    },
    [dishes, activeCategory, isSearching, favorites, showFavorites, showPopular, popularDishes]
  );

  function toggleFavorite(dishId: number) {
    const newFavs = new Set(favorites);
    if (newFavs.has(dishId)) {
      newFavs.delete(dishId);
      favoriteAPI.removeFavorite(dishId).catch(() => {});
    } else {
      newFavs.add(dishId);
      favoriteAPI.addFavorite(dishId).catch(() => {});
    }
    setFavorites(newFavs);
  }

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  function saveCartToStorage(newCart: CartItem[]) {
    Taro.setStorageSync('cart_items', newCart);
  }

  function addToCart(dish: Dish) {
    const token = Taro.getStorageSync('token');
    if (!token) {
      Taro.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => { if (res.confirm) Taro.switchTab({ url: '/pages/user/profile/index' }); }
      });
      return;
    }

    cartAPI.addToCart(dish.id).catch(() => {});

    const newCart = [...cart];
    const idx = newCart.findIndex(item => item.dish_id === dish.id);
    if (idx >= 0) {
      newCart[idx].quantity += 1;
    } else {
      newCart.push({ dish_id: dish.id, name: dish.name, image: dish.image, price: dish.price, quantity: 1 });
    }
    setCart(newCart);
    saveCartToStorage(newCart);
    Taro.showToast({ title: '已加入购物车', icon: 'success', duration: 800 });
  }

  function removeFromCart(dishId: number) {
    const newCart = [...cart];
    const idx = newCart.findIndex(item => item.dish_id === dishId);
    if (idx >= 0) {
      if (newCart[idx].quantity > 1) {
        newCart[idx].quantity -= 1;
        cartAPI.updateCart(dishId, newCart[idx].quantity).catch(() => {});
      } else {
        newCart.splice(idx, 1);
        cartAPI.updateCart(dishId, 0).catch(() => {});
      }
      setCart(newCart);
      saveCartToStorage(newCart);
    }
  }

  function onSearch() {
    if (keyword.trim()) {
      setIsSearching(true);
      dishAPI.searchDishes(keyword).then(dishes => {
        setDishes(dishes);
        setActiveCategory(0);
      });
    } else {
      setIsSearching(false);
      loadData();
    }
  }

  function goToCart() {
    if (cartCount === 0) {
      Taro.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    Taro.setStorageSync('cart_items', cart);
    Taro.switchTab({ url: '/pages/user/cart/index' });
  }

  // 商家跳转到营业概览
  const _u = Taro.getStorageSync('user');
  if (_u?.role === 1) {
    Taro.redirectTo({ url: '/pages/merchant/dashboard/index' });
    return null;
  }

  return (
    <View className='home' style={`background-image: url(${getImageUrl('/uploads/bg.jpg')})`}>
      <View className='custom-nav' style={{ height: storeTopMargin }}>
        <Text className='custom-nav-title'>{storeInfo?.name || '点餐'}</Text>
      </View>

      {storeInfo && (
        <View className='store-header'>
          <Text className='store-name'>{storeInfo.name}</Text>
          <Text className='store-notice'>{storeInfo.notice}</Text>
        </View>
      )}

     <View className='search-bar'>
        <Input
          className='search-input'
          placeholder='搜索你心仪的菜品'
          value={keyword}
          onInput={e => setKeyword(e.detail.value)}
          onConfirm={onSearch}
        />
        <Text className='search-btn' onClick={onSearch}>搜索</Text>
      </View>

      {loading ? (
        <View className='content'>
          <View className='category-sidebar'>
            {[1,2,3,4,5,6].map(i => (
              <View key={i} className='category-item-skeleton' />
            ))}
          </View>
          <View className='dish-list'>
            <View className='dish-list-inner'>
              {[1,2,3,4].map(i => (
                <View key={i} className='dish-card-skeleton'>
                  <View className='skeleton-img' />
                  <View className='skeleton-info'>
                    <View className='skeleton-line w60' />
                    <View className='skeleton-line w80' />
                    <View className='skeleton-line w40' />
                    <View className='skeleton-price-row'>
                      <View className='skeleton-line w30' />
                      <View className='skeleton-btn' />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View className='content'>
          <ScrollView className='category-sidebar' scrollY>
            <View
              className={`category-item ${showPopular ? 'active' : ''}`}
              onClick={() =>  {
                setIsSearching(false); setKeyword(''); setShowFavorites(false); setShowPopular(true);
                if (popularDishes.length === 0) {
                  dishAPI.getPopularDishes().then(setPopularDishes).catch(() => {});
                }
              }}
            >
              <Text>🔥 大家都爱</Text>
            </View>
            <View
              className={`category-item ${showFavorites ? 'active' : ''}`}
              onClick={() => { setIsSearching(false); setKeyword(''); setShowPopular(false); setShowFavorites(true); }}
            >
              <Text>收藏⭐️</Text>
            </View>
            {categories.map(cat => (
              <View
                key={cat.id}
                className={`category-item ${activeCategory === cat.id && !showFavorites && !showPopular ? 'active' : ''}`}
                onClick={() => { setIsSearching(false); setKeyword(''); setShowPopular(false); setShowFavorites(false); setActiveCategory(cat.id); }}
              >
                <Text>{cat.name}</Text>
              </View>
            ))}
          </ScrollView>

          <ScrollView className='dish-list' scrollY>
            <View className='dish-list-inner'>
              {filteredDishes.map(dish => (
                <View key={dish.id} className='dish-card' onClick={() => Taro.navigateTo({ url: `/pages/user/recipe-detail/index?id=${dish.id}` })}>
                  <View className='dish-img'>
                    {dish.image ? (
                      <SafeImage className='dish-img-content' src={dish.image.split(',')[0]} mode='aspectFill' />
                    ) : (
                      <Text className='dish-img-placeholder'>🍽️</Text>
                    )}
                    <Text className={`fav-btn ${favorites.has(dish.id) ? 'active' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleFavorite(dish.id); }}>
                      {favorites.has(dish.id) ? '⭐' : '☆'}
                    </Text>
                  </View>
                  <View className='dish-info'>
                    <Text className='dish-name'>{dish.name}</Text>
                    <Text className='dish-desc'>{dish.description}</Text>
                    <View className='dish-meta'>
                      <Text className='recipe-link' onClick={e => { e.stopPropagation(); Taro.navigateTo({ url: `/pages/user/recipe-detail/index?id=${dish.id}` }); }}>📖 做法</Text>
                      {reviewStats[dish.id] && (
                        <Text className='meta-rating' onClick={e => { e.stopPropagation(); Taro.navigateTo({ url: `/pages/user/recipe-detail/index?id=${dish.id}` }); }}>⭐ {reviewStats[dish.id].avg}</Text>
                      )}
                    </View>
                    <View className='dish-bottom'>
                      <Text className='price-current'>{formatPrice(dish.price)}</Text>
                      <View className='qty-control'>
                        {cart.some(c => c.dish_id === dish.id) && (
                          <Text className='qty-btn' onClick={e => { e.stopPropagation(); removeFromCart(dish.id); }}>-</Text>
                        )}
                        <Text className='qty-num'>
                          {cart.find(c => c.dish_id === dish.id)?.quantity || ''}
                        </Text>
                        <Text className='qty-btn primary' onClick={e => { e.stopPropagation(); addToCart(dish); }}>+</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              {filteredDishes.length === 0 && (
                <View className='empty'>
                  <Text className='empty-icon'>🥗</Text>
                  <Text className='empty-text'>{showFavorites ? '还没有收藏的菜品哦' : '大厨还在研究新菜谱～'}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <View className='cart-bar' onClick={goToCart}>
        <View className='cart-icon-wrapper'>
          <Text className='cart-icon'>🛒</Text>
          {cartCount > 0 && (
            <Text className='cart-badge'>{cartCount}</Text>
          )}
        </View>
        <View className='cart-info'>
          {cartCount > 0 ? (
            <Text className='cart-amount'>¥{cartAmount.toFixed(2)}</Text>
          ) : (
            <Text className='cart-empty-text'>购物车是空的</Text>
          )}
        </View>
        <View className={`cart-submit ${cartCount > 0 ? 'active' : ''}`} onClick={e => { e.stopPropagation(); goToCart(); }}>
          去结算
        </View>
      </View>
    </View>
  );
}
