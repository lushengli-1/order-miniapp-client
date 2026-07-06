import { useState, useEffect } from 'react';
import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getImageUrl } from '../../utils';

const cache: Record<string, string> = {};
const cacheKeys: string[] = [];
const pending: Record<string, Promise<string>> = {};
const MAX_CACHE = 50;

function loadImage(url: string): Promise<string> {
  if (cache[url]) return Promise.resolve(cache[url]);
  if (pending[url]) return pending[url];

  if (cacheKeys.length >= MAX_CACHE) {
    const key = cacheKeys.shift()!;
    delete cache[key];
  }

  pending[url] = new Promise((resolve) => {
    Taro.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          cache[url] = res.tempFilePath;
          cacheKeys.push(url);
          resolve(res.tempFilePath);
        } else {
          resolve(url);
        }
      },
      fail: () => resolve(url),
    });
  });
  return pending[url]!;
}

interface Props {
  src: string;
  className?: string;
  mode?: string;
  style?: string;
  onTap?: () => void;
  onClick?: () => void;
}

export default function SafeImage({ src, className, mode = 'aspectFill', style, onTap, onClick }: Props) {
  const [localSrc, setLocalSrc] = useState('');

  useEffect(() => {
    if (!src) return;
    const url = getImageUrl(src);
    loadImage(url).then(setLocalSrc);
  }, [src]);

  if (!localSrc) {
    return <View className={className}><Text>🍽️</Text></View>;
  }

  return (
    <Image
      src={localSrc}
      className={className}
      mode={mode as any}
      style={style}
      onTap={onTap}
      onClick={onClick}
    />
  );
}
