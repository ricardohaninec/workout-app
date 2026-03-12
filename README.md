# Workout App

A Next.js workout tracking application built with React 19, TypeScript, and PostgreSQL.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL (via `pg`)
- **Auth**: better-auth
- **Package Manager**: Bun

## Running Locally

### Prerequisites

- [Bun](https://bun.sh) installed
- [Docker](https://www.docker.com) installed (for the local database).

### 1. Install dependencies

```bash
bun install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```env
BETTER_AUTH_SECRET=your_secret_here
BETTER_AUTH_URL=http://localhost:8080

# Local database (Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/workout

# Production (Supabase) — swap this in when deploying
# DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres
```

### 3. Start the database

```bash
bun db:up
```

This starts a PostgreSQL 16 container on port `5433` (to avoid conflicts with any local PostgreSQL on 5432).

### 4. Initialise the schema

```bash
bun run db:init
```

### 5. Run migrations

```bash
bun run db:migrate-wip           # workout_in_progress tables
bun run db:migrate-item-note     # note column on workout_item
bun run db:migrate-set-complete  # is_complete column on workout_in_progress_set
bun run db:migrate-rest-seconds  # rest_seconds column on workout_item_set
```

### 6. (Optional) Seed with mock data

Populates the DB with exercises, workouts, and completed sessions for development:

```bash
bun run db:seed
```

Login credentials after seeding: `dev@example.com` / `password`

### 7. Start the development server

```bash
bun dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## Available Commands

```bash
bun dev                          # Start development server (port 8080)
bun run build                    # Build for production
bun run lint                     # Run ESLint
bun start                        # Start production server

bun run db:up                    # Start local PostgreSQL Docker container
bun run db:down                  # Stop local PostgreSQL Docker container
bun run db:init                  # Initialise database schema
bun run db:migrate-wip           # Add workout_in_progress tables
bun run db:migrate-item-note     # Add note column to workout_item
bun run db:migrate-set-complete  # Add is_complete column to workout_in_progress_set
bun run db:migrate-rest-seconds  # Add rest_seconds column to workout_item_set
bun run db:seed                  # Populate DB with mock data (dev@example.com / password)
bun run db:test                  # Test database connection
```

## Production (Supabase)

The app is designed to connect to a [Supabase](https://supabase.com) PostgreSQL database in production.

Use the **Transaction Pooler** connection string from your Supabase dashboard (`Project → Connect → Transaction pooler`) to avoid IPv6 connectivity issues:

```
postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres
```

Set this as `DATABASE_URL` in your production environment variables and run `bun db:init` once to create the schema.
