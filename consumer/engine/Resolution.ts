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
    public static getInfo(logicalWidth: number, logicalHeight: number, maxDPR?: number) {
        const sysInfo = Taro.getSystemInfoSync();
        const rawDpr = sysInfo.pixelRatio || 1;

        // Spec: Allow full resolution by default unless capped by maxDPR
        const dpr = maxDPR ? Math.min(rawDpr, maxDPR) : rawDpr;

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
