module.exports = {
  content: ['./src/**/*.{js,jsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        'pink-blush':   '#fdf0f3',
        'pink-soft':    '#fce4ec',
        'pink-mid':     '#f8bbd0',
        'pink-accent':  '#e91e8c',
        'pink-muted':   '#f48fb1',
        'rose-dark':    '#880e4f',
        'progress-fill-warning': '#fb8c00',
        'progress-fill-danger': '#e53935',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body:    ['Jost', 'sans-serif'],
        sans:    ['Jost', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        soft: '0 2px 20px rgba(233, 30, 140, 0.06)',
        card: '0 4px 30px rgba(233, 30, 140, 0.08)',
        glow: '0 0 20px rgba(233, 30, 140, 0.2)',
      },
    },
  },
  plugins: [],
}