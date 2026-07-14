# Documentation Refactor Workflow (`refactor-docs-wf`)

## Purpose
This workflow automates the reorganization of the agent guidelines and workflows into a clean subfolder hierarchy.

## Execution
Run the shell script to move and rename files to the correct subdirectories:

```bash
bash scripts/refactor-docs.sh
```

## Expected Output
All guidelines and `*-wf.md` files are moved into their respective folders (`plan/`, `impl/`, `verify/`, `debug/`, `workflows/`).
