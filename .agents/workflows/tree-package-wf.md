# Repository Structure Discovery Workflow (`tree-package-wf`)

## Execution
Run the following commands to get a high-level view of the repository layout:

```bash
tree -L 3 -I 'node_modules|.git|dist|.next'
find . -maxdepth 3 -name package.json
```

## Expected Output
- High-level directory tree of packages and applications.
- List of package.json files identifying workspace boundaries.

## Information to Collect
- Monorepo package structure.
- Build system/workspace orchestrator configuration.

## Consumption
- Used during the planning phase to identify correct directories for code changes and dependencies.
