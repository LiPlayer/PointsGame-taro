import qrcode from 'qrcode-generator'

/**
 * Generate a QR Code data URL from text using qrcode-generator
 * @param text The text to encode
 * @returns Promise resolving to the data URL (SVG format)
 */
export async function generateQRCode(text: string): Promise<string> {
    try {
        // TypeNumber: 0 (Auto), ErrorCorrectionLevel: 'L' (Low, 7%)
        const qr = qrcode(0, 'L')
        qr.addData(text)
        qr.make()

        // Use createDataURL to generate a Base64 GIF (standard approach for this lib)
        // cell size: 4 (smaller leads to smaller image but lower res, 4 is usually fine for screen)
        // margin: 0
        const dataUrl = qr.createDataURL(4, 0)
        return dataUrl
    } catch (err) {
        console.error('[QR] Failed to generate QR code:', err)
        return ''
    }
}
