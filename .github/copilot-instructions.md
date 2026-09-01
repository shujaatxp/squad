# Repository Overview

This repository currently contains only the **Squad** scaffolding (`@bradygaster/squad-cli`) — no application source code has been added yet. There is no `package.json`, build tool, test runner, or linter at the project root, so there are no build/test/lint commands to run. If application code is added later, this section should be updated with the relevant commands.

## Architecture

Squad turns Copilot into a virtual team of role-based agents that collaborate on this repo:

- **`.squad/team.md`** — team roster (lead, reviewer, devrel, security, docs) plus the special `Coding Agent` (`@copilot`) row with its 🟢/🟡/🔴 capability profile used for auto-routing GitHub issues.
- **`.squad/routing.md`** — work-type → agent routing table and rules used by the coordinator to decide who handles a task.
- **`.squad/agents/{name}/charter.md`** — each member's identity, expertise, working style, and boundaries ("what I own" / "what I don't handle"). When a `squad:{member}` label is present, work should be done in that member's voice per their charter.
- **`.squad/decisions.md`** — merged, canonical record of team decisions; individual agents propose new decisions as files under `.squad/decisions/inbox/`, which the **Scribe** agent merges in.
- **`.squad/ceremonies.md`** — auto-triggered team "meetings" (e.g. Design Review before multi-agent work, Retrospective after failures) with trigger conditions, facilitator, and agenda.
- **`.squad/casting/`** — runtime state for agent "casting" (persistent identities/universe assignments), not hand-edited.
- **`.github/agents/squad.agent.md`** — the Squad coordinator's full agent definition (large; read with `grep`/`view_range`, not a full read).
- **`.github/workflows/squad-*.yml`** — automation: `squad-triage.yml` parses `team.md`/`routing.md` to auto-label and (optionally) auto-assign new `squad`-labeled issues to the right member or `@copilot`; `squad-issue-assign.yml`, `squad-heartbeat.yml`, `sync-squad-labels.yml` handle assignment, periodic heartbeats, and label sync.
- **`.specify/`** — Spec-Kit integration (spec/plan/tasks workflow templates and PowerShell scripts under `.specify/scripts/powershell/`), driven by the `speckit-*` skills in `.github/skills/`. `.specify/memory/constitution.md` is still the unfilled template — populate it via the `speckit-constitution` skill if project principles are defined later.
- **`.mcp.json`** — configures the `squad_state` MCP server (`@bradygaster/squad-cli state-mcp`) used to read/write Squad state.

## Key Conventions

- Squad's own reference material lives twice: the **active** copy (`.squad/`, `.github/skills/`) and the **template** copy (`.squad/templates/`) used to scaffold new sections or reset defaults — don't confuse the two when editing.
- Agent charters define tone/voice for issue work; check for a `squad:{member}` label before writing code so the PR reads consistently with that member's charter.
- Decisions are append-only via the inbox pattern — never hand-edit `.squad/decisions.md` directly; drop a new file in `.squad/decisions/inbox/`.
- Skills in `.github/skills/*/SKILL.md` are the authoritative, on-demand protocol docs (e.g. `git-workflow`, `reviewer-protocol`, `speckit-*`); consult the matching skill before performing that category of work rather than improvising.

# Copilot Coding Agent — Squad Instructions

You are working on a project that uses **Squad**, an AI team framework. When picking up issues autonomously, follow these guidelines.

## Coordinator Canary Check

**IMPORTANT — run this check on EVERY session start, before doing any work:**

Inspect your `agent_instructions` for the coordinator canaries. This is a **two-state payload-integrity check within a known Squad coordinator session**; it verifies whether the coordinator payload loaded fully or was visibly truncated. It is **not** proof that an agent with no canaries is safely non-Squad — wholly absent payloads and proven non-Squad agents require a host-level identity beacon before custom-agent instruction ingestion.

1. If the HEAD canary `SQUAD_COORDINATOR_CANARY_HEAD_b7d2` is **absent**, the Squad coordinator payload is not observable from inside this prompt. Treat non-Squad discrimination as an **OPEN host-level concern**; do not claim this check proved the current agent is non-Squad.
2. If the HEAD canary `SQUAD_COORDINATOR_CANARY_HEAD_b7d2` is **present** and the EOF canary `SQUAD_COORDINATOR_CANARY_a8f3` is **present**, the coordinator prompt loaded fully. Proceed with normal Squad behavior.
3. If the HEAD canary `SQUAD_COORDINATOR_CANARY_HEAD_b7d2` is **present** but the EOF canary `SQUAD_COORDINATOR_CANARY_a8f3` is **absent**, the coordinator prompt loaded but was **truncated** before the end.

**When the coordinator prompt is truncated, you MUST:**
1. **STOP** — do not proceed with standard Squad behavior.
2. **WARN the user** with this exact message:
   ```
   ⚠️ Squad coordinator (squad.agent.md) loaded but appears to be truncated before the EOF canary. Do NOT proceed with standard Squad behavior — Squad's safety rails are incomplete. Please restart your session.
   ```
3. Do not continue with normal Squad routing, spawning, PR, or branch-protection behavior after emitting the warning.

## Team Context

Before starting work on any issue:

1. Read `.squad/team.md` for the team roster, member roles, and your capability profile.
2. Read `.squad/routing.md` for work routing rules.
3. If the issue has a `squad:{member}` label, read that member's charter at `.squad/agents/{member}/charter.md` to understand their domain expertise and coding style — work in their voice.

## Capability Self-Check

Before starting work, check your capability profile in `.squad/team.md` under the **Coding Agent → Capabilities** section.

- **🟢 Good fit** — proceed autonomously.
- **🟡 Needs review** — proceed, but note in the PR description that a squad member should review.
- **🔴 Not suitable** — do NOT start work. Instead, comment on the issue:
  ```
  🤖 This issue doesn't match my capability profile (reason: {why}). Suggesting reassignment to a squad member.
  ```

## Branch Naming

Use the squad branch convention:
```
squad/{issue-number}-{kebab-case-slug}
```
Example: `squad/42-fix-login-validation`

## PR Guidelines

When opening a PR:
- Reference the issue: `Closes #{issue-number}`
- If the issue had a `squad:{member}` label, mention the member: `Working as {member} ({role})`
- If this is a 🟡 needs-review task, add to the PR description: `⚠️ This task was flagged as "needs review" — please have a squad member review before merging.`
- Follow any project conventions in `.squad/decisions.md`

## Decisions

If you make a decision that affects other team members, write it to:
```
.squad/decisions/inbox/copilot-{brief-slug}.md
```
The Scribe will merge it into the shared decisions file.
