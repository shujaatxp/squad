# Squad Dashboard Guide

## Overview

The Squad Dashboard is a **live operations view** for delegated work planning, coding, review, testing, logging, and release checks moving together.

**Status**: Squad idle (awaiting assignments) | Bridge ready (listening for session events)

## Dashboard Interface

The dashboard displays:

### Main Office Floor
- **7 Team Members**: Lead, Developer, Tester, Reviewer, DevRel, Security, Docs
- **Real-time Status**: Each member shows their current assignment and state (Waiting for assignment / Working / Done / Blocked)
- **Visual Workspace**: Interactive 3D-like office floor with agent positions and connection nodes
- **"On the Bench"**: Unassigned developers available for ad-hoc work

### Pipeline Stages (Right Panel)
- **Plan** — Requirements and design
- **Build** — Implementation and compilation
- **Security Review** — Vulnerability and best-practice checks
- **Code Review** — Peer review and quality gates
- **Test** — Integration and E2E validation
- **Docs & DevRel** — Documentation and release readiness
- **Shipped** — Deployment complete

### Agent Activity Log
- Real-time updates as work moves through the pipeline
- Bridge status and handoff messages
- Task progression tracking

### Squad Members Panel
- **Lead** (blue) — Planning and assignment
- **Developer** (yellow) — Building features
- **Tester** (cyan) — Quality assurance
- **Reviewer** (pink) — Code review
- **DevRel** (purple) — Developer relations
- **Security** (teal) — Security review
- **Docs** (orange) — Documentation

## Getting Started

### 1. Start the Dashboard Bridge

```powershell
cd c:\AiLearning.Api\squad
.\squad-dashboard-bridge\start-dashboard.ps1
```

The bridge server will start on:
```
http://127.0.0.1:8787/dashboard
```

### 2. Open the Dashboard

Open your browser and navigate to:
```
http://127.0.0.1:8787/dashboard
```

You'll see all 7 team members in their office, ready for assignments.

### 3. Start Copilot CLI

In another terminal, start Copilot CLI from the repo root:

```powershell
copilot
```

### 4. Watch Real-Time Updates

As you run Copilot CLI prompts:
- Agents automatically assign work
- The dashboard updates in real-time (~1.2s polling)
- Team member status changes from idle → working → done
- Pipeline stages light up as work progresses
- Activity log captures each handoff

## Updating Team Member Status

To manually update a team member's status (e.g., during manual testing or non-Copilot work):

```powershell
.\squad-dashboard-bridge\update-member.ps1 -Name developer -Role Developer -Task "Building sample-page.html" -Status working
```

**Status options**: `idle`, `working`, `done`, `blocked`

Example workflow:
```powershell
# Start work
.\squad-dashboard-bridge\update-member.ps1 -Name developer -Role Developer -Task "Implementing user auth" -Status working

# Complete work
.\squad-dashboard-bridge\update-member.ps1 -Name developer -Role Developer -Task "User auth complete" -Status done

# Mark as idle
.\squad-dashboard-bridge\update-member.ps1 -Name developer -Role Developer -Task "" -Status idle
```

## How It Works

1. **Copilot CLI** runs in your terminal and processes Squad prompts
2. **Repository Hooks** (`.github/hooks/squad-dashboard.json`) capture session events
3. **Bridge Server** (`bridge-server.mjs`) receives and stores state
4. **Dashboard** polls the bridge `/state` endpoint every ~1.2 seconds
5. **Browser UI** renders live team status and activity

## Bridge API

The bridge exposes:
- `GET /state` — Returns current squad state (members, tasks, activity)
- `GET /dashboard` — Serves the dashboard HTML UI
- `POST /member` — Updates a team member's status (used by `update-member.ps1`)

## Troubleshooting

### Bridge won't start
- Check that port 8787 is available: `netstat -ano | findstr :8787`
- Ensure Node.js is installed: `node --version`
- Check `.mcp.json` configuration

### Dashboard shows "Waiting for assignment" for all members
- Start Copilot CLI in another terminal
- Run a Squad-formatted prompt (e.g., `/squad help`)
- Wait for the bridge to receive the session event

### Changes don't appear on dashboard
- Verify the bridge is running (check terminal for "listening at...")
- Refresh the browser (F5)
- Check browser console for errors (F12)
- Ensure Copilot CLI is outputting events

## File Structure

```
squad-dashboard-bridge/
  ├── bridge-server.mjs          # Node.js server (port 8787)
  ├── start-dashboard.ps1        # Quick-start script
  ├── update-member.ps1          # Manual status update
  ├── plugin/
  │   ├── extension.mjs          # Copilot CLI hook integration
  │   └── plugin.json            # Plugin manifest
  └── README.md                  # (Original documentation)
```

## Next Steps

- Run Squad commands to see agents in action
- Use `update-member.ps1` to simulate team collaboration
- Check `.squad/` directory for team roster and routing rules
- Read `.squad/team.md` for agent charters and capabilities

