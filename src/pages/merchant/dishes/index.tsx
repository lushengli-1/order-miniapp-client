import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Input, Picker, Switch, Textarea, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { merchantAPI } from '../../../services/api';
import { formatPrice, getImageUrl } from '../../../utils';
import './index.scss';

interface Category {
  id: number; name: string;
}

interface Dish {
  id: number; category_id: number; category_name: string; name: string;
  image: string; price: number; original_price: number; description: string; recipe?: string;
  stock: number; sales: number; status: number; unit: string; is_recommend: number;
}

const DEFAULT_FORM = {
  category_id: 0, name: '', price: '', original_price: '', description: '', recipe: '',
  stock: '999', unit: '份', is_recommend: 0, status: 1, image: ''
};

const NAV_ITEMS = [
  { key: 'dashboard', label: '营业概览', icon: '📊', path: '/pages/merchant/dashboard/index' },
  { key: 'orders', label: '订单管理', icon: '📦', path: '/pages/merchant/orders/index' },
  { key: 'dishes', label: '菜品管理', icon: '🍽️', path: '/pages/merchant/dishes/index' },
  { key: 'settings', label: '店铺设置', icon: '⚙️', path: '/pages/merchant/settings/index' },
];

export default function MerchantDishes() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [dishes, categories] = await Promise.all([
        merchantAPI.getDishes(),
        merchantAPI.getCategories()
      ]);
      setDishes(dishes);
      setCategories(categories);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  }

  function showAddForm() {
    setShowForm(true);
    setEditingDish(null);
    setForm({ ...DEFAULT_FORM, category_id: categories[0]?.id || 0 });
  }

  function showEditForm(dish: Dish) {
    setShowForm(true);
    setEditingDish(dish);
    setForm({
      category_id: dish.category_id,
      name: dish.name,
      price: String(dish.price),
      original_price: String(dish.original_price),
      description: dish.description,
      recipe: dish.recipe || '',
      stock: String(dish.stock),
      unit: dish.unit,
      is_recommend: dish.is_recommend,
      status: dish.status,
      image: dish.image
    });
  }

  async function saveDish() {
    if (!form.name || !form.price) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      const data = {
        ...form,
        category_id: form.category_id || categories[0]?.id || 0
      };
      if (editingDish) {
        await merchantAPI.updateDish(editingDish.id, data);
        Taro.showToast({ title: '更新成功', icon: 'success' });
      } else {
        await merchantAPI.addDish(1, data);
        Taro.showToast({ title: '添加成功', icon: 'success' });
      }
      setShowForm(false);
      setEditingDish(null);
      setForm({ ...DEFAULT_FORM });
      loadData();
    } catch (err) {
      console.error(err);
      Taro.showToast({ title: '操作失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }

  function deleteDish(dish: Dish) {
    Taro.showModal({
      title: '确认删除',
      content: `确定删除「${dish.name}」吗？`,
      success: (res) => {
        if (res.confirm) {
          merchantAPI.deleteDish(dish.id).then(() => {
            Taro.showToast({ title: '删除成功', icon: 'success' });
            loadData();
          });
        }
      }
    });
  }

  function onCategoryChange(e: any) {
    const idx = e.detail.value;
    const category = categories[idx];
    if (category) {
      setForm(prev => ({ ...prev, category_id: category.id }));
    }
  }

  function chooseImage() {
    Taro.chooseImage({ count: 1 }).then(res => {
      setForm(prev => ({ ...prev, image: res.tempFilePaths[0] }));
    });
  }

  const categoryIndex = categories.findIndex(c => c.id === form.category_id);

  if (showForm) {
    return (
      <ScrollView className='dish-form-page' scrollY>
        <View className='dish-form-inner'>
          <View className='form-header'>
            <Text className='back-btn' onClick={() => setShowForm(false)}>← 返回</Text>
            <Text className='form-title'>{editingDish ? '编辑菜品' : '新增菜品'}</Text>
          </View>

          <View className='form-group'>
            <Text className='form-label'>菜品名称</Text>
            <Input className='form-input' placeholder='请输入菜品名称' value={form.name}
              onInput={e => setForm(prev => ({ ...prev, name: e.detail.value }))} />
          </View>

          <View className='form-group'>
            <Text className='form-label'>菜品分类</Text>
            <Picker mode='selector' range={categories.map(c => c.name)} value={categoryIndex < 0 ? 0 : categoryIndex}
              onChange={onCategoryChange}>
              <View className='form-input'>{categories[categoryIndex < 0 ? 0 : categoryIndex]?.name || '选择分类'}</View>
            </Picker>
          </View>

          <View className='form-group'>
            <Text className='form-label'>价格 (元)</Text>
            <Input className='form-input' placeholder='请输入价格' type='digit' value={form.price}
              onInput={e => setForm(prev => ({ ...prev, price: e.detail.value }))} />
          </View>

          <View className='form-group'>
            <Text className='form-label'>原价 (元)</Text>
            <Input className='form-input' placeholder='选填' type='digit' value={form.original_price}
              onInput={e => setForm(prev => ({ ...prev, original_price: e.detail.value }))} />
          </View>

          <View className='form-group'>
            <Text className='form-label'>描述</Text>
            <Input className='form-input' placeholder='选填' value={form.description}
              onInput={e => setForm(prev => ({ ...prev, description: e.detail.value }))} />
          </View>

          <View className='form-group'>
            <Text className='form-label'>做法说明</Text>
            <Textarea className='form-textarea' placeholder='输入烹饪步骤，支持换行' value={form.recipe}
              onInput={e => setForm(prev => ({ ...prev, recipe: e.detail.value }))} />
          </View>

          <View className='form-group'>
            <Text className='form-label'>库存</Text>
            <Input className='form-input' placeholder='默认999' type='number' value={form.stock}
              onInput={e => setForm(prev => ({ ...prev, stock: e.detail.value }))} />
          </View>

          <View className='form-group'>
            <Text className='form-label'>单位</Text>
            <Input className='form-input' placeholder='如：份、杯' value={form.unit}
              onInput={e => setForm(prev => ({ ...prev, unit: e.detail.value }))} />
          </View>

          <View className='form-group'>
            <Text className='form-label'>菜品图片</Text>
            <View className='image-picker' onClick={chooseImage}>
              {form.image ? (
                <Image className='image-preview-img' src={form.image} mode='aspectFill' />
              ) : (
                <Text className='image-placeholder'>+ 点击选择图片</Text>
              )}
            </View>
          </View>

          <View className='form-group switch-group'>
            <Text className='form-label'>推荐菜品</Text>
            <Switch checked={form.is_recommend === 1}
              onChange={e => setForm(prev => ({ ...prev, is_recommend: e.detail.value ? 1 : 0 }))} />
          </View>

          <View className='form-group switch-group'>
            <Text className='form-label'>上架</Text>
            <Switch checked={form.status === 1}
              onChange={e => setForm(prev => ({ ...prev, status: e.detail.value ? 1 : 0 }))} />
          </View>

          <View className='form-submit-btn' onClick={saveDish}>
            {editingDish ? '保存修改' : '添加菜品'}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View className='merchant-layout'>
      <View className='category-bar'>
        <Text className='category-title'>分类管理</Text>
        <View className='category-list'>
          {categories.map(cat => (
            <View key={cat.id} className='category-tag' onClick={() => {
              Taro.showModal({
                title: '重命名分类', content: cat.name,
                editable: true, placeholderText: '分类名称',
                success: (res) => {
                  if (res.confirm && res.content && res.content !== cat.name) {
                    merchantAPI.updateCategory(cat.id, { name: res.content }).then(() => loadData());
                  }
                }
              });
            }}>
              <Text>{cat.name}</Text>
              <Text className='category-del' onClick={e => {
                e.stopPropagation();
                Taro.showModal({
                  title: '删除分类', content: `确定删除「${cat.name}」吗？`,
                  success: (res) => {
                    if (res.confirm) {
                      merchantAPI.deleteCategory(cat.id).then(() => loadData());
                    }
                  }
                });
              }}> ✕</Text>
            </View>
          ))}
          <View className='category-tag add' onClick={() => Taro.showModal({
            title: '添加分类', content: '请输入分类名称',
            editable: true, placeholderText: '分类名称',
            success: (res) => {
              if (res.confirm && res.content) {
                merchantAPI.addCategory({ name: res.content }).then(() => loadData());
              }
            }
          })}>+</View>
        </View>
      </View>

      <ScrollView className='dish-list' scrollY>
        {dishes.map(dish => (
          <View key={dish.id} className='dish-card'>
            <View className='dish-main'>
              <View className='dish-img'>
                {dish.image ? (
                  <Image className='dish-img-content' src={getImageUrl(dish.image)} mode='aspectFill' />
                ) : (
                  <Text>🍽️</Text>
                )}
              </View>
              <View className='dish-info'>
                <Text className='dish-name'>{dish.name}</Text>
                <Text className='dish-category'>{dish.category_name}{dish.recipe ? ' 📝有做法' : ''}</Text>
                <Text className='dish-price'>{formatPrice(dish.price)}</Text>
              </View>
              <View className={`dish-status ${dish.status === 1 ? 'on' : 'off'}`}>
                {dish.status === 1 ? '上架' : '下架'}
              </View>
            </View>
            <View className='dish-actions'>
              <Text className='action-edit' onClick={() => showEditForm(dish)}>编辑</Text>
              <Text className='action-delete' onClick={() => deleteDish(dish)}>删除</Text>
            </View>
          </View>
        ))}
        <View style='height:120px'></View>
      </ScrollView>

      <View className='add-btn' onClick={showAddForm}>
        <Text>+ 添加菜品</Text>
      </View>

      <View className='merchant-nav'>
        {NAV_ITEMS.map(item => (
          <View
            key={item.key}
            className={`nav-item ${item.key === 'dishes' ? 'active' : ''}`}
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
