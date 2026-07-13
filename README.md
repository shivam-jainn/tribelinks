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
