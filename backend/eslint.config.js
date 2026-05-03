const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            arguments: false,
          },
        },
      ],
    },
  },
  {
    ignores: ["dist/**"],
  },
];
