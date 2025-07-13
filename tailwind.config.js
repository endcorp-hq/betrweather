/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'accent-green': '#78a646',
        'sky-blue': '#87CEFA',
        'accent-light': '#FADADD'
      },
      fontFamily: {
        'better-regular': ['Hanuman-Regular', 'sans-serif'],
        'better-medium': ['Hanuman-Medium', 'sans-serif'],
        'better-bold': ['Hanuman-Bold', 'sans-serif'],
        'better-black': ['Hanuman-Black', 'sans-serif'],
        'better-light': ['Hanuman-Light', 'sans-serif'],
        'better-thin': ['Hanuman-Thin', 'sans-serif'],
        'better-extra-light': ['Hanuman-ExtraLight', 'sans-serif'],
        'better-extra-bold': ['Hanuman-ExtraBold', 'sans-serif'],
        'better-semi-bold': ['Hanuman-SemiBold', 'sans-serif'],
      },
      boxShadow: {
        // Custom drop shadow for wallet button
        'wallet-button-shadow': '0 4px 24px 0 rgba(47, 110, 255, 0.40), 0 1.5px 0 0 #1a237e inset',
      },
      backgroundColor: {
        'wallet-button-bg': '#3F5EFB',
      },
      backgroundImage: {
        // Custom radial gradient for wallet button
        'wallet-button-bg': 'radial-gradient(circle,rgba(63, 94, 251, 1) 25%, rgba(252, 70, 107, 1) 50%)',
      },
      backgroundSize: {
        'wallet-button-bg': 'cover',
      },
      backgroundPosition: {
        'wallet-button-bg': 'center',
      },



      // background-image: radial-gradient(circle, rgba(238, 174, 202, 1) 100%, rgba(148, 187, 233, 1) 0%);
      // background-size: cover;
      // background-position: center;
    },
  },
  plugins: [],
}