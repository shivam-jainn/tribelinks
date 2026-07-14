# Workflow Discovery & Decomposition

## Identifying Reusable Workflows
During the planning phase:
1. Determine if a reusable workflow already exists in `.agents/*-wf.md`.
2. If not, evaluate if the sequence of commands can be automated via:
   - An npm script
   - A Makefile target or Taskfile/Justfile task
   - A standalone shell script

## Post-Execution Creation
At the end of any task execution/verification:
1. Review the commands and processes performed.
2. If it makes sense to do so (e.g. if the steps are repeatable or could benefit future tasks), create a new `*-wf.md` file in `.agents/`.
3. Decompose workflows into smaller, modular sub-workflows if they contain independent, reusable parts.
4. Reference these workflows in future plans to avoid repeating instructions and save tokens.
