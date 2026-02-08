/**
 * Point-Cubic Decay Model
 * 
 * Formula: P_real(t) = P_last / sqrt(1 + 2 * lambda * P_last^2 * delta_h)
 * delta_h: hours elapsed
 */

const P_MAX = 1280
const DAYS_TO_CAP = 7

// Derived constants
const G_DAILY = (8 * P_MAX) / (7 * DAYS_TO_CAP)
const LAMBDA = G_DAILY / (24 * Math.pow(P_MAX, 3))

/**
 * Calculate evaporated points
 * @param lastPoints - Points at last update
 * @param lastUpdatedAt - Timestamp (ms) of last update
 * @returns Current points
 */
export function calculateCurrentPoints(lastPoints: number, lastUpdatedAt: number): number {
    if (!lastPoints || !lastUpdatedAt) return lastPoints || 0

    const now = Date.now()
    const deltaHours = (now - lastUpdatedAt) / (1000 * 60 * 60)

    if (deltaHours <= 0) return lastPoints

    // P_real(t) = P_last / sqrt(1 + 2 * lambda * P_last^2 * delta_h)
    const currentPoints = lastPoints / Math.sqrt(1 + 2 * LAMBDA * Math.pow(lastPoints, 2) * deltaHours)

    return currentPoints
}

/**
 * Get economy config for logging/debugging
 */
export function getEconomyConfig() {
    return {
        P_MAX,
        DAYS_TO_CAP,
        G_DAILY,
        LAMBDA,
        targetPerGame: G_DAILY / 3
    }
}
