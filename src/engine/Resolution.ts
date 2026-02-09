import Taro from '@tarojs/taro';

/**
 * Resolution Manager
 * Centralizes the logic for Resolution and DPR handling.
 * Enforces dev_spec.md rules for maxDPR and logical/physical pixel conversion.
 */
export class Resolution {
    /**
     * Get safe resolution information based on specification.
     * @param logicalWidth CSS pixel width of the container
     * @param logicalHeight CSS pixel height of the container
     */
    public static getInfo(logicalWidth: number, logicalHeight: number) {
        const sysInfo = Taro.getSystemInfoSync();
        const rawDpr = sysInfo.pixelRatio || 1;

        // Spec: maxDPR safety net
        // H5: min(dpr, 2.0)
        // WeApp: min(dpr, 1.5)
        const isH5 = process.env.TARO_ENV === 'h5';
        const maxDpr = isH5 ? 2.0 : 1.5;
        const dpr = Math.min(rawDpr, maxDpr);

        return {
            dpr,
            logicalWidth,
            logicalHeight,
            physicalWidth: Math.round(logicalWidth * dpr),
            physicalHeight: Math.round(logicalHeight * dpr),
            rawDpr
        };
    }
}
