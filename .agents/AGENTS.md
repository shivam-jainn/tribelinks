# Agent Guidelines & Rules

## MANDATORY Workflow Discovery
Before starting any planning or coding task, you MUST search for existing guidelines and reusable workflows:
1. Run the discovery CLI tool with relevant keywords matching your task:
   ```bash
   node scripts/discover-workflows.js <keyword>
   ```
2. Review the matched workflow files and read them to reuse existing scripts, commands, and patterns.
3. If no matching workflow is found, consult the standard phase-specific routers:

- **Planning**: [agent-plan.md](file:///Users/shivamjain/Documents/antigravity/tribelinks/.agents/plan/agent-plan.md)
- **Implementation**: [agent-impl.md](file:///Users/shivamjain/Documents/antigravity/tribelinks/.agents/impl/agent-impl.md)
- **Verification**: [agent-verify.md](file:///Users/shivamjain/Documents/antigravity/tribelinks/.agents/verify/agent-verify.md)
- **Debugging**: [agent-debug.md](file:///Users/shivamjain/Documents/antigravity/tribelinks/.agents/debug/agent-debug.md)
