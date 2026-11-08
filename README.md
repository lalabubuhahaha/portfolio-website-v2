# Portfolio Website v2

Independent foundation for a second portfolio. Visual and interaction design are pending a separate prompt.

## Development

Use Node.js 24 and npm. Run `npm ci`, `npm run dev`.
Validation: `npm run typecheck`, `npm run lint`, `npm run build`.
Production locally: `npm run start` after building.

## Migrated foundation

Source: `lalabubuhahaha/portfolio-website`, branch `feat/phase-1-step-2`, commit `7fa8db1f5e5142d17665ff5d8dfc29b25dc94d55`.
Source main contains only README; the feature branch contains the implemented application.

- Next.js App Router, React, strict TypeScript, Tailwind CSS 4; source dependency versions retained.
- `lib/content` and `ContentItem` copied without changes, including published-only queries, featured selection, ordering, and independent/client filtering.
- Seven original placeholder records and SVG images retained (six published, one draft).
- `/` featured listing and `/work?type=independent|client` browsing.
- Source `AGENTS.md` and `docs/roadmap.md` retained unchanged. Roadmap items are plans, not completion claims.
- Cards retain `/work/[slug]` link targets from the source. Detail pages and `/about` were not implemented in the source and are not added here; detail URLs currently return 404.

Source styles, custom fonts, intro scripts, experimental motion components and Vercel bindings are excluded. The temporary basic UI is not the final visual design. No GetLayers prompt is implemented.

This checkout has an independent root commit and its own GitHub origin. No source Git history, Vercel project, deployment URL, credentials, or deployment hooks are copied. Configure a separate Vercel project only when explicitly requested.
