/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        processing: '#8B5CF6',
        background: '#0F172A',
        surface: '#1E293B',
      },
    },
  },
  plugins: [],
}

// Made with Bob
