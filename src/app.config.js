export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/earn/index',
    'pages/collection/index',
    'pages/share/index',
    'pages/pay/index',
    'pages/game/index',
    'pages/result/index',
    'pages/result/instant/index'
  ],
  entryPagePath: 'pages/home/index',
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black',
    navigationStyle: 'custom'
  }
})
