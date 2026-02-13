export class ColorUtils {
    // Brand Colors
    public static readonly COLORS = {
        rose600: 0xe11d48,
        amber500: 0xf59e0b,
        slate900: 0x0f172a,
        slate50: 0xf8fafc,
    };

    /**
     * Helper: Lerp Color
     */
    public static lerpColor(c1: number, c2: number, t: number): number {
        const r1 = (c1 >> 16) & 0xff;
        const g1 = (c1 >> 8) & 0xff;
        const b1 = c1 & 0xff;

        const r2 = (c2 >> 16) & 0xff;
        const g2 = (c2 >> 8) & 0xff;
        const b2 = c2 & 0xff;

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (r << 16) | (g << 8) | b;
    }

    public static lighten(color: number, amount: number): number {
        const r = Math.min(255, ((color >> 16) & 0xff) + 255 * amount);
        const g = Math.min(255, ((color >> 8) & 0xff) + 255 * amount);
        const b = Math.min(255, (color & 0xff) + 255 * amount);
        return (r << 16) | (g << 8) | b;
    }

    public static darken(color: number, amount: number): number {
        const r = Math.max(0, ((color >> 16) & 0xff) - 255 * amount);
        const g = Math.max(0, ((color >> 8) & 0xff) - 255 * amount);
        const b = Math.max(0, (color & 0xff) - 255 * amount);
        return (r << 16) | (g << 8) | b;
    }
}
