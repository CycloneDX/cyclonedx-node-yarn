/**
 * @see {@link https://eslint.org/}
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: 'standard-with-typescript',
  parserOptions: {
    project: './tsconfig.json'
  },
  env: {
    browser: false,
    node: true
  }
}
