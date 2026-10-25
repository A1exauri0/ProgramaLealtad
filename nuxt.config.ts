// ==============================================================================
// Configuración Principal de Nuxt 3 (Programa de Lealtad)
// ==============================================================================

import { defineNuxtConfig } from "nuxt/config";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Fecha de compatibilidad de Nuxt
  compatibilityDate: '2025-07-15',

  // Herramientas de desarrollo
  devtools: { enabled: true },

  // Módulos oficiales
  modules: ['@nuxt/ui'],

  // Estilos globales (Tailwind CSS v4 + Nuxt UI)
  css: ['~/assets/css/main.css'],

  // Tema claro fijo (blanco y negro)
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  // Configuración del motor de servidor Nitro
  nitro: {
    // Preset oficial para despliegue serverless en Vercel ($0 costo)
    preset: 'vercel',
  },

  // Variables de entorno y configuración en tiempo de ejecución (Servidor Nitro)
  runtimeConfig: {
    // Variables privadas (solo accesibles en el backend de Nuxt/Nitro)
    databaseUrl: process.env.DATABASE_URL || '',
    databaseUrlMigraciones: process.env.DATABASE_URL_MIGRACIONES || '',
    fakeapiUrl: process.env.FAKEAPI_URL || 'https://fakeapi.dev/api/v1',
    fakeapiKey: process.env.FAKEAPI_KEY || '',
    sesionSecreto: process.env.SESION_SECRETO || '',
    cronSecret: process.env.CRON_SECRET || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    supabaseBucket: process.env.SUPABASE_BUCKET || 'recompensas',
    adminCorreo: process.env.ADMIN_CORREO || '',
    adminPassword: process.env.ADMIN_PASSWORD || '',

    // Variables públicas (expuestas al frontend si se requieren en el futuro)
    public: {
      nombreApp: 'Programa de Lealtad',
    },
  },
})
