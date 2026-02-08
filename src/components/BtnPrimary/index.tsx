import { View } from '@tarojs/components'
import { FC, ReactNode } from 'react'

interface BtnPrimaryProps {
    className?: string
    onClick?: () => void
    children: ReactNode
}

const BtnPrimary: FC<BtnPrimaryProps> = ({ className = '', onClick, children }) => (
    <View
        hoverClass="none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className={`w-full py-5 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-[0_10px_20px_-5px_rgba(225,29,72,0.4)] active:scale-[0.98] transition-transform font-black flex items-center justify-center gap-2 ${className}`}
        onClick={onClick}
    >
        {children}
    </View>
)

// @ts-ignore
BtnPrimary.options = {
    addGlobalClass: true
}

export default BtnPrimary
