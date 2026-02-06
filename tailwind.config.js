/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
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
                'glow': '0 10px 20px -5px rgba(225, 29, 72, 0.4)',
                'card': '0 50px 100px -20px rgba(0, 0, 0, 0.2)',
            }
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    }
}
