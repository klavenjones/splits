const { platformSelect } = require('nativewind/theme');

const { Colors } = require('./src/theme/colors');

const isNative = process.env.NATIVEWIND_OS !== undefined && process.env.NATIVEWIND_OS !== 'web';

const kebab =(key) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// { labelSecondary: '#60646C' } -> { '--color-label-secondary': '#60646C' }
const toCssVars = (palette) =>
  Object.fromEntries(Object.entries(palette).map(([key, value]) => [`--color-${kebab(key)}`, value]));

// { labelSecondary: ... } -> { 'label-secondary': 'var(--color-label-secondary)' }
const colorTokens = Object.fromEntries(
  Object.keys(Colors.light).map((key) => [kebab(key), `var(--color-${kebab(key)})`])
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: colorTokens,
      // Type ramp: [fontSize, { lineHeight, fontWeight }]
      fontSize: {
        title: ['48px', { lineHeight: '52px', fontWeight: '600' }],
        subtitle: ['32px', { lineHeight: '44px', fontWeight: '600' }],
        body: ['16px', { lineHeight: '24px', fontWeight: '500' }],
        small: ['14px', { lineHeight: '20px', fontWeight: '500' }],
        code: ['12px', { fontWeight: '500' }],
      },
      fontFamily: {
        // NativeWind compiles CSS once per platform. platformSelect() only resolves on native,
        // so web gets the font stack from global.css instead.
        mono: isNative
          ? platformSelect({ ios: 'ui-monospace', android: 'monospace' })
          : 'var(--font-mono)',
      },
      maxWidth: {
        content: '800px',
      },
    },
  },
  plugins: [
    ({ addBase }) =>
      addBase({
        ':root': toCssVars(Colors.light),
        '@media (prefers-color-scheme: dark)': {
          ':root': toCssVars(Colors.dark),
        },
      }),
  ],
};
