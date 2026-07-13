# Tribelinks

![tribelinks banner](assets/banner.png)

A modern, high-performance link-management and analytics platform built with **Next.js**, **PostgreSQL**, **TypeScript**, and **TailwindCSS**.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Overview

Tribelinks is an open-source URL management infrastructure that enables Modern Marketing Teams and developers to create short, memorable links with custom targeting rules, track real-time analytics, and manage campaigns.

## Features

- **Full-Stack Next.js**: Fast page loads and optimized backend route handler endpoints.
- **Robust Authentication**: Powered by Better Auth with sign-in, signup, and API keys.
- **Hybrid Analytics Engine**: Native support for **ClickHouse** with a high-performance **PostgreSQL fallback** (`PostgresAnalyticsStore`), ensuring data persistence without complex infrastructure.
- **Dynamic Link Routing**: Route incoming traffic based on geo-location, device user-agent, or weight-based A/B testing.
- **Campaigns & Outreach**: Bulk-create links linked to contacts, track leads, and see who has clicked in real time.

## Architecture & Data Models

Tribelinks utilizes a monorepo structure with a Next.js application containing all frontend interfaces and API route handlers, combined with modular packages.

### Data Models

- **`User`** ([user.ts](file:///Users/shivamjain/Documents/antigravity/tribelinks/apps/web/src/server/models/user.ts)): Handles authorization, secure sessions, and developer API keys.
- **`Contact`** ([contact.ts](file:///Users/shivamjain/Documents/antigravity/tribelinks/apps/web/src/server/models/contact.ts)): Stores contacts for tracking campaign engagement.
- **`ShortLink`** ([short-link.ts](file:///Users/shivamjain/Documents/antigravity/tribelinks/apps/web/src/server/models/short-link.ts)): Custom slug redirections with rules, campaign association, and target URLs.
- **`Event`** ([event.ts](file:///Users/shivamjain/Documents/antigravity/tribelinks/apps/web/src/server/models/event.ts)): Analytical click/redirection metrics (IP, OS, browser, duration, and custom metadata).

### Core Functionality & Shared Packages

- **Redirect Engine & Event Ingestion**: Automatically intercepts traffic at `/r/:key`, registers events, and redirects matching targeting rules.
  - **`@tracker/core`**: Schema definitions, filters, and standard store interfaces.
  - **`@tracker/config`**: Unified configuration and schema validation.
  - **`@tracker/sdk`**: Client/Server tracker SDK for custom events.
- **Analytics Dashboard**: Clean, responsive graphics showing referrers, timeframe breakdowns, unique visitor numbers, and geo-data.
- **Campaign Manager**: Filters and strike-through views to easily track contacts clicking campaign links.
- **URL Shortener API**: Secure URL creation and key collision handling via programmatic API endpoints.

## Prerequisites

- **Node.js** (v20 or later) – we recommend using the bundled Bun runtime.
- **Docker** & **Docker‑Compose**
- **Git**

## Installation

```bash
# Clone the repo
git clone https://github.com/your‑username/tribelinks.git
cd tribelinks

# Install dependencies (using bun)
bun install
```

## Running the Application

```bash
# Development (with hot‑reload)
bun run dev

# Production (Docker)
docker compose -f docker-prod-compose.yml up -d
```

## Development Workflow

### Branching Model

We follow a **Git‑Flow‑inspired** model:

- `master` – stable, production‑ready code.
- Feature branches prefixed with `feat/`, `fix/`, `docs/`, etc.
- Pull requests must pass CI and be reviewed.

### Conventional Commits

All commits should follow the **Conventional Commits** specification, e.g.:

```
feat: add user authentication
fix: correct typo in README
docs: update API documentation
```

### Stashing & Merging

When switching workstreams, stash your local changes:

```bash
git stash push -u   # include untracked files
```

To apply later:

```bash
git stash pop
```

## Testing

```bash
bun test
```

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/awesome-feature`).
3. Follow the **Conventional Commits** style.
4. Open a Pull Request.

## License

All rights reserve @ Shivam Jain
