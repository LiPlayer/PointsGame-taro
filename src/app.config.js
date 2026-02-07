export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/earn-entry/index',
    'pages/earn-instant/index',
    'pages/earn-encounter/index',
    'pages/game/index',
    'pages/result-earn/index',
    'pages/result-instant/index',
    'pages/result-replay/index',
    'pages/share/index',
    'pages/pay-scan/index',
    'pages/pay-confirm/index',
    'pages/collection/index'
  ],
  entryPagePath: 'pages/home/index',
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black',
    navigationStyle: 'custom'
  },
  lazyCodeLoading: 'requiredComponents'
})
