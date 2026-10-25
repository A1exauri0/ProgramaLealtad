// ==============================================================================
// Configuración de ESLint (Flat Config)
// Regla: En componentes Vue (<template> arriba, <script> en medio, <style> abajo)
// ==============================================================================

import pluginVue from 'eslint-plugin-vue'

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
    },
  },
]
