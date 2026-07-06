import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';

export function useNavBarHeight() {
  const [height, setHeight] = useState(44);
  useEffect(() => {
    try {
      const sys = Taro.getSystemInfoSync();
      const sb = sys.statusBarHeight || 0;
      if (typeof Taro.getMenuButtonBoundingClientRect === 'function') {
        const menu = Taro.getMenuButtonBoundingClientRect();
        setHeight(((menu.top - sb) * 2 + menu.height) + sb);
      } else {
        setHeight(sb + 44);
      }
    } catch (_) {
      setHeight(44);
    }
  }, []);
  return height;
}
