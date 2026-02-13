import { Image, View } from '@tarojs/components'
import { FC, useMemo } from 'react'
import { getWeappCloseTopPx, isWeapp } from '@shared/utils/weappLayout'

const SVG_CLOSE =
    "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E"

interface NavCloseProps {
    className?: string
    onClick?: () => void
    alignToWeappMenu?: boolean
    theme?: 'light' | 'dark' | 'reverse'
}

const NavClose: FC<NavCloseProps> = ({
    className = '',
    onClick,
    alignToWeappMenu = true,
    theme = 'light'
}) => {
    const isInline = /\brelative\b/.test(className)
    const weappStyle = useMemo(() => {
        if (!alignToWeappMenu) return undefined
        if (!isWeapp()) return undefined
        if (isInline) return undefined

        return {
            top: `${getWeappCloseTopPx(40, 24)}px`
        } as any
    }, [alignToWeappMenu, isInline])

    const iconColor = useMemo(() => {
        if (theme === 'reverse' || theme === 'dark') return 'white'
        return 'currentColor'
    }, [theme])

    const iconSvg = useMemo(() => {
        const color = theme === 'reverse' || theme === 'dark' ? 'white' : '#94a3b8'
        return `data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22${encodeURIComponent(color)}%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E`
    }, [theme])

    return (
        <View
            hoverClass="btn-hover-bg"
            hoverStartTime={0}
            hoverStayTime={100}
            className={`absolute ${weappStyle ? '' : 'top-6'} left-6 w-10 h-10 rounded-full bg-slate-50 text-slate-400 cursor-pointer z-[100] flex items-center justify-center transition-snappy ${className}`}
            style={{ ...weappStyle, WebkitTapHighlightColor: 'transparent' }}
            onClick={(e) => {
                e.stopPropagation()
                onClick?.()
            }}
        >
            <Image src={iconSvg} className="w-5 h-5" />
        </View>
    )
}

// @ts-ignore
NavClose.options = {
    addGlobalClass: true
}

export default NavClose
