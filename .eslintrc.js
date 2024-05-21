/*!
This file is part of CycloneDX SBOM plugin for yarn.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
Copyright (c) OWASP Foundation. All Rights Reserved.
*/

/**
 * @type {import('eslint').Linter.Config}
 * @see https://eslint.org/
 */
module.exports = {
  root: true,
  plugins: [
    /* see https://github.com/lydell/eslint-plugin-simple-import-sort#readme */
    'simple-import-sort',
    /* see https://github.com/Stuk/eslint-plugin-header#readme */
    'header'
  ],
  env: {
    commonjs: true,
    node: true
  },
  rules: {
    // region sort imports/exports
    /** disable other sorters in favour of `simple-import-sort` */
    'import/order': 0,
    'sort-imports': 0,
    /** @see https://github.com/lydell/eslint-plugin-simple-import-sort/ */
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    // endregion sort imports/exports
    // region license-header
    /* see https://github.com/Stuk/eslint-plugin-header#readme */
    'header/header': ['error', '.license-header.js']
    // endregion license-header
  },
  overrides: [
    {
      files: ['*.spec.*', '*.test.*'],
      env: {
        mocha: true,
        commonjs: true,
        node: true
      }
    },
    {
      files: ['*.ts'],
      extends: [
        /** @see https://www.npmjs.com/package/eslint-config-love */
        'love'
      ],
      parserOptions: {
        project: './tsconfig.json'
      },
      rules: {
        /* @see https://typescript-eslint.io/rules/unbound-method/ */
        '@typescript-eslint/unbound-method': ['error', {
          ignoreStatic: true
        }]
      }
    },
    {
      files: ['*.js', '*.mjs', '*.cjs'],
      extends: [
        /* see https://www.npmjs.com/package/eslint-config-standard */
        'standard'
      ]
    },
    {
      files: ['bin/*.js'],
      rules: {
        // region license-header
        /* see https://github.com/Stuk/eslint-plugin-header#readme */
        'header/header': 'off'
        // endregion license-header
      }
    }
  ]
}
