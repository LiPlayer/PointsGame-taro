export type RafHandle = number

type RafCallback = (time: number) => void

const now = () => {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now()
    }
    return Date.now()
}

let lastTime = 0

export const requestRaf = (cb: RafCallback): RafHandle => {
    if (typeof requestAnimationFrame !== 'undefined') {
        return requestAnimationFrame(cb)
    }

    const current = now()
    const delay = Math.max(0, 16 - (current - lastTime))
    const handle = setTimeout(() => cb(current + delay), delay) as unknown as number
    lastTime = current + delay
    return handle
}

export const cancelRaf = (handle: RafHandle) => {
    if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(handle)
        return
    }

    clearTimeout(handle as unknown as number)
}
