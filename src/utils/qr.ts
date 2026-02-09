import QRCode from 'qrcode'

/**
 * Generate a QR Code data URL from text
 * @param text The text to encode
 * @returns Promise resolving to the data URL
 */
export async function generateQRCode(text: string): Promise<string> {
    try {
        const svg = await QRCode.toString(text, {
            type: 'svg',
            margin: 0,
            width: 400,
            color: {
                dark: '#0f172a', // slate-900
                light: '#ffffff'
            }
        })
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    } catch (err) {
        console.error('[QR] Failed to generate QR code:', err)
        return ''
    }
}
