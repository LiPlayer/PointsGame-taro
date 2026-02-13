/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')

module.exports = {
    content: [
        './**/*.{html,js,ts,jsx,tsx}',
        '../shared/**/*.{js,ts,jsx,tsx}',
        '!./dist/**/*',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', '"Noto Sans SC"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                brand: {
                    red: '#e11d48',
                    dark: '#0f172a',
                    bg: '#f1f5f9',
                }
            },
            boxShadow: {
                'glow': '0 0 20px -5px rgba(225, 29, 72, 0.5)',
                'card': '0 20px 40px -10px rgba(15, 23, 42, 0.05)',
            }
        },
    },
    plugins: [
        // Cross-platform variants used by weapp-tailwindcss + Taro builds.
        // Usage: `h5:mix-blend-multiply` (only active when an ancestor has `platform-h5`).
        plugin(({ addVariant }) => {
            addVariant('h5', '.platform-h5 &')
            addVariant('weapp', '.platform-weapp &')
        })
    ],
    corePlugins: {
        preflight: false,
    }
}
