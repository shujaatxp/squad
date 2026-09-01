import { joinSession } from "@github/copilot-sdk/extension";
import http from "node:http";
import { URL } from "node:url";

const bridgeUrl = process.env.SQUAD_DASHBOARD_BRIDGE_URL ?? "http://127.0.0.1:8787/event";
let activePrompt = "Copilot CLI session";
let usageCount = 0;

function send(type, payload = {}) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      type,
      payload,
      at: new Date().toISOString()
    });

    try {
      const url = new URL(bridgeUrl);
      const request = http.request({
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body)
        }
      }, (response) => {
        response.resume();
        response.on("end", resolve);
      });

      request.on("error", resolve);
      request.end(body);
    } catch {
      resolve();
    }
  });
}

const session = await joinSession({});
await send("plugin_loaded", { prompt: activePrompt });
await session.log("Squad dashboard bridge active", { ephemeral: true }).catch(() => {});

session.on("user.message", (event) => {
  const text = event?.data?.message ?? event?.data?.content ?? event?.data?.text;
  if (typeof text === "string" && text.trim()) {
    activePrompt = text.trim().slice(0, 180);
    send("prompt", { prompt: activePrompt });
  }
});

session.on("assistant.turn_start", () => {
  usageCount = 0;
  send("turn_start", { prompt: activePrompt });
});

session.on("assistant.usage", (event) => {
  usageCount += 1;
  const data = event?.data ?? {};
  send("usage", {
    prompt: activePrompt,
    model: data.model ?? "unknown",
    cacheReadTokens: data.cacheReadTokens,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    usageCount
  });
});

session.on("assistant.turn_end", () => {
  send("turn_end", { prompt: activePrompt, usageCount });
});
