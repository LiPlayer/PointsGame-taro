import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import type * as PixiTypes from 'pixi.js'

export type PixiModule = typeof import('pixi.js')

const getDpr = () => {
    const sys = Taro.getSystemInfoSync()
    if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
        return window.devicePixelRatio || sys.pixelRatio || 1
    }
    return sys.pixelRatio || 1
}

const scaleCanvas = (canvas: any, width: number, height: number, dpr: number) => {
    const safeWidth = Math.max(1, Math.floor(width))
    const safeHeight = Math.max(1, Math.floor(height))
    canvas.width = Math.floor(safeWidth * dpr)
    canvas.height = Math.floor(safeHeight * dpr)
}

const readCanvasInfo = async (id: string) => {
    const dpr = getDpr()

    if (process.env.TARO_ENV === 'weapp') {
        return new Promise((resolve) => {
            Taro.createSelectorQuery()
                .select(`#${id}`)
                .fields({ node: true, size: true, rect: true })
                .exec((res) => {
                    const info = res?.[0]
                    if (!info || !info.node) {
                        resolve(null)
                        return
                    }

                    const width = Number(info.width || info.rect?.width || 0)
                    const height = Number(info.height || info.rect?.height || 0)
                    if (!width || !height) {
                        resolve(null)
                        return
                    }

                    const canvas = info.node as any
                    scaleCanvas(canvas, width, height, dpr)
                    resolve({ canvas, width, height, dpr })
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

    canvasEl.style.width = `${rectDom.width}px`
    canvasEl.style.height = `${rectDom.height}px`
    canvasEl.style.display = 'block'

    scaleCanvas(canvasEl, rectDom.width, rectDom.height, dpr)

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

const ensurePixiModule = async (canvas: any) => {
    if (process.env.TARO_ENV === 'weapp') {
        const { createPIXI } = await import('pixi-miniprogram')
        const PIXI = createPIXI(canvas) as PixiModule
        if ((PIXI as any).settings && (PIXI as any).ENV) {
            // Prefer WebGL2 if the runtime supports it; fallback to WebGL1.
            let supportsWebgl2 = false
            try {
                const wxAny = wx as unknown as { createOffscreenCanvas?: (opts: any) => any }
                if (typeof wxAny?.createOffscreenCanvas === 'function') {
                    const testCanvas = wxAny.createOffscreenCanvas({ type: 'webgl', width: 1, height: 1 })
                    if (testCanvas && typeof testCanvas.getContext === 'function') {
                        const gl2 = testCanvas.getContext('webgl2')
                        supportsWebgl2 = !!gl2
                    }
                }
            } catch {
                supportsWebgl2 = false
            }
            ;(PIXI as any).settings.PREFER_ENV = supportsWebgl2
                ? (PIXI as any).ENV.WEBGL2
                : (PIXI as any).ENV.WEBGL
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

const nextTick = () =>
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

            const PIXI = await ensurePixiModule(info.canvas)
            if (!PIXI || cancelled) return

            createdApp = new PIXI.Application({
                view: info.canvas,
                width: info.width,
                height: info.height,
                resolution: info.dpr,
                backgroundAlpha: 0,
                autoDensity: true,
                antialias: true
            })

            if (!cancelled) {
                setPixi(PIXI)
                setApp(createdApp)
            }
        }

        init()

        return () => {
            cancelled = true
            if (createdApp) {
                createdApp.destroy(true, {
                    children: true,
                    texture: true,
                    baseTexture: true
                })
            }
            setApp(null)
            setPixi(null)
        }
    }, [canvasId])

    return { app, pixi }
}
