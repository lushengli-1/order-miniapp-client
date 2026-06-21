export default defineAppConfig({
  pages: [
    'pages/user/home/index',
    'pages/user/cart/index',
    'pages/user/orders/index',
    'pages/user/order-detail/index',
    'pages/user/profile/index',
    'pages/user/recipe-detail/index',
    'pages/merchant/dashboard/index',
    'pages/merchant/orders/index',
    'pages/merchant/dishes/index',
    'pages/merchant/settings/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ff6b35',
    navigationBarTitleText: '点餐',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#999',
    selectedColor: '#ff6b35',
    backgroundColor: '#fff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/user/home/index',
        text: '首页',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png'
      },
      {
        pagePath: 'pages/user/cart/index',
        text: '购物车',
        iconPath: 'assets/icons/cart.png',
        selectedIconPath: 'assets/icons/cart-active.png'
      },
      {
        pagePath: 'pages/user/orders/index',
        text: '订单',
        iconPath: 'assets/icons/orders.png',
        selectedIconPath: 'assets/icons/orders-active.png'
      },
      {
        pagePath: 'pages/user/profile/index',
        text: '我的',
        iconPath: 'assets/icons/profile.png',
        selectedIconPath: 'assets/icons/profile-active.png'
      }
    ]
  }
});
