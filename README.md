# josedev

Public-facing Next.js portfolio/app for josecoded. Part of a 3-tier system:

`browser → josedev (this repo, Next.js/Vercel) → josecoded-api (Cloudflare Worker gateway, in this repo under josecoded-api/) → backend (internal Fastify worker on the home server, /Volumes/JosecodedData/backend) → Ollama / Docker / n8n / local knowledge & storage`

See `docs/ARCHITECTURE.md` for the full system map and `CLAUDE.md` for how to explore
this codebase (and its siblings) with `codebase-memory-mcp` instead of broad file reads.

Bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## API Worker (`josecoded-api`)

El foro en el Worker usa **Postgres (Supabase)** cuando en `.dev.vars` hay `SUPABASE_SERVICE_ROLE_KEY`. Para desarrollo **solo con datos en memoria (mock)**:

```bash
pnpm dev:api:mock
```

(equivalente a `pnpm -C josecoded-api dev -- --mock`). En la carpeta `josecoded-api`, `pnpm dev` arranca `wrangler dev` y el foro usa Postgres si `.dev.vars` incluye `SUPABASE_SERVICE_ROLE_KEY`. Ver `josecoded-api/README.md` para el detalle de rutas y variables de entorno.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
