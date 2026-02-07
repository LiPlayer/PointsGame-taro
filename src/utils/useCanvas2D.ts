import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef } from 'react'

export interface Canvas2DRect {
    left: number
    top: number
    width: number
    height: number
}

export interface Canvas2DInfo {
    ctx: CanvasRenderingContext2D
    canvas: any
    dpr: number
    rect: Canvas2DRect
}

export type Canvas2DSetup = (info: Canvas2DInfo) => void | (() => void)

const scaleCanvas = (
    canvas: any,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dpr: number
) => {
    const safeWidth = Math.max(1, Math.floor(width * dpr))
    const safeHeight = Math.max(1, Math.floor(height * dpr))

    canvas.width = safeWidth
    canvas.height = safeHeight

    if (typeof ctx.setTransform === 'function') {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
    }
    ctx.scale(dpr, dpr)
}

const readCanvasInfo = async (id: string, dpr: number): Promise<Canvas2DInfo | null> => {
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

                    const canvas = info.node as any
                    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null
                    if (!ctx) {
                        resolve(null)
                        return
                    }

                    const width = Number(info.width || info.rect?.width || 0)
                    const height = Number(info.height || info.rect?.height || 0)
                    const rect: Canvas2DRect = {
                        left: Number(info.left ?? info.rect?.left ?? 0),
                        top: Number(info.top ?? info.rect?.top ?? 0),
                        width,
                        height
                    }

                    scaleCanvas(canvas, ctx, rect.width, rect.height, dpr)
                    resolve({ canvas, ctx, dpr, rect })
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
    canvasEl.style.width = `${rectDom.width}px`
    canvasEl.style.height = `${rectDom.height}px`
    canvasEl.style.display = 'block'

    const ctx = canvasEl.getContext('2d') as CanvasRenderingContext2D | null
    if (!ctx) return null

    const rect: Canvas2DRect = {
        left: rectDom.left,
        top: rectDom.top,
        width: rectDom.width,
        height: rectDom.height
    }

    scaleCanvas(canvasEl, ctx, rect.width, rect.height, dpr)
    return { canvas: canvasEl, ctx, dpr, rect }
}

export const useCanvas2D = (id: string, setup: Canvas2DSetup, deps: unknown[] = []) => {
    const cleanupRef = useRef<void | (() => void)>()
    const setupRef = useRef(setup)
    setupRef.current = setup

    const refresh = useCallback(async () => {
        const sys = Taro.getSystemInfoSync()
        const dpr =
            process.env.TARO_ENV === 'h5' && typeof window !== 'undefined'
                ? window.devicePixelRatio || sys.pixelRatio || 1
                : sys.pixelRatio || 1
        return readCanvasInfo(id, dpr)
    }, [id])

    useEffect(() => {
        let mounted = true

        refresh().then((info) => {
            if (!mounted || !info) return
            cleanupRef.current = setupRef.current(info)
        })

        return () => {
            mounted = false
            if (cleanupRef.current) cleanupRef.current()
        }
    }, [refresh, ...deps])

    return { refresh }
}
