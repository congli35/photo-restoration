# Agent Guidelines

These rules are derived from `.cursor/rules/*` and apply to all work in this repo.

## Key principles
- Assume expertise in TypeScript, Node.js, Next.js App Router, React, Shadcn UI, Radix UI, Tailwind.
- Write concise, technical TypeScript with accurate examples.
- Prefer functional and declarative programming; avoid classes.
- Prefer iteration and modularization over duplication.
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`).
- File structure order: exported component, subcomponents, helpers, static content, types.
- Follow Next.js docs for data fetching, rendering, routing.
- Follow Supastarter patterns: `supastarter.dev/docs/nextjs`.

## Project structure
- Frontend-only code lives in `apps/web/app` (Next.js App Router).
- Backend logic belongs in `packages/*`:
  - `packages/ai` AI code
  - `packages/api` API routes
  - `packages/auth` auth config/helpers
  - `packages/database` schema + types
  - `packages/i18n` translations + i18n helpers
  - `packages/logs` logging
  - `packages/mail` email providers/templates
  - `packages/payments` payment logic
  - `packages/storage` file/image storage
  - `packages/utils` utilities
- App configuration lives in `config`.

## Syntax and formatting
- Use the `function` keyword for pure functions.
- Avoid unnecessary curly braces in conditionals; keep simple conditionals concise.
- Use declarative JSX.

## TypeScript usage
- Use TypeScript everywhere.
- Prefer `interface` over `type`.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.

## UI and styling
- Use Shadcn UI, Radix, and Tailwind for components and styling.
- Implement responsive design with Tailwind (mobile-first).
- Use `cn` for class name concatenation.
- Theme variables and Tailwind config are in `tooling/tailwind/theme.css`.

## Performance
- Minimize `"use client"`, `useEffect`, and `setState`.
- Favor React Server Components.
- Wrap client components in `Suspense` with a fallback.
- Use dynamic loading for non-critical components.
- Optimize images: WebP, size data, lazy loading.

## Naming conventions
- Directories: lowercase with dashes (e.g., `components/auth-wizard`).
- Components: PascalCase.
- Variables and methods: camelCase.
- Favor named exports for components.
