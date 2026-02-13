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

export function calculateCurrentPoints(lastPoints: number, lastUpdatedAt: any): number {
    if (!lastPoints) return 0
    if (!lastUpdatedAt) return lastPoints

    // Normalize lastUpdatedAt to timestamp
    let lastTime = 0
    if (typeof lastUpdatedAt === 'number') {
        lastTime = lastUpdatedAt
    } else if (lastUpdatedAt instanceof Date) {
        lastTime = lastUpdatedAt.getTime()
    } else if (typeof lastUpdatedAt === 'string') {
        lastTime = new Date(lastUpdatedAt).getTime()
    } else if (lastUpdatedAt && typeof lastUpdatedAt === 'object' && lastUpdatedAt.$date) {
        // Handle MongoDB/CloudDB Date format if it comes as { $date: ... }
        lastTime = new Date(lastUpdatedAt.$date).getTime()
    }

    if (!lastTime || isNaN(lastTime)) {
        return lastPoints
    }

    const now = Date.now()
    const deltaHours = (now - lastTime) / (1000 * 60 * 60)

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
