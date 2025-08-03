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
        'better-regular': ['Poppins-Regular'],
        'better-medium': ['Poppins-Medium'],
        'better-bold': ['Poppins-Bold'],
        'better-light': ['Poppins-Light'],
        'better-thin': ['Poppins-Thin'],
        'better-extra-light': ['Poppins-ExtraLight'],
        'better-semi-bold': ['Poppins-SemiBold'],
        'better-extra-bold': ['Poppins-ExtraBold'],
        'better-black': ['Poppins-Black'],
        'better-extra-black': ['Poppins-ExtraBlack'],
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