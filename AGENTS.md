# AGENTS.md

## Plan Mode

Make the plan extremely concise. Sacrifice grammar for the sake of concision.

## Task Completion Requirements

- All of `bun run format`, `bun run lint:type:fix` must pass before considering tasks completed.

## Project Snapshot

SSH Manager is a minimal GUI for Planning and Managing SSH hosts and port forwarding.

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures.

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long term maintainability is a core priority. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Repository Structure

- uses type based folders like `components`, `lib`, `routes`, etc...
- keep related code together and inside same file if it belongs there.
- Keep nesting shallow. Avoid creating extra nesting with directories unless they remove real duplication.
