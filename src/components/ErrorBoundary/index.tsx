import { Component, ReactNode } from 'react';
import { View, Text } from '@tarojs/components';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style='display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;'>
          <Text style='font-size:32px;color:#8C857B;'>页面出错了</Text>
          <Text style='font-size:24px;color:#BFB8AD;margin-top:12px;' onClick={() => this.setState({ hasError: false })}>点击重试</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
