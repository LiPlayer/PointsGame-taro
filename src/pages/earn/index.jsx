import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'

const STATE = {
    ENTRY: 'ENTRY',
    INSTANT_WIN: 'INSTANT_WIN',
    GAME_ENCOUNTER: 'GAME_ENCOUNTER'
}

export default function Earn() {
    const [viewState, setViewState] = useState(STATE.ENTRY)

    // Random logic: 30% Instant Win, 70% Game Encounter
    const handleStart = () => {
        const random = Math.random()
        if (random < 0.3) {
            setViewState(STATE.INSTANT_WIN)
        } else {
            setViewState(STATE.GAME_ENCOUNTER)
        }
    }

    const goHome = () => {
        Taro.navigateBack()
    }

    // --- RENDERERS ---

    const renderEntry = () => (
        <View className="page-padding text-center flex flex-col h-screen box-border p-6 pt-12 items-center">
            <View className="absolute top-6 left-6 p-2 rounded-full bg-slate-100 text-slate-400" onClick={goHome}>
                <Text className="text-xl font-bold">✕</Text>
            </View>

            <View className="flex-1 flex flex-col items-center justify-center w-full">
                <View className="w-48 h-48 bg-slate-50 rounded-[48px] border-4 border-white shadow-xl flex items-center justify-center mb-8 relative">
                    {/* Gradient Overlay */}
                    <View className="absolute inset-0 rounded-[44px] bg-gradient-to-tr from-rose-50 to-white opacity-50 pointer-events-none"></View>

                    {/* Gamepad Icon - Using URL Encoded SVG for reliability */}
                    <View className="animate-float">
                        <Image
                            src="data:image/svg+xml,%3Csvg%20fill%3D%22%23e11d48%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M17%206H7c-3%200-5.1%202.5-5%205.5C2.1%2014.4%204.5%2017%207.5%2017h9c3%200%205.4-2.6%205.5-5.5.1-3-2-5.5-5-5.5zM7.5%2014c-1.4%200-2.5-1.1-2.5-2.5S6.1%209%207.5%209s2.5%201.1%202.5%202.5S8.9%2014%207.5%2014zm10.5-1c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201zm-2-2c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201zm0%204c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201zm2%200c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201z%22%2F%3E%3C%2Fsvg%3E"
                            className="w-24 h-24"
                            style={{ width: '96px', height: '96px' }}
                        />
                    </View>
                </View>
                <Text className="text-2xl font-black text-slate-900 mb-2">准备好了吗？</Text>
                <Text className="text-sm text-slate-400 px-8 leading-relaxed">点击开始，系统将为你随机匹配<br />一个小挑战或惊喜奖励。</Text>
            </View>

            <View
                className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#e11d48] to-[#be123c] shadow-glow active:scale-95 transition-transform flex items-center justify-center mb-6"
                onClick={handleStart}
            >
                <Text className="text-white text-xl font-black">开始</Text>
            </View>
        </View>
    )

    const renderInstantWin = () => (
        <View className="page-padding text-center flex flex-col h-screen box-border p-6 pt-12 items-center bg-amber-50">
            <View className="absolute top-6 left-6 p-2 rounded-full bg-white/50 text-slate-600" onClick={goHome}>
                <Text className="text-xl font-bold">✕</Text>
            </View>

            <View className="flex-1 flex flex-col items-center justify-center w-full">
                <View className="w-40 h-40 bg-white rounded-full flex items-center justify-center shadow-lg mb-8 border-4 border-amber-200">
                    <Image
                        src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZjU5ZTBYiB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDJsMi40IDcuMmg3LjZsLTYgNC44IDIuNCA3LjItNi00LjgtNiA0LjggMi40LTcuMi02LTQuOGg3LjZ6Ij48L3BhdGg+PC9zdmc+"
                        className="w-20 h-20 animate-spin-slow" // Note: spin-slow might need custom config, fallback to default spin or pulse
                        style={{ animationDuration: '3s' }}
                    />
                </View>
                <Text className="text-3xl font-black text-amber-600 mb-2">惊喜时刻！</Text>
                <Text className="text-sm text-amber-800 font-bold opacity-70">无需游戏，直接获分</Text>
            </View>

            <View
                className="w-full py-5 rounded-2xl bg-amber-500 text-white shadow-lg text-xl font-black mb-6 active:scale-95 transition-transform flex items-center justify-center"
                onClick={() => Taro.reLaunch({ url: '/pages/result/index' })}
            >
                <Text>查看结果</Text>
            </View>
        </View>
    )

    const renderGameEncounter = () => (
        <View className="page-padding text-center flex flex-col h-screen box-border p-6 pt-12 items-center bg-rose-50">
            <View className="absolute top-6 left-6 p-2 rounded-full bg-white/50 text-slate-600" onClick={goHome}>
                <Text className="text-xl font-bold">✕</Text>
            </View>

            <View className="flex-1 flex flex-col items-center justify-center w-full">
                <View className="w-40 h-40 bg-white rounded-full flex items-center justify-center shadow-lg mb-8 border-4 border-rose-200 relative">
                    <View className="absolute -top-3 px-3 py-1 bg-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm z-10">
                        新游戏解锁
                    </View>
                    {/* Game Icon */}
                    <Image
                        src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBzdHJva2U9IiNlMTFkNDgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xNC44MjggMTQuODI4YTQgNCAwIDAxLTUuNjU2IDBNOSAxMGguMDFNMTUgMTBoLjAxTTIxIDEyYTkgOSAwIDExLTE4IDAgOSA5IDAgMDExOCAweiI+PC9wYXRoPjwvc3ZnPg=="
                        className="w-20 h-20"
                    />
                </View>
                <Text className="text-3xl font-black text-rose-600 mb-2">疯狂炒鸡</Text>
                <Text className="text-sm text-rose-800 font-bold opacity-70">首次挑战 · 难度 ★★★</Text>
            </View>

            <View
                className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#e11d48] to-[#be123c] shadow-glow text-white text-xl font-black mb-6 active:scale-95 transition-transform flex items-center justify-center"
                onClick={() => Taro.reLaunch({ url: '/pages/game/index' })}
            >
                <Text>开始挑战</Text>
            </View>
        </View>
    )

    switch (viewState) {
        case STATE.INSTANT_WIN:
            return renderInstantWin()
        case STATE.GAME_ENCOUNTER:
            return renderGameEncounter()
        case STATE.ENTRY:
        default:
            return renderEntry()
    }
}
