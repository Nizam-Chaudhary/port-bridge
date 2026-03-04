# AGENTS.md

This is Electron GUI app to manage port forwarding and ssh remote hosts

## Plan Mode instructions

- When writing plans, be extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, list unresolved questions. Ask about edge cases, error handling, and unclear requirements before proceeding.
- End every plan with a numbered list of concrete steps. This should be the last thing visible in the terminal.

## Common instructions

- use `bun` as package manager
- use `bun format` always to format
- use `bun lint:type:fix` always to fix linting errors
- use `bunx --bun shadcn@latest <component-name>` to add shadcn ui components

## Shadcn instructions

- use `bunx --bun shadcn@latest add <component-name>` to add shadcn ui components
- uses `base ui` components for the base
- check documentation for components at `https://ui.shadcn.com/docs/components/base/<component-name>`
- check documentation for forms at `https://ui.shadcn.com/docs/forms/tanstack-form`
