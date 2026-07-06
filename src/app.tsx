import { Component, PropsWithChildren } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import './app.scss';

class App extends Component<PropsWithChildren> {
  componentDidMount() {}

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return <ErrorBoundary>{this.props.children}</ErrorBoundary>;
  }
}

export default App;
