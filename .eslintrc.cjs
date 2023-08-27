module.exports = {
  root: true,
  extends: ["eslint:recommended", "prettier"],
  env: {
    browser: true,
    es2017: true,
    node: true,
  },
  rules: {
    "no-console": ["error", { allow: ["warn", "error", "info"] }],
    "no-debugger": "error",
    "no-eval": "error",
  },
};
