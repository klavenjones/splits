/**
 * Single source of truth for the color palette.
 *
 * `tailwind.config.js` turns these into CSS variables (`--color-*`) and Tailwind
 * classes (`bg-background`, `text-label`, ...). Use the classes in components.
 * Read the raw values through `useTheme()` only for props that can't take a
 * className, such as `tintColor` or native tab bar colors.
 *
 * CommonJS so `tailwind.config.js` can require it.
 *
 * @type {const}
 */
const Colors = {
  light: {
    label: '#000000',
    labelSecondary: '#60646C',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    link: '#3c87f7',
  },
  dark: {
    label: '#ffffff',
    labelSecondary: '#B0B4BA',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    link: '#3c87f7',
  },
};

module.exports = { Colors };
