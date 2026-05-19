#  nido (L) 

Tu hogar personal de internet. Guardá links, seguí feeds RSS y escribí notas, todo organizado por tus intereses.

**Stack:** Next.js 14 · Supabase · Vercel · Tailwind CSS · TypeScript

---

## Setup en 5 pasos

### 1. Supabase

1. Creá una cuenta en [supabase.com](https://supabase.com) (gratis)
2. Creá un nuevo proyecto
3. Andá a **SQL Editor** y corré todo el contenido de `supabase-schema.sql`
4. En **Settings → API**, copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Variables de entorno

Copiá `.env.local.example` como `.env.local`:

```bash
cp .env.local.example .env.local
```

Y completá con tus valores de Supabase.

### 3. Instalar dependencias

```bash
npm install
```

### 4. Correr en local

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

### 5. Deploy en Vercel

```bash
# Opción A: desde CLI
npx vercel

# Opción B: desde vercel.com
# → Import project desde GitHub
# → Agregar las variables de entorno en Settings → Environment Variables
```

En Vercel agregá las mismas variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Funcionalidades

- **Espacios** — organizá por intereses (música, cocina, programación, lo que quieras)
- **Feeds RSS** — seguí blogs, noticias, sin algoritmo
- **Bookmarks** — guardá links con preview automático, favoritos, "ver después", tags
- **Notas** — ideas, listas, mini diarios por tema
- **Modo oscuro** — siempre
- **Responsive** — funciona en desktop y mobile

## Estructura

```
src/
  app/
    page.tsx              ← shell principal
    layout.tsx
    globals.css
    api/
      metadata/route.ts   ← fetches og tags de URLs
      feed/route.ts       ← proxy RSS (evita CORS)
  components/
    Sidebar.tsx           ← lista de espacios
    BookmarksTab.tsx      ← biblioteca de links
    NotesTab.tsx          ← notas por espacio
    FeedTab.tsx           ← lector RSS
  lib/
    supabase.ts           ← cliente Supabase
    types.ts              ← interfaces TypeScript
    utils.ts              ← helpers (metadata, tiempo relativo, etc.)
```
