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
            },
        },
    },
    plugins: [
        plugin(({ addVariant }) => {
            addVariant('h5', '.platform-h5 &')
            addVariant('weapp', '.platform-weapp &')
        })
    ],
    corePlugins: {
        preflight: false,
    }
}
