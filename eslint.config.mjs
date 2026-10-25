// ==============================================================================
// Configuración de ESLint (Flat Config)
// Regla: En componentes Vue (<template> arriba, <script> en medio, <style> abajo)
// Parser: vue-eslint-parser + @typescript-eslint/parser para soporte TypeScript
// ==============================================================================

import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tsParser from '@typescript-eslint/parser'

export default [
  // Carpetas generadas a ignorar por ESLint
  {
    ignores: [
      '.nuxt/**',
      '.output/**',
      '.vercel/**',
      'node_modules/**',
      'dist/**',
      'docs/**',
    ],
  },
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    rules: {
      // Orden estricto de bloques en archivos .vue: template -> script -> style
      'vue/block-order': [
        'error',
        {
          order: ['template', 'script', 'style'],
        },
      ],
      // Permitir nombres de una sola palabra en vistas de pages/ (ej: login, index)
      'vue/multi-word-component-names': 'off',
      // No forzar salto de línea por cada atributo HTML
      'vue/max-attributes-per-line': 'off',
      // No forzar un orden rígido en atributos HTML
      'vue/attributes-order': 'off',
      // Permitir elementos HTML en una sola línea y tags void
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
    },
  },
]
