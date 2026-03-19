---
name: ez:resume
description: Resume from last session or navigate session chain
argument-hint: "[session_id] [--previous|--next|--chain]"
allowed-tools:
  - Read
  - Write
  - AskUserQuestion
  - Bash
---

<objective>
Resume work from the last session or navigate the session chain.

This command:
- Loads the most recent session from .planning/sessions/
- Displays a formatted summary with model, phase, plan, duration, and last activity
- Shows incomplete items, open decisions, and file changes
- Presents recommended next action
- Waits for user confirmation before proceeding
- Supports navigation through session chain (previous/next)
</objective>

<execution_context>
@~/.qwen/ez-agents/workflows/resume-session.md
</execution_context>

<context>
$ARGUMENTS

Session ID is optional. If not provided, the last session is loaded.
</context>

<process>
**Follow the resume-session workflow** from @~/.qwen/ez-agents/workflows/resume-session.md.

The workflow handles all resumption logic including:

1. **Load last session:**
   - Use ez-tools to access SessionManager
   - Call getLastSession()
   - If no sessions: output "No previous sessions found. Start a new session with your work."
   - Exit

2. **Parse session data:**
   - Extract: metadata (model, phase, plan, started_at, ended_at, status)
   - Extract: context (transcript, tasks, decisions, file_changes)
   - Extract: state (incomplete_tasks, last_action, next_recommended_action)

3. **Generate summary display:**
   - Use box-drawing characters for header:
     ```
     ╔══════════════════════════════════════════════════════════════╗
     ║  SESSION RESUME: {session_id}                                 ║
     ╠══════════════════════════════════════════════════════════════╣
     ║  Model: {model}                                              ║
     ║  Phase: {phase} - {phase_name}                               ║
     ║  Plan: {plan} - {plan_name}                                  ║
     ║  Duration: {calculated}                                      ║
     ║  Ended: {ended_at formatted}                                 ║
     ╚══════════════════════════════════════════════════════════════╝
     ```
   - Section: "## Last Activity" - shows last completed task and in-progress task
   - Section: "## Incomplete Items" - lists state.incomplete_tasks
   - Section: "## Open Decisions" - lists context.open_questions or "None"
   - Section: "## File Changes" - lists context.file_changes
   - Section: "## Recommended Next Action" - shows state.next_recommended_action

4. **Present options:**
   ```
   What would you like to do?

   1. Continue from last task
   2. Show full transcript
   3. Export session for handoff
   4. Navigate session chain
   5. Start fresh (ignore session)
   6. Something else
   ```

5. **Handle user choice:**
   - "1" or "Continue":
     - Update STATE.md with session continuity
     - Load session context into conversation
     - Proceed with recommended action
   - "2" or "Show transcript":
     - Display full transcript from session.context.transcript
   - "3" or "Export":
     - Trigger export-session workflow
   - "4" or "Navigate":
     - Show chain visualization
     - Offer: Previous, Next, Jump to specific
   - "5" or "Start fresh":
     - Acknowledge, start new context
   - "6" or "Something else":
     - Enter interactive mode

6. **On confirmation to continue:**
   - Call ez-tools state record-session with stopped-at and resume-file
   - Load relevant context files (PLAN.md, STATE.md, incomplete task files)
   - Output: "Resuming from {session_id}. Last action: {last_action}"

**Navigation flags:**
- `--previous`: Navigate to previous session in chain
- `--next`: Navigate to next session in chain
- `--chain`: Show full chain visualization
</process>
