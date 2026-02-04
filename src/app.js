import { useLaunch } from '@tarojs/taro'
import { login } from './utils/user'
import { initDatabase } from './utils/db'

import './app.scss'

function App({ children }) {
  useLaunch(() => {
    console.log('App launched.')
    initDatabase()
    login()
  })

  return children
}

export default App
