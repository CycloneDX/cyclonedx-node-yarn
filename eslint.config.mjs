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

import path from 'node:path'
import { fileURLToPath } from 'node:url'

/* eslint-disable camelcase -- readability */
import config_love from 'eslint-config-love'
import plugin_import from 'eslint-plugin-import'
import plugin_jsdoc from 'eslint-plugin-jsdoc'
import plugin_header from 'eslint-plugin-license-header'
import plugin_n from 'eslint-plugin-n'
import plugin_simpleImportSort from 'eslint-plugin-simple-import-sort'
import plugin_tsdoc from 'eslint-plugin-tsdoc'
import globals from 'globals'
import config_neostandard from 'neostandard'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const licenseHeaderFile = path.join(__dirname, '.license-header.js')

/* eslint-disable jsdoc/valid-types -- type-import not supported yet */

/**
 * @typedef {import('eslint').Linter.Config} Config
 */

/**
 * @param {Array<string>} files
 * @param {Config[]} cs
 * @return {Config[]}
 */
function configSetFiles (files, cs) {
  for (const c of cs) {
    c.files = files
  }
  return cs
}

/**
 * @type {Config[]}
 * @see https://eslint.org/
 */
export default [
  {
    name: 'general',
    plugins: {
      plugin_import,
      plugin_simpleImportSort,
      plugin_header,
      plugin_n,
    },
    rules: {
      'plugin_n/prefer-node-protocol': 'error',
      'sort-imports': 'off',
      'plugin_simpleImportSort/imports': 'error',
      'plugin_simpleImportSort/exports': 'error',
      'plugin_import/first': 'error',
      'plugin_import/newline-after-import': 'error',
      'plugin_import/no-duplicates': 'error',
      'plugin_header/header': ['error', licenseHeaderFile],
    },
  },
  ...configSetFiles(['**/*.{js,mjs,cjs}'], [
    ...config_neostandard({ noJsx: true, ts: false }),
    {
      ...plugin_jsdoc.configs['flat/recommended'],
    },
    {
      name: 'jsdoc-override',
      plugins: {
        jsdoc: plugin_jsdoc,
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
        'jsdoc/reject-any-type': 0
      }
    },
  ]),
  {
    name: 'import order for commonjs',
    files: ['**/*.{js,cjs}'],
    rules: {
      // rules dont support mjs properly
      'plugin_simpleImportSort/imports': 'off',
      'plugin_import/order': [
        // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md
        'error', {
          groups: [
            'builtin',
            'external',
            /* and then all the rest */
          ],
          alphabetize: { order: 'asc' },
          named: true,
          'newlines-between': 'always',
        }],
    }
  },
  ...configSetFiles(['**/*.ts'], [
    {
      ...config_love
    },
    {
      plugins: {
        plugin_tsdoc,
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
        'plugin_tsdoc/syntax': 'error',
      },
    },
  ]),
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
      complexity: ['error', { max: 15 }]
    }
  },
  {
    files: ['src/*.ts'],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: ['bin/*.{js,cjs,mjs}', 'index.{js,cjs,mjs}'],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: ['tools/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    name: 'project-specific',
    files: ['src/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/max-params': 'warn',
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' }
  },
  {
    files: [
      '**/*.{test,spec}.{js,mjs,cjs,ts}',
      'tests/**/*.{js,mjs,cjs,ts}'
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      }
    }
  },
  {
    files: [
      'tests/integration/setup.{js,cjs,mjs}'
    ],
    languageOptions: {
      globals: globals.node,
    }
  },
  {
    files: ['src/*.ts'],
    languageOptions: {
      parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
      },
    },
  },
  {
    // global ignores must have nothing but a 'ignores' property!
    // see https://github.com/eslint/eslint/discussions/17429#discussioncomment-6579229
    ignores: [
      '.yarn/',
      'yarn.*',
      '.pnp.*',
      'reports/',
      'bundles/',
      'dist/',
      'docs/',
      'tests/_data/', 'tests/_tmp/',
      'src/__buildtimeInfo.json'
    ]
  }
]
