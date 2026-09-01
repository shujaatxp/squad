import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.SQUAD_DASHBOARD_PORT ?? 8787);
const here = dirname(fileURLToPath(import.meta.url));
const dashboardPath = join(here, "..", "agent-dashboard.html");

// Full squad roster so every member is always visible on the office floor,
// even before they've been assigned a task. Each one activates ("working")
// only once the coordinator actually assigns them something.
const ROSTER = [
  { name: "lead", role: "Lead" },
  { name: "developer", role: "Developer" },
  { name: "tester", role: "Tester" },
  { name: "reviewer", role: "Reviewer" },
  { name: "devrel", role: "DevRel" },
  { name: "security", role: "Security" },
  { name: "docs", role: "Docs" }
];

// Extra developers sitting "on the bench" - shown in a separate box, not on
// the office floor. Clicking one on the dashboard posts a bench_join event;
// that developer then animates walking over to join the floor and picks up
// a share of the current developer's work.
const BENCH = [
  { name: "developer2", role: "Developer" },
  { name: "developer3", role: "Developer" }
];

function seedRoster() {
  const members = {};
  for (const { name, role } of ROSTER) {
    members[name] = {
      role,
      task: "Waiting for assignment",
      status: "idle",
      updatedAt: new Date().toISOString()
    };
  }
  return members;
}

const state = {
  active: false,
  prompt: "",
  phase: "idle",
  agentCount: 0,
  taskCount: 0,
  health: "Ready",
  stream: "Idle",
  updatedAt: new Date().toISOString(),
  events: ["Bridge ready. Start Copilot CLI with the dashboard plugin."],
  // members: name -> { role, task, status, updatedAt }
  // status is one of: working | done | blocked | idle
  members: seedRoster(),
  // Transient handoff ticket shown flying from one member's seat to another's
  // when work is passed along (e.g. Developer -> Tester). Cleared by the
  // dashboard once it finishes animating; null when no handoff is in flight.
  handoff: null,
  // Transient "thought bubble" popup: a short message a member pops up on
  // screen while discussing/planning/reviewing (e.g. agree/disagree during
  // a design discussion). Cleared client-side after it finishes animating.
  thought: null,
  // Pipeline phase tracker: shows which stage of the plan->ship workflow
  // is currently active, which are done, and which are still ahead.
  pipeline: {
    stages: ["Plan", "Build", "Security Review", "Code Review", "Test", "Docs & DevRel", "Shipped"],
    current: null,
    completed: []
  },
  // Extra developers waiting on the bench (not yet on the floor).
  bench: BENCH.map((b) => ({ ...b, status: "bench" })),
  // Transient "join" animation: a bench developer walking from the bench box
  // to a floor seat. Cleared client-side once the walk animation finishes.
  benchJoin: null
};

function countWorkingMembers() {
  return Object.values(state.members).filter((member) => member.status === "working").length;
}

function setCors(response) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function pushEvent(message) {
  state.events.unshift(message);
  state.events = state.events.slice(0, 5);
  state.updatedAt = new Date().toISOString();
}

function applyEvent(event) {
  const payload = event.payload ?? {};
  const prompt = payload.prompt || state.prompt || "Copilot CLI prompt";

  if (event.type === "plugin_loaded") {
    state.active = false;
    state.phase = "plugin ready";
    state.taskCount = 0;
    state.health = "Ready";
    state.stream = "Connected";
    state.members = seedRoster();
    state.agentCount = 0;
    state.pipeline.current = null;
    state.pipeline.completed = [];
    state.bench = BENCH.map((b) => ({ ...b, status: "bench" }));
    state.benchJoin = null;
    return;
  }

  if (event.type === "prompt") {
    state.prompt = prompt;
    return;
  }

  if (event.type === "turn_start") {
    state.active = true;
    state.prompt = prompt;
    state.phase = "working";
    state.health = "96%";
    state.stream = "Live";
    return;
  }

  if (event.type === "usage") {
    state.active = true;
    state.phase = "using model";
    state.taskCount = Object.keys(state.members).length + ((payload.usageCount ?? 0) % 7);
    state.health = `${96 + ((payload.usageCount ?? 0) % 4)}%`;
    state.stream = "Live";
    return;
  }

  // Real per-member status, pushed explicitly whenever the coordinator assigns
  // or completes work for a named squad member (see update-member.ps1).
  if (event.type === "member_status") {
    const name = String(payload.name || "unknown");
    const role = String(payload.role || name);
    const task = String(payload.task || "working");
    const status = String(payload.status || "working");

    // If a bench-joined member (e.g. developer2/developer3) has finished
    // their extra task, send them back to the bench instead of leaving
    // them idle on the floor — only the original roster stays seated.
    const isBenchMember = BENCH.some((b) => b.name === name);
    if (isBenchMember && (status === "done" || status === "idle")) {
      delete state.members[name];
      if (!state.bench.some((b) => b.name === name)) {
        const benchDef = BENCH.find((b) => b.name === name);
        state.bench.push({ ...benchDef, status: "bench" });
      }
      state.agentCount = countWorkingMembers();
      state.taskCount = Object.keys(state.members).length;
      state.stream = "Live";
      pushEvent(`${name} (${role}) finished up and returned to the bench.`);
      state.thought = {
        name,
        role,
        message: `Done: ${task}. Heading back to the bench.`,
        stance: "agree",
        id: `${name}-${Date.now()}`,
        at: new Date().toISOString()
      };
      return;
    }

    state.members[name] = {
      role,
      task,
      status,
      updatedAt: new Date().toISOString()
    };

    state.active = true;
    state.phase = "working";
    state.agentCount = countWorkingMembers();
    state.taskCount = Object.keys(state.members).length;
    state.stream = "Live";
    pushEvent(`${name} (${role}): ${task} [${status}]`);

    // Auto-pop a "thinking" bubble for every status change so the audience
    // always sees what a member is currently doing, not just explicit
    // opinions raised via the thought event.
    const autoStance = status === "done" ? "agree" : status === "blocked" ? "disagree" : "neutral";
    state.thought = {
      name,
      role,
      message: task,
      stance: autoStance,
      id: `${name}-${Date.now()}`,
      at: new Date().toISOString()
    };
    return;
  }

  // Visual handoff: a task ticket flies from one member's seat to another's
  // on the dashboard, so the audience can see work being passed along (e.g.
  // Developer finishes a page -> hands it to Tester) before the receiving
  // member flips to "working".
  if (event.type === "handoff") {
    const from = String(payload.from || "");
    const to = String(payload.to || "");
    const task = String(payload.task || "task");

    state.handoff = {
      from,
      to,
      task,
      id: `${from}-${to}-${Date.now()}`,
      at: new Date().toISOString()
    };

    pushEvent(`${from} handed off "${task}" to ${to}.`);
    return;
  }

  // Thought bubble: a member "says" something (plan note, security concern,
  // agreement/disagreement) that pops up as a balloon over their seat.
  if (event.type === "thought") {
    const name = String(payload.name || "unknown");
    const role = String(payload.role || name);
    const message = String(payload.message || "...");
    const stance = String(payload.stance || "neutral"); // agree | disagree | neutral | idea

    state.thought = {
      name,
      role,
      message,
      stance,
      id: `${name}-${Date.now()}`,
      at: new Date().toISOString()
    };

    pushEvent(`${name} (${role}) [${stance}]: ${message}`);
    return;
  }

  if (event.type === "member_reset") {
    state.members = seedRoster();
    state.agentCount = 0;
    state.pipeline.current = null;
    state.pipeline.completed = [];
    state.bench = BENCH.map((b) => ({ ...b, status: "bench" }));
    state.benchJoin = null;
    return;
  }

  // Pipeline phase tracker: coordinator declares which stage of the
  // plan->ship workflow is active. Any stages skipped over are marked
  // completed too (e.g. going straight to "Test" implies Plan/Build/Security
  // Review/Code Review already happened).
  if (event.type === "phase") {
    const stageName = String(payload.stage || "");
    const stages = state.pipeline.stages;
    const index = stages.indexOf(stageName);

    if (index !== -1) {
      state.pipeline.current = stageName;
      state.pipeline.completed = stages.slice(0, index);
      pushEvent(`Pipeline phase: ${stageName}`);
    } else if (stageName.toLowerCase() === "reset") {
      state.pipeline.current = null;
      state.pipeline.completed = [];
    }
    return;
  }

  // A bench developer is clicked to join the floor: remove them from the
  // bench, animate a walk-over on the dashboard, then seat them as a real
  // working member picking up a DIFFERENT slice of work (not a duplicate of
  // whichever teammate already shares their role).
  if (event.type === "bench_join") {
    const name = String(payload.name || "");
    const benchMember = state.bench.find((b) => b.name === name);
    if (!benchMember) return;

    state.bench = state.bench.filter((b) => b.name !== name);

    // Find how many members already share this role and are actively
    // working, so the joining member gets distinct work, not a copy.
    const sameRoleWorking = Object.values(state.members).filter(
      (m) => m.role === benchMember.role && m.status === "working"
    ).length;

    const primaryTask = (state.members.developer && state.members.developer.task) || "the current build";
    const defaultTask = sameRoleWorking > 0
      ? `Picking up a separate item while others handle: ${primaryTask}`
      : `Helping with: ${primaryTask}`;
    const task = String(payload.task || defaultTask);

    state.benchJoin = {
      name,
      role: benchMember.role,
      id: `${name}-${Date.now()}`,
      at: new Date().toISOString()
    };

    state.members[name] = {
      role: benchMember.role,
      task,
      status: "working",
      updatedAt: new Date().toISOString()
    };

    state.active = true;
    state.agentCount = countWorkingMembers();
    state.taskCount = Object.keys(state.members).length;
    state.stream = "Live";
    pushEvent(`${name} (${benchMember.role}) joined the floor to help: ${task}`);
    return;
  }

  if (event.type === "turn_end") {
    state.active = false;
    state.phase = "complete";
    for (const [name, member] of Object.entries(state.members)) {
      if (member.status === "working" || member.status === "idle") {
        const isBenchMember = BENCH.some((b) => b.name === name);
        if (isBenchMember) {
          delete state.members[name];
          if (!state.bench.some((b) => b.name === name)) {
            const benchDef = BENCH.find((b) => b.name === name);
            state.bench.push({ ...benchDef, status: "bench" });
          }
        } else {
          member.status = "idle";
        }
      }
    }
    state.agentCount = countWorkingMembers();
    state.taskCount = Object.keys(state.members).length;
    state.stream = "Complete";
  }
}

const server = http.createServer(async (request, response) => {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/state") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(state));
    return;
  }

  if (request.method === "GET" && (request.url === "/" || request.url === "/dashboard")) {
    try {
      const html = await readFile(dashboardPath, "utf8");
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(String(error));
    }
    return;
  }

  if (request.method === "POST" && request.url === "/event") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        applyEvent(JSON.parse(body || "{}"));
        response.writeHead(204);
        response.end();
      } catch (error) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: String(error) }));
      }
    });
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

server.listen(port, host, () => {
  console.log(`Squad dashboard bridge listening at http://${host}:${port}`);
  console.log(`Dashboard: http://${host}:${port}/dashboard`);
  console.log("Start Copilot CLI from this repo with: copilot");
});
