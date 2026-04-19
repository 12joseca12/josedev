# AGENTS.md

## Purpose
This repository uses a coordinated multi-agent workflow. All agents and subagents must follow the same source of truth defined in this file and in `.cursor/rules/*`.

The goal is not only to implement features, but to do so with:
- strong architecture
- professional UI quality
- responsive behavior
- accessibility
- SEO
- security
- maintainability
- strict typing
- centralized literals
- centralized style tokens

## Mandatory workflow
For medium and large tasks, the system must follow this execution model:

1. The orchestrator analyzes the request.
2. The orchestrator decomposes the task into specialized subtasks.
3. Each specialist works only within its scope.
4. A final reviewer validates consistency, integration quality, and rule compliance.
5. If the task affects architecture, README or developer workflow, documentation must be updated.

Agents are allowed to write code directly, but they must do so under this orchestration model.

## Core repository constraints
- Stack: Next.js + React + TypeScript + Tailwind + Supabase
- Routing: App Router under `src/app` (routes, layouts, `page.tsx`)
- Shared foundations live under `src/lib/`:
  - `src/lib/types.ts` (single shared types file)
  - `src/lib/literals.json` and `src/lib/literalsEn.json` (user-facing copy)
  - `src/lib/stylesVariables.ts` (design tokens)
- Service modules live under `src/services/` (English names only for top-level source folders).
- Preferred project structure for features (all under `src/` as the codebase grows):
  - `screens`
  - `components`
  - `hooks`
  - `services`

## Non-negotiable rules
- No hardcoded user-facing text in components, pages, hooks, or services.
- All user-facing text must come from centralized literals files.
- Do not use `any`.
- Avoid React Context unless clearly justified and necessary.
- Avoid oversized components; split logic and UI when complexity grows.
- Centralize reusable types in a single `src/lib/types.ts`.
- Centralize reusable style tokens in a single `src/lib/stylesVariables.ts`.
- Reuse patterns and existing abstractions before creating new ones.
- Prefer clean, premium, modern UI.
- Responsive behavior must be verified with mobile-first thinking.
- Accessibility must be implemented and reviewed, not treated as optional.
- SEO must be reviewed professionally for public pages.
- Security must be considered whenever auth, forms, storage, access control, external input, or data exposure are involved.

## Priority order for implementation decisions
When tradeoffs exist, prioritize:
1. development speed
2. performance
3. visual quality
4. responsive behavior
5. SEO
6. accessibility

Even with this priority order, accessibility and SEO are still required and must not be ignored.

## Design source of truth
If a design exists in Stitch or related design sources, agents must use it as reference and extract reusable UI patterns, tokens, and interaction intent from it.

## Required specialized concerns
The system must support specialist agents for:
- orchestration
- architecture/context analysis
- UI implementation
- responsive verification
- accessibility review and implementation
- professional SEO review and optimization
- type system consolidation into `src/lib/types.ts`
- style token consolidation into `src/lib/stylesVariables.ts`
- literals/i18n enforcement using centralized files
- Supabase/data/security review
- testing and quality validation
- documentation/readme maintenance

## Definition of done
A task is only considered complete if:
- implementation works
- code follows repository structure
- types are correct
- literals are centralized
- style reuse is respected
- responsive behavior is considered
- accessibility is validated
- SEO is validated when applicable
- security is reviewed when applicable
- tests are added for almost every new component
- lint/typecheck/test expectations are satisfied
- README is updated when the change is important

## Stitch design references
When the user provides Stitch links, those links become the visual source of truth for the relevant scope.

Agents must:
- inspect the Stitch reference before implementing UI
- extract reusable patterns instead of copying blindly
- infer colors, spacing, typography, radii, shadows, layout, and visual hierarchy
- translate repeated design decisions into `stylesVariables.ts`
- preserve premium and modern quality
- maintain responsive behavior and accessibility
- avoid hardcoded visual decisions that should become reusable tokens

If multiple Stitch references are provided, agents must determine whether they represent:
- global design system references
- screen-specific references
- section-specific references

When in doubt, prioritize consistency with the dominant visual system.

## Rule files
All agents must also follow:
- `.cursor/rules/00-foundations.md`
- `.cursor/rules/10-architecture.md`
- `.cursor/rules/20-ui-ux.md`
- `.cursor/rules/30-seo-a11y.md`
- `.cursor/rules/40-types-styles-literals.md`
- `.cursor/rules/50-data-supabase-security.md`
- `.cursor/rules/60-testing-quality.md`
- `.cursor/rules/70-agent-orchestration.md`