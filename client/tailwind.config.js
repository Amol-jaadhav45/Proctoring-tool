/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                "primary": "#f9f506",
                "primary-content": "#1c1c0d",
                "background-light": "#f8f8f5",
                "background-dark": "#23220f",
                "surface-light": "#ffffff",
                "surface-dark": "#2c2b18",
                "text-main": "#1c1c0d",
                "text-muted": "#6b6b55",
            },
            fontFamily: {
                "display": ["Spline Sans", "sans-serif"]
            },
        },
    },
    plugins: [],
}
