# Programa de Lealtad · Tienda en Línea

Sistema full-stack de fidelización y recompensas construido con **Nuxt 3 (Vue 3)**, **Supabase (PostgreSQL)** y desplegado en **Vercel** ($0 costo).

## 🚀 Tecnologías

- **Framework Full-Stack:** [Nuxt 3](https://nuxt.com/) (Vue 3, Composition API, Nitro Engine)
- **Lenguaje:** TypeScript
- **Gestor de Paquetes:** [pnpm](https://pnpm.io/)
- **Base de Datos:** PostgreSQL en [Supabase](https://supabase.com/) mediante Transaction Pooler (PgBouncer, puerto 6543)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Almacenamiento:** Supabase Storage (bucket público de recompensas)
- **Fuente de Datos Externa:** [fakeapi.dev](https://fakeapi.dev/) (usuarios, pedidos y pagos)

---

## 🛠️ Instalación y Configuración Local

### 1. Clonar e instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

Copiar el archivo de plantilla `.env.example` como `.env` y definir los valores correspondientes:

```bash
cp .env.example .env
```

### 3. Servidor de desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`.

### 4. Compilación para producción

```bash
pnpm build
pnpm preview
```

