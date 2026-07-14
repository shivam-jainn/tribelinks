#!/bin/bash
set -e

# Define directories
PLAN_DIR=".agents/plan"
IMPL_DIR=".agents/impl"
VERIFY_DIR=".agents/verify"
DEBUG_DIR=".agents/debug"
WORKFLOWS_DIR=".agents/workflows"

# Create directories
mkdir -p "$PLAN_DIR" "$IMPL_DIR" "$VERIFY_DIR" "$DEBUG_DIR" "$WORKFLOWS_DIR"

# Helper function to move if exists
move_if_exists() {
  local src="$1"
  local dest="$2"
  if [ -f "$src" ]; then
    mv "$src" "$dest"
    echo "Moved $src to $dest"
  fi
}

# Move planning files
move_if_exists ".agents/agent-plan.md" "$PLAN_DIR/agent-plan.md"
move_if_exists ".agents/implementation-plan-format.md" "$PLAN_DIR/plan-format.md"
move_if_exists ".agents/microtask-guidelines.md" "$PLAN_DIR/microtasks.md"
move_if_exists ".agents/workflow-discovery.md" "$PLAN_DIR/discovery.md"

# Move implementation files
move_if_exists ".agents/agent-implementation.md" "$IMPL_DIR/agent-impl.md"
move_if_exists ".agents/coding-guidelines.md" "$IMPL_DIR/coding.md"
move_if_exists ".agents/automation-guidelines.md" "$IMPL_DIR/automation.md"

# Move verification files
move_if_exists ".agents/agent-verify.md" "$VERIFY_DIR/agent-verify.md"
move_if_exists ".agents/verify-wf.md" "$VERIFY_DIR/verify-wf.md"

# Move debug files
move_if_exists ".agents/agent-debug.md" "$DEBUG_DIR/agent-debug.md"
move_if_exists ".agents/logging-wf.md" "$DEBUG_DIR/logging-wf.md"
move_if_exists ".agents/profiling-wf.md" "$DEBUG_DIR/profiling-wf.md"
move_if_exists ".agents/diagnostics-wf.md" "$DEBUG_DIR/diagnostics-wf.md"

# Move workflows
move_if_exists ".agents/tree-package-wf.md" "$WORKFLOWS_DIR/tree-package-wf.md"
move_if_exists ".agents/reusable-commands.md" "$WORKFLOWS_DIR/commands-wf.md"

echo "Documentation refactored successfully!"
