/*!
This file is part of CycloneDX Webpack plugin.

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

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import plugin_js from '@eslint/js'
import config_love from 'eslint-config-love'
import plugin_import from 'eslint-plugin-import'
import plugin_jsdoc from 'eslint-plugin-jsdoc'
import plugin_header from 'eslint-plugin-license-header'
import plugin_n from 'eslint-plugin-n'
import plugin_simpleImportSort from 'eslint-plugin-simple-import-sort'
import plugin_tsdoc from 'eslint-plugin-tsdoc'
import globals from 'globals'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const licenseHeaderFile = path.join(__dirname, '.license-header.js')

/* eslint-disable jsdoc/valid-types */

/**
 * @type {import('eslint').Linter.Config[]}
 * @see https://eslint.org
 */
export default [
  {
    name: 'general',
    plugins: {
      'import': plugin_import,
      'simple-import-sort': plugin_simpleImportSort,
      'license-header': plugin_header,
      //'editorconfig': plugin_editorconfig,
      'n': plugin_n,
    },
    rules: {
      // ...plugin_editorconfig.configs.all.rules,
      // 'editorconfig/indent': 'off',
      'n/prefer-node-protocol': 'error',
      'sort-imports': 'off',
      'import/order': [
        // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md
        'error', {
          'groups': [
            'builtin',
            'external',
            /* and then all the rest */
          ],
          'newlines-between': 'always',
        }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'license-header/header': ['error', licenseHeaderFile],
    },
  },
  {
    files: ['**/*.{js,cjs}'],
    rules: {
      'simple-import-sort/imports': 'off',
      'import/order': [
        // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md
        'error', {
          'groups': [
            'builtin',
            'external',
            /* and then all the rest */
          ],
          'alphabetize': { order: "asc" },
          'named': true,
          'newlines-between': 'always',
        }],
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: plugin_js.configs.recommended.rules,
  },
  {
    ...plugin_jsdoc.configs['flat/recommended'],
    files: ['**/*.{js,mjs,cjs}'],
  },
  {
    name: 'jsdoc-override',
    files: ['**/*.{js,mjs,cjs}'],
    plugins: {
      'jsdoc': plugin_jsdoc,
    },
    settings: {
      jsdoc: {
        mode: 'jsdoc',
      },
    },
    rules: {
      'jsdoc/no-undefined-types': 'error',
      'jsdoc/check-tag-names': 0,
      'jsdoc/check-types': 'error',
      'jsdoc/require-hyphen-before-param-description': ['error', 'always'],
      'jsdoc/require-jsdoc': 0,
      'jsdoc/require-param': 0,
      'jsdoc/require-param-description': 0,
      'jsdoc/require-param-name': 'error',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-property': 0,
      'jsdoc/require-property-description': 0,
      'jsdoc/require-property-name': 'error',
      'jsdoc/require-property-type': 'error',
      'jsdoc/require-returns': 0,
      'jsdoc/require-returns-check': 'error',
      'jsdoc/require-returns-description': 0,
      'jsdoc/require-returns-type': 'error',
      'jsdoc/require-throws': 'error',
      'jsdoc/require-yields': 0,
      'jsdoc/require-yields-check': 'error',
      'jsdoc/sort-tags': 'warn',
    }
  },
  {
    ...config_love,
    files: ['**/*.ts']
  },
  {
    files: ['**/*.ts'],
    plugins: {
      'tsdoc': plugin_tsdoc,
    },
    languageOptions: {
      parserOptions: {
        // override
        project: false,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', {
        fixStyle: 'separate-type-imports',
      }],
      '@typescript-eslint/unbound-method': ['error', {
        ignoreStatic: true,
      }],
      'class-methods-use-this': 'off',
      '@typescript-eslint/class-methods-use-this': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/prefer-destructuring': 'off',
      'tsdoc/syntax': 'error',
    },
  },
  {
    files: [
      '**/eslint.config.{js,mjs,cjs}',
      '**/webpack.config.js',
      '**/.mocharc.js'
    ],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    // global ignores must have nothing but a 'ignores' property!
    // see https://github.com/eslint/eslint/discussions/17429#discussioncomment-6579229
    ignores: [
      '**/.idea/',
      '**/.vscode/',
      licenseHeaderFile,
    ],
  },
  // project specifics
  {
    name: 'project-specific',
    rules: {
      "complexity": ["error", { "max": 15 }]
    }
  },
  {
    name: 'project-specific',
    files: ['src/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' }
  },
  {
    files: [
      '**/*.{test,spec}.{js,mjs,cjs,ts}',
      'tests/**.{js,mjs,cjs,ts}'
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      }
    }
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
      },
    },
  },
  {
    ignores: [
      '/.yarn/**',
      '/.pnp.*',
      '/reports/',
      '/bundles/',
      '/dist/',
      '/docs/',
      '/src/__buildtimeInfo.json'
    ]
  }
]
