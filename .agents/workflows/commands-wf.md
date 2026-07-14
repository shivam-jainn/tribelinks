# Reusable Commands & Execution Guidelines

## Parallel Task Execution
Run tasks, builds, or commands in parallel where appropriate to save time and optimize execution.
For example, to run tasks in the background or simultaneously in shells:
```bash
# Example parallel command execution in zsh
command1 & command2 & wait
```
Or run dev servers/parallel watchers as specified in workspace workflows.
