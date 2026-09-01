# Squad Dashboard Bridge

This local bridge connects GitHub Copilot CLI hook events to `agent-dashboard.html`.

## Start the bridge

```powershell
node .\squad-dashboard-bridge\bridge-server.mjs
```

Open the live dashboard at:

```text
http://127.0.0.1:8787/dashboard
```

## Start Copilot CLI

In another terminal from the repo root, start Copilot CLI normally:

```powershell
copilot
```

Repository hooks in `.github/hooks/squad-dashboard.json` post session and prompt events to the bridge. When you submit a Copilot CLI prompt, the dashboard changes from idle to working; when the turn stops, it returns to idle/complete.

## Real-time per-member status

The dashboard no longer simulates activity locally — it **polls `/state` on the
bridge** every ~1.2s and renders whatever is really happening.

Whenever a squad session assigns, progresses, or finishes work for a named
member (e.g. `developer`, `tester`, `lead`), report it to the bridge with:

```powershell
.\squad-dashboard-bridge\update-member.ps1 -Name developer -Role Developer -Task "Building sample-page.html" -Status working
.\squad-dashboard-bridge\update-member.ps1 -Name tester -Role Tester -Task "Smoke testing sample-page.html" -Status working
.\squad-dashboard-bridge\update-member.ps1 -Name developer -Role Developer -Task "sample-page.html complete" -Status done
```

`-Status` accepts `working`, `done`, `blocked`, or `idle`. The dashboard's
member list, office avatars (for `developer`/`tester`), agent/task counters,
and activity log all update live from this — no manual refresh needed. This
call is best-effort and never blocks the calling session if the bridge isn't
running.

