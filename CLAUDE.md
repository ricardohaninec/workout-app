# CLAUDE.md

We're building the app described in @SPEC.MD. Read that file for general architectural tasks or to double-check the exact database structure, tech stack or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

## Agent Team

**Always read @TEAM.MD at the start of every session, before doing anything else**, even for investigations. It defines how the team works; never skip it.

For every request that changes code, first ask the user with AskUserQuestion (header "Workflow"): "Work following team standards (planner, coder, reviewer, security, tester), or regular flow?"
- **Team standards**: the main session follows @TEAM.MD as the orchestrator.
- **Regular flow**: ignore @TEAM.MD, do not run team agents, and work directly (still follow the Rules below).

Skip the question (and the team) for questions and other requests that change no code. If the user already states the workflow in the prompt (or says to skip the team), use that without asking. Agents running inside the team ignore this section and do only their own role.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run lint     # Run ESLint
npm start      # Start production server
npx tsc --noEmit  # TypeScript type check (run after every code change)
```

## Rules

- **Always run `npx tsc --noEmit` after making any code changes** to catch type errors before finishing.
- **Always run `npm run build` after completing any feature or significant change** to catch build-time errors (e.g. invalid arguments, missing files, Serwist/webpack issues) that TypeScript alone won't surface.

## Architecture

This is a Next.js 16 application using the App Router pattern with:

- **Package Manager**: npm (package-lock.json)
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS 4 with PostCSS
- **React**: Version 19

### Key Dependencies

- `@tiptap/*` - Rich text editor components
- `better-auth` - Authentication library
- `zod` - Schema validation

### Project Structure

- `app/` - Next.js App Router pages and layouts
- `@/*` path alias maps to project root
