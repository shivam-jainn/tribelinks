# Workflow Discovery & Search Workflow (`discovery-wf`)

## Purpose
This workflow enables fast search and semantic matching of workflows in the workspace, reducing token usage by loading only matching files.

## Execution

### 1. Build or Update Search Index
Run this command to crawl `.agents/` and update the local JSON search index:
```bash
node scripts/discover-workflows.js --index
```

### 2. Search for Guidelines or Workflows
Run this command to search for workflows matching a specific keyword (e.g. `verify`, `plan`, `coding`):
```bash
node scripts/discover-workflows.js verify
```

## Expected Output
A lists of matched documents, including titles, markdown paths, and file schemes for immediate reading.
