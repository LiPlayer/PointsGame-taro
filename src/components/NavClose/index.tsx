import { Image, View } from '@tarojs/components'
import { FC } from 'react'

const SVG_CLOSE =
    "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E"

interface NavCloseProps {
    className?: string
    onClick?: () => void
}

const NavClose: FC<NavCloseProps> = ({ className = '', onClick }) => (
    <View
        className={`absolute top-6 left-6 p-2 rounded-full bg-slate-50 text-slate-400 cursor-pointer z-50 flex items-center justify-center active:bg-slate-100 hover:bg-slate-100 transition ${className}`}
        onClick={onClick}
    >
        <Image src={SVG_CLOSE} className="w-5 h-5" />
    </View>
)

// @ts-ignore
NavClose.options = {
    addGlobalClass: true
}

export default NavClose
