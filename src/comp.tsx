import { View, Slot } from '@tarojs/components'
import { FC } from 'react'

const Comp: FC = () => (
    <View className="contents">
        <Slot />
    </View>
)

export default Comp
