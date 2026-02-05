import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'

const STATE = {
    ENTRY: 'ENTRY',
    INSTANT_WIN: 'INSTANT_WIN',
    GAME_ENCOUNTER: 'GAME_ENCOUNTER'
}

const SVG_GAMEPAD = "data:image/svg+xml,%3Csvg%20fill%3D%22%23e11d48%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M17%206H7c-3%200-5.1%202.5-5%205.5C2.1%2014.4%204.5%2017%207.5%2017h9c3%200%205.4-2.6%205.5-5.5.1-3-2-5.5-5-5.5zM7.5%2014c-1.4%200-2.5-1.1-2.5-2.5S6.1%209%207.5%209s2.5%201.1%202.5%202.5S8.9%2014%207.5%2014zm10.5-1c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201zm-2-2c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201zm0%204c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201zm2%200c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201z%22%2F%3E%3C%2Fsvg%3E"

const SVG_GIFT = "data:image/svg+xml,%3Csvg%20fill%3D%22%23f59e0b%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%202l2.4%207.2h7.6l-6%204.8%202.4%207.2-6-4.8-6%204.8%202.4-7.2-6-4.8h7.6z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"

const SVG_GAME_ICON = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22%23e11d48%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M14.828%2014.828a4%204%200%2001-5.656%200M9%2010h.01M15%2010h.01M21%2012a9%209%200%2011-18%200%209%209%200%200118%200z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
const SVG_CLOSE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E"
const SVG_PLAY = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M14.752%2011.168l-3.197-2.132A1%201%200%200010%209.87v4.263a1%201%200%20001.555.832l3.197-2.132a1%201%200%20000-1.664z%22%20%2F%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M21%2012a9%209%200%2011-18%200%209%209%200%200118%200z%22%20%2F%3E%3C%2Fsvg%3E"
const SVG_EYE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M15%2012a3%203%200%2011-6%200%203%203%200%20016%200z%22%20%2F%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M2.458%2012C3.732%207.943%207.523%205%2012%205c4.478%200%208.268%202.943%209.542%207-1.274%204.057-5.064%207-9.542%207-4.477%200-8.268-2.943-9.542-7z%22%20%2F%3E%3C%2Fsvg%3E"
const SVG_THUNDER = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M13%2010V3L4%2014h7v7l9-11h-7z%22%20%2F%3E%3C%2Fsvg%3E"

export default function Earn() {
    const [viewState, setViewState] = useState(STATE.ENTRY)

    const router = Taro.useRouter()
    const autoStart = router.params.autoStart === 'true'

    useEffect(() => {
        if (autoStart) {
            handleStart()
        }
    }, [autoStart])

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
        Taro.reLaunch({ url: '/pages/index/index' })
    }

    const handleViewResult = () => {
        Taro.redirectTo({
            url: '/pages/result/instant/index'
        });
    }

    return (
        <View className="block">
            {viewState === STATE.ENTRY && (
                <View className="page-padding text-center flex flex-col h-screen box-border p-6 pt-10 items-center">
                    <View className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center active:bg-slate-200" onClick={goHome}>
                        <Image src={SVG_CLOSE} className="w-5 h-5 text-slate-400" />
                    </View>

                    <View className="flex-1 flex flex-col items-center justify-center w-full">
                        <View className="w-32 h-32 bg-slate-50 rounded-[40px] border-4 border-white shadow-xl flex items-center justify-center mb-6 relative">
                            {/* Gradient Overlay */}
                            <View className="absolute inset-0 rounded-[44px] bg-gradient-to-tr from-rose-50 to-white opacity-50 pointer-events-none"></View>

                            {/* Gamepad Icon - Using URL Encoded SVG for reliability */}
                            <View className="animate-float">
                                <Image
                                    src={SVG_GAMEPAD}
                                    className="w-24 h-24"
                                    style={{ width: '96px', height: '96px' }}
                                />
                            </View>
                        </View>
                        <Text className="text-2xl font-black text-slate-900 mb-2">准备好了吗？</Text>
                        <Text className="text-sm text-slate-400 px-8 leading-relaxed">点击开始，系统将为你随机匹配{'\n'}一个小挑战或惊喜奖励。</Text>
                    </View>

                    <Button
                        className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#e11d48] to-[#be123c] shadow-glow active:scale-95 transition-transform flex items-center justify-center mb-6 border-none outline-none"
                        onClick={handleStart}
                    >
                        <Image src={SVG_PLAY} className="w-6 h-6 text-white mr-2" />
                        <Text className="text-white text-xl font-black">开始</Text>
                    </Button>
                </View>
            )}

            {viewState === STATE.INSTANT_WIN && (
                <View className="page-padding text-center flex flex-col h-screen box-border p-6 pt-10 items-center bg-amber-50">
                    <View className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center active:bg-slate-200" onClick={goHome}>
                        <Image src={SVG_CLOSE} className="w-5 h-5 text-slate-600" />
                    </View>

                    <View className="flex-1 flex flex-col items-center justify-center w-full">
                        <View className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 border-4 border-amber-200 animate-pulse-glow">
                            <Image
                                src={SVG_GIFT}
                                className="w-20 h-20"
                            />
                        </View>
                        <Text className="text-3xl font-black text-amber-600 mb-2">惊喜时刻！</Text>
                        <Text className="text-sm text-amber-800 font-bold opacity-70">无需游戏，直接获分</Text>
                    </View>

                    <Button
                        className="w-full py-5 rounded-2xl bg-amber-500 text-white shadow-lg text-xl font-black mb-6 active:scale-95 transition-transform flex items-center justify-center border-none outline-none"
                        onClick={handleViewResult}
                    >
                        <Image src={SVG_EYE} className="w-6 h-6 text-white mr-2" />
                        <Text>查看结果</Text>
                    </Button>
                </View>
            )}

            {viewState === STATE.GAME_ENCOUNTER && (
                <View className="page-padding text-center flex flex-col h-screen box-border p-6 pt-10 items-center bg-rose-50">
                    <View className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center active:bg-slate-200" onClick={goHome}>
                        <Image src={SVG_CLOSE} className="w-5 h-5 text-slate-600" />
                    </View>

                    <View className="flex-1 flex flex-col items-center justify-center w-full">
                        <View className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 border-4 border-rose-200 relative animate-float">
                            <View className="absolute -top-3 px-3 py-1 bg-amber-400 text-amber-900 text-sm font-black uppercase tracking-widest rounded-full shadow-sm z-10">
                                新游戏解锁
                            </View>
                            {/* Game Icon */}
                            <Image
                                src={SVG_GAME_ICON}
                                className="w-20 h-20"
                            />
                        </View>
                        <Text className="text-3xl font-black text-rose-600 mb-2">疯狂炒鸡</Text>
                        <Text className="text-sm text-rose-800 font-bold opacity-70">首次挑战 · 难度 ★★★</Text>
                    </View>

                    <Button
                        className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#e11d48] to-[#be123c] shadow-glow text-white text-xl font-black mb-6 active:scale-95 transition-transform flex items-center justify-center border-none outline-none"
                        onClick={() => Taro.reLaunch({ url: '/pages/game/index' })}
                    >
                        <Image src={SVG_THUNDER} className="w-6 h-6 text-white mr-2" />
                        <Text>开始挑战</Text>
                    </Button>
                </View>
            )}
        </View>
    )
}
