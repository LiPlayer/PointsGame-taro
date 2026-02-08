import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import type * as PixiTypes from 'pixi.js'

export type PixiModule = typeof import('pixi.js')

const getDpr = () => {
    // WeChat Mini-program deprecated getSystemInfoSync in favor of newer specific APIs.
    if (process.env.TARO_ENV === 'weapp') {
        try {
            const win = Taro.getWindowInfo()
            return win.pixelRatio || 1
        } catch (e) {
            // Fallback for older versions
            return Taro.getSystemInfoSync().pixelRatio || 1
        }
    }

    const sys = Taro.getSystemInfoSync()
    if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
        return window.devicePixelRatio || sys.pixelRatio || 1
    }
    return sys.pixelRatio || 1
}

export const readCanvasInfo = async (id: string) => {
    const dpr = getDpr()

    if (process.env.TARO_ENV === 'weapp') {
        return new Promise((resolve) => {
            Taro.createSelectorQuery()
                .select(`#${id}`)
                .fields({ node: true, size: true, rect: true })
                .exec((res) => {
                    const info = res && res[0]
                    if (!info || !info.node) {
                        resolve(null)
                        return
                    }

                    const width = Number(info.width || (info.rect && info.rect.width) || 0)
                    const height = Number(info.height || (info.rect && info.rect.height) || 0)
                    if (!width || !height) {
                        resolve(null)
                        return
                    }

                    const canvas = info.node as any
                    // Weapp 'size: true' returns CSS Pixels (327 not 981). Correct.
                    // So we do NOT divide by DPR.
                    const logicalW = width
                    const logicalH = height
                    resolve({ canvas, width: logicalW, height: logicalH, dpr })
                })
        })
    }

    if (typeof document === 'undefined') {
        return null
    }

    const raw = document.getElementById(id) as HTMLElement | null
    if (!raw) return null

    let canvasEl: HTMLCanvasElement | null = null
    if (typeof (raw as any).getContext === 'function') {
        canvasEl = raw as unknown as HTMLCanvasElement
    } else if (typeof raw.querySelector === 'function') {
        const found = raw.querySelector('canvas') as HTMLCanvasElement | null
        if (found && typeof (found as any).getContext === 'function') {
            canvasEl = found
        }
    }

    if (!canvasEl) return null

    const rectDom = raw.getBoundingClientRect()
    if (!rectDom.width || !rectDom.height) return null

    return {
        canvas: canvasEl,
        width: rectDom.width,
        height: rectDom.height,
        dpr
    }
}

const installUnsafeEval = async (PIXI: PixiModule) => {
    if (process.env.TARO_ENV === 'weapp') {
        const mod = await import('../libs/pixi-unsafe-eval')
        const unsafeEval = (mod as { default?: (pi: PixiModule) => void }).default || (mod as any)
        if (typeof unsafeEval === 'function') {
            unsafeEval(PIXI)
        }
        return
    }

    await import('@pixi/unsafe-eval')
}

export const ensurePixiModule = async (canvas: any) => {
    if (process.env.TARO_ENV === 'weapp') {
        const { createPIXI } = await import('pixi-miniprogram')
        if (canvas) {
            // FORCE stencil buffer by pre-initializing the context.
            // PIXI internally calls getContext('webgl') or getContext('2d').
            // By calling getContext('webgl', { stencil: true }) first, we force the created context to have a stencil buffer.
            try {
                // Some Android devices need premultipliedAlpha: false for correct transparency in WeChat.
                canvas.getContext('webgl', {
                    stencil: true,
                    depth: true,
                    antialias: true,
                    alpha: true,
                    premultipliedAlpha: false
                })
            } catch (e) {
                console.warn('WebGL pre-init failed, falling back to default', e)
            }
        }
        const PIXI = createPIXI(canvas) as PixiModule
        if ((PIXI as any).settings && (PIXI as any).ENV) {
            // Default to WebGL1 on weapp for maximum compatibility and to dodge "Invalid context type [webgl2]" warnings.
            ; (PIXI as any).settings.PREFER_ENV = (PIXI as any).ENV.WEBGL
            // Attempt to force transparency in default render options as well
            if ((PIXI as any).settings.RENDER_OPTIONS) {
                const ro = (PIXI as any).settings.RENDER_OPTIONS
                ro.stencil = true
                ro.transparent = true
                ro.backgroundAlpha = 0
                ro.backgroundColor = 0xffffff // White fallback instead of black
            }
        }
        await installUnsafeEval(PIXI)
        return PIXI
    }

    const mod = await import('pixi.js')
    if (process.env.TARO_ENV === 'h5') {
        await installUnsafeEval(mod as PixiModule)
    }
    return mod as PixiModule
}

export const nextTick = () =>
    new Promise<void>((resolve) => {
        if (typeof Taro.nextTick === 'function') {
            Taro.nextTick(() => resolve())
        } else {
            setTimeout(() => resolve(), 0)
        }
    })

/**
 * Custom hook to manage PixiJS application lifecycle in Taro (H5 & Weapp)
 */
export const usePixi = (canvasId: string) => {
    const [app, setApp] = useState<PixiTypes.Application | null>(null)
    const [pixi, setPixi] = useState<PixiModule | null>(null)

    useEffect(() => {
        let cancelled = false
        let createdApp: PixiTypes.Application | null = null
        const init = async () => {
            let info = await readCanvasInfo(canvasId)
            if (!info) {
                await nextTick()
                info = await readCanvasInfo(canvasId)
            }
            if (!info || cancelled) return

            const PIXI = await ensurePixiModule((info as any).canvas)
            if (!PIXI || cancelled) return

            createdApp = new PIXI.Application({
                view: (info as any).canvas,
                width: (info as any).width,
                height: (info as any).height,
                resolution: process.env.TARO_ENV === 'weapp' ? 1.5 : Math.min((info as any).dpr || 1, 2),
                backgroundColor: 0xffffff,
                backgroundAlpha: 0,
                autoDensity: true,
                antialias: false,
                stencil: true
            } as any)

            if (createdApp && createdApp.renderer) {
                console.log('usePixi: Renderer type:', createdApp.renderer.type === (PIXI as any).RENDERER_TYPE.WEBGL ? 'WebGL' : 'Canvas')
            }

            if (!cancelled) {
                setPixi(PIXI)
                setApp(createdApp)
            }
        }

        init()

        return () => {
            cancelled = true
            console.log('usePixi: hook cleanup, destroying app')
            if (createdApp) {
                try {
                    createdApp.destroy(true, {
                        children: true,
                        texture: true,
                        baseTexture: true
                    })
                } catch (e) {
                    console.warn('usePixi: Error during app destroy', e)
                }
            }
            setApp(null)
            setPixi(null)
        }
    }, [canvasId])

    return { app, pixi }
}
