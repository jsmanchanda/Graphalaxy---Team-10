const gts = require('gts');
const jsdoc = require('eslint-plugin-jsdoc');
const ignores = require('./eslint.ignores.js');

// Additional rules from https://google.github.io/styleguide/tsguide.html
const googleTs = {
  files: ['**/*.ts', '**/*.tsx'],
  plugins: {jsdoc},
  rules: {
    // Naming: strictCamelCase/StrictPascalCase treat acronyms as words
    // (e.g., loadHttpUrl, not loadHTTPURL).
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['strictCamelCase'],
        leadingUnderscore: 'forbid',
        trailingUnderscore: 'forbid',
      },
      {
        selector: 'variable',
        modifiers: ['const'],
        format: ['strictCamelCase', 'UPPER_CASE'],
      },
      {
        selector: 'classProperty',
        modifiers: ['static', 'readonly'],
        format: ['strictCamelCase', 'UPPER_CASE'],
      },
      {selector: 'typeLike', format: ['StrictPascalCase']},
      {
        selector: 'interface',
        format: ['StrictPascalCase'],
        custom: {regex: '^I[A-Z]', match: false},
      },
      {selector: 'enumMember', format: ['UPPER_CASE']},
      {selector: 'import', format: ['strictCamelCase', 'StrictPascalCase']},
      // Quoted keys like 'Content-Type' are allowed as-is.
      {
        selector: ['objectLiteralProperty', 'typeProperty'],
        modifiers: ['requiresQuotes'],
        format: null,
      },
    ],

    // No types in JSDoc because TypeScript has them.
    // @param/@returns only when they add information.
    ...jsdoc.configs['flat/recommended-typescript-error'].rules,
    'jsdoc/require-jsdoc': [
      'error',
      {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          ClassDeclaration: true,
          MethodDefinition: true,
          ArrowFunctionExpression: true,
          FunctionExpression: true,
        },
        contexts: [
          'TSInterfaceDeclaration',
          'TSTypeAliasDeclaration',
          'TSEnumDeclaration',
        ],
      },
    ],
    // --fix inserts empty /** */ stubs; don't let those count as docs.
    'jsdoc/require-description': ['error', {contexts: ['any']}],
    'jsdoc/require-param': 'off',
    'jsdoc/require-returns': 'off',

    // Imports and exports.
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-namespace': 'error',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ExportDefaultDeclaration',
        message: 'Use named exports, not default exports.',
      },
      {
        selector: 'ExportSpecifier[exported.name="default"]',
        message: 'Use named exports, not default exports.',
      },
      {
        selector: 'ExportNamedDeclaration > VariableDeclaration[kind!="const"]',
        message: 'Do not export mutable bindings; export a const.',
      },
      {
        selector: 'TSEnumDeclaration[const=true]',
        message: 'Do not use const enum; use a plain enum.',
      },
      {
        selector: 'PrivateIdentifier',
        message: 'Use the TypeScript `private` modifier, not #private.',
      },
    ],

    // Types.
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {'ts-expect-error': 'allow-with-description'},
    ],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/array-type': ['error', {default: 'array-simple'}],
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      {assertionStyle: 'as'},
    ],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-wrapper-object-types': 'error',
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {accessibility: 'no-public'},
    ],

    // Language features.
    '@typescript-eslint/no-extraneous-class': 'error',
    '@typescript-eslint/only-throw-error': 'error',
    '@typescript-eslint/no-for-in-array': 'error',
    'no-new-wrappers': 'error',
    curly: ['error', 'multi-line'],
    eqeqeq: ['error', 'always', {null: 'ignore'}],
  },
};

module.exports = [{ignores}, ...gts, googleTs];
