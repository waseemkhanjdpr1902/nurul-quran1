export default {
  plugins: {
    autoprefixer: {
      overrideBrowserslist: [
        "last 3 Chrome versions",
        "last 3 Firefox versions",
        "last 3 Edge versions",
        "last 3 Safari versions",
        "last 2 iOS versions",
        "last 2 Android versions",
        "> 0.5%",
        "not dead",
      ],
    },
  },
};
