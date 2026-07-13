# Tribelinks

A modern, high‑performance link‑sharing platform built with **Fastify**, **Docker**, and **TypeScript**.

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

Tribelinks lets users create short, memorable links that redirect to any URL. It supports custom slugs, analytics, and an easy‑to‑use API.

## Features

- **Fast API** powered by Fastify
- **Docker‑first** deployment
- **Type‑safe** codebase with TypeScript
- **Environment‑driven** configuration (`.env` support)
- **Extensible** architecture (MVC pattern, plugin system)

## Architecture & Data Models

Tribelinks is designed around a structured MVC pattern on the backend (Fastify + PostgreSQL) paired with a Next.js frontend and a set of shared internal packages.

### Data Models

- **`User`** ([user.ts](file:///Users/shivamjain/Documents/antigravity/tribelinks/apps/server/src/models/user.ts)): Manages user credentials (PBKDF2 salted hashing), secure sessions, and API Keys for authenticated access to third-party endpoints.
- **`Contact`** ([contact.ts](file:///Users/shivamjain/Documents/antigravity/tribelinks/apps/server/src/models/contact.ts)): Stores client profiles (name, email, notes) representing recipients or targets of tracking campaigns.
- **`ShortLink`** ([short-link.ts](file:///Users/shivamjain/Documents/antigravity/tribelinks/apps/server/src/models/short-link.ts)): Links a unique key (custom slug) to a target destination URL, optionally associated with a specific contact.
- **`Event`** ([event.ts](file:///Users/shivamjain/Documents/antigravity/tribelinks/apps/server/src/models/event.ts)): Stores rich analytic details of interactions (IP, user-agent, session, duration, timestamp, and custom metadata).

### Core Functionality & Shared Packages

- **Redirect Engine & Event Ingestion**: Handles incoming traffic at `/r/:key`, tracks metrics, and redirects users. Event tracking uses a decoupled architecture powered by internal packages:
  - **`@tracker/core`**: Common schemas and type definitions for event data.
  - **`@tracker/queue`**: In-memory event queue manager (`InMemoryQueueAdapter`) that processes event tracking asynchronously to avoid blocking the client redirect loop.
  - **`@tracker/sdk`**: Client/Server tracker SDK for registering page view and custom tracking events.
- **Analytics Dashboard**: High-fidelity UI detailing page views, timeframe trends, device statistics, and geological metadata.
- **Campaign Link Tracking**: Advanced campaign-level tracking filters to trace which contacts clicked or haven't clicked a target link, styled with strike-through visualization for clicked leads.
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
