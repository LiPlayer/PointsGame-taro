import { Text } from '@tarojs/components'
import { FC, ReactNode } from 'react'

interface LabelCapsProps {
    className?: string
    children: ReactNode
}

const LabelCaps: FC<LabelCapsProps> = ({ className = '', children }) => (
    <Text className={`text-[10px] font-extrabold tracking-widest uppercase text-slate-400 ${className}`}>
        {children}
    </Text>
)

// @ts-ignore
LabelCaps.options = {
    addGlobalClass: true
}

export default LabelCaps
