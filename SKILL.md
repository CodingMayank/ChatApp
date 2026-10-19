---
name: concise-code-refactoring
description: "Simplify and organize NearbyChat code by removing safe-to-remove duplication, dead code, and unnecessary complexity while preserving behavior, security, readability, and project conventions. Use when asked to clean up, shorten, simplify, organize, or refactor this codebase."
---

# NearbyChat Code Simplification and Organization

## Purpose

Make NearbyChat code easier to understand and maintain by removing unnecessary complexity and duplication without changing externally observable behavior or weakening correctness, security, or readability. Optimize for clear responsibilities and logical organization, not fewer lines.

## When to Use

Use this skill when the user asks to:
- Simplify, clean up, or organize code.
- Remove dead code, redundant comments, or safe-to-remove duplication.
- Improve readability or maintainability without changing behavior.

Do not use this skill for unrelated cleanup, broad rewrites, or architectural changes unless explicitly requested. Limit edits to the requested area and directly related code.

## Project Context

NearbyChat uses React, TypeScript, and Vite for the client, with Node.js ESM API entry points and PostgreSQL-backed chat data. Follow the existing structure:

- `src/pages/` contains screen-level UI.
- `src/components/` contains shared app components; `src/components/ui/` contains reusable UI primitives.
- `src/hooks/` contains reusable React behavior and state.
- `src/lib/` contains shared client-side helpers and the API client.
- `src/integrations/supabase/` contains Supabase integration types and client setup.
- `server/index.mjs` and `api/index.mjs` are server API entry points; check both when changing behavior that must work in local and deployed environments.
- `supabase/migrations/` contains database migrations. Preserve schema and data semantics when changing persistence code.

Use the existing `@/` alias for imports from `src/`, follow nearby formatting and naming, and reuse established utilities and UI components instead of adding parallel implementations. Keep server-only credentials and database access out of browser code.

## Workflow

1. **Understand the scope and behavior**
   - Inspect the target code, relevant callers, and nearby tests or documentation.
   - Trace side effects, state, errors, validation, API contracts, and important edge cases before editing.
   - Identify which behavior and interfaces must remain unchanged. If an ambiguity could change behavior, ask a focused question; otherwise state the assumption.

2. **Choose the smallest coherent cleanup**
   - Remove genuinely unused code, imports, variables, and comments; consolidate duplication only when the logic and ownership are truly shared.
   - Keep modules and components focused on a clear responsibility. Extract a helper or component only when it improves reuse or clarity.
   - Prefer existing helpers and patterns over new abstractions or dependencies.
   - Simplify conditionals only when the result remains easy to read. Avoid code golf, clever one-liners, unnecessary indirection, and formatting churn.
   - Do not broaden the change to adjacent files just because they could also be cleaned up.

3. **Respect project behavior and boundaries**
   - For React changes, preserve hook rules, state transitions, rendering, loading/error states, and accessibility.
   - For API changes, preserve routes, request/response shapes, status codes, validation, and error behavior. Check both API entry points when the behavior applies to both local and deployed use.
   - For database changes, preserve authorization and data semantics; use migrations for schema changes.
   - Preserve authentication, input validation, parameterized queries, output encoding, and safeguards. Never hide errors, weaken types or validation, or introduce unsafe defaults to make code shorter.
   - Keep secrets out of source, browser bundles, and logs. Do not change unrelated dependencies, configuration, or architecture.

4. **Treat comments carefully**
   - Remove comments that merely repeat what the code plainly does.
   - Keep comments that explain business rules, non-obvious decisions, security constraints, invariants, or important trade-offs.
   - Update comments when the implementation changes.
   - Never remove required legal notices, license headers, attribution, or generated-file warnings.

5. **Validate and review**
   - Run the narrowest relevant checks. The project provides `npm run lint` and `npm run build`; use them as appropriate. Check `package.json` for available test scripts before claiming tests were run.
   - Add or update focused tests when the project has a relevant test setup and the refactor affects meaningful behavior.
   - Review the final diff for accidental changes and confirm the requested behavior remains intact.
   - If a check cannot run, report which one and why; never imply it passed.

## Output Requirements

Summarize the focused changes, any behavior changes or assumptions, and the checks run with their results. State any unverified checks or remaining risks. Keep the explanation concise without omitting material trade-offs or security implications.

## Acceptance Criteria

The refactor is complete only when the requested area is clearer or simpler, intended behavior and public contracts are preserved, security controls and error handling remain intact, and relevant validation is completed or explicitly reported as outstanding.
