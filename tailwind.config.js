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
                    red: '#e11d48', // rose-600
                    dark: '#0f172a', // slate-900
                    bg: '#f1f5f9',   // slate-100
                }
            },
            boxShadow: {
                'glow': '0 0 20px -5px rgba(225, 29, 72, 0.5)',
                'card': '0 20px 40px -10px rgba(15, 23, 42, 0.05)',
            }
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    }
}
