import { FC, PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { login } from './utils/user'
import { initDatabase } from './utils/db'
import { getEconomyConfig } from './utils/economy'

import './app.scss'

const App: FC<PropsWithChildren> = ({ children }) => {
    useLaunch(() => {
        console.log('App launched.')
        initDatabase()
        login()

        // Economy logs as per dev_spec.md
        const eco = getEconomyConfig()
        console.log(`[Economy] P_MAX: ${eco.P_MAX}, DAYS_TO_CAP: ${eco.DAYS_TO_CAP}`)
        console.log(`[Economy] Derived G_DAILY: ${eco.G_DAILY.toFixed(2)} pts/day`)
        console.log(`[Economy] Derived LAMBDA: ${eco.LAMBDA.toExponential(2)}`)
        console.log(`[Economy] Target per game (3 games/day): ~${eco.targetPerGame.toFixed(2)} pts`)
    })

    return <>{children}</>
}

export default App
