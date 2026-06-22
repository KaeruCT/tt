import autoprefixer from 'autoprefixer';

/*
 * PostCSS is a tool for transforming styles with JS plugins.
 * Vite runs PostCSS automatically after CSS preprocessing.
 * https://vitejs.dev/guide/features.html#postcss
 */
export default {
  plugins: [autoprefixer()],
};
