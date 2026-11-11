# Portfolio Website v2

Independent portfolio for Lala. Gravity Edition Stage 5.3.1 preserves the larger Hero composition while enforcing spherical meshes and circular 3D projection. See [Sphere Integrity Fix](docs/gravity-stage-5-3-1.md) for causes, projection design, and validation.

## Development

Use Node.js 24 and npm. Run `npm ci`, `npm run dev`.
Validation: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:gravity`.
Production locally: `npm run start` after building.

## Migrated foundation

Source: `lalabubuhahaha/portfolio-website`, branch `feat/phase-1-step-2`, commit `7fa8db1f5e5142d17665ff5d8dfc29b25dc94d55`.
Source main contains only README; the feature branch contains the implemented application.

- Next.js App Router, React, strict TypeScript, Tailwind CSS 4; source dependency versions retained.
- `lib/content` and `ContentItem` copied without changes, including published-only queries, featured selection, ordering, and independent/client filtering.
- Seven original placeholder records and SVG images retained (six published, one draft).
- `/` featured listing and `/work?type=independent|client` browsing.
- Source `AGENTS.md` rules and `docs/roadmap.md` retained; Next.js dev appended its version-specific guidance to AGENTS.md. Roadmap items are plans, not completion claims.
- Cards retain `/work/[slug]` link targets from the source. Detail pages and `/about` were not implemented in the source and are not added here; detail URLs currently return 404.

Source website A styles, intro scripts, experimental motion components and Vercel bindings are excluded. Gravity Edition follows the supplied GetLayers specification. See [Stage 2 implementation and validation](docs/gravity-stage-2.md) and the historical [Stage 1 notes](docs/gravity-stage-1.md).

This checkout has an independent root commit and its own GitHub origin. No source Git history, Vercel project, deployment URL, credentials, or deployment hooks are copied. Configure a separate Vercel project only when explicitly requested.
