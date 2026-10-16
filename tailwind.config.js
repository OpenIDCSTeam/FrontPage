/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  /**
   * `dark:` 变体跟随应用的深浅色开关，而不是操作系统的 prefers-color-scheme。
   * 早期版本没设这一项，导致「系统是深色 + 应用是浅色」时页面里
   * `dark:xxx` 的工具类会错误生效，是配色不一致的主要来源之一。
   */
  darkMode: ['class', '[data-theme="dark"]'],

  theme: {
    extend: {
      /**
       * 字体交给 CSS 变量，由 src/styles/fonts.css 的字体预设决定，
       * 这样 Tailwind 的 font-sans / font-mono 与全局字体切换保持一致。
       */
      fontFamily: {
        sans: ['var(--font-family)'],
        mono: ['var(--font-mono)'],
      },
    },
  },

  /**
   * 已移除 daisyui：
   * 全项目零引用它的语义色类（btn / card / badge / bg-primary / text-base-content 等），
   * 但它会在 base 层注入一套自己的按钮与卡片底色，与 Ant Design 抢同一批元素。
   */
  plugins: [],
}
