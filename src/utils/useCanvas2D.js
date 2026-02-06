import Taro, { useReady } from '@tarojs/taro'

/**
 * Standard Canvas 2D Hook (H5 + Weapp)
 * Spec: specifications/dev_spec.md + specifications/home_spec.md
 */
export function useCanvas2D(id, drawCallback) {
  useReady(() => {
    Taro.nextTick(() => {
      const dpr = Taro.getSystemInfoSync().pixelRatio || 1

      // Branch A: H5 (Robust DOM Lookup)
      if (process.env.TARO_ENV === 'h5') {
        const el = document.getElementById(id)
        if (!el) return

        // Taro may wrap the real <canvas> inside a container.
        const canvas = el.tagName === 'CANVAS' ? el : el.querySelector('canvas')
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.scale(dpr, dpr)
        drawCallback(canvas, ctx, rect.width, rect.height, dpr)
        return
      }

      // Branch B: Weapp (SelectorQuery)
      if (process.env.TARO_ENV === 'weapp') {
        Taro.createSelectorQuery()
          .select(`#${id}`)
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res?.[0]?.node) return
            const { node, width, height } = res[0]
            node.width = width * dpr
            node.height = height * dpr
            const ctx = node.getContext('2d')
            if (!ctx) return
            ctx.scale(dpr, dpr)
            drawCallback(node, ctx, width, height, dpr)
          })
      }
    })
  })
}

