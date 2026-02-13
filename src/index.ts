#!/usr/bin/env node

import EventSource from "eventsource";
import { normalizeTopicUrl, createPayload, NtfyMessage, ParsedArgs } from "./lib.js";

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const topics: string[] = [];
  let forward = "";
  const headers: Record<string, string> = {};
  let openclawMode = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--topic" || arg === "-t") {
      topics.push(args[++i]);
    } else if (arg === "--forward" || arg === "-f") {
      forward = args[++i];
    } else if (arg === "--header" || arg === "-H") {
      const header = args[++i];
      const colonIdx = header.indexOf(":");
      if (colonIdx > 0) {
        const key = header.slice(0, colonIdx).trim();
        const value = header.slice(colonIdx + 1).trim();
        headers[key] = value;
      }
    } else if (arg === "--openclaw") {
      openclawMode = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
ntfy-bridge - Local bridge from ntfy.sh to localhost

Usage:
  ntfy-bridge --topic <topic> --forward <url> [options]

Options:
  -t, --topic <topic>     ntfy.sh topic to subscribe to (can be repeated)
  -f, --forward <url>     Local endpoint to forward messages to
  -H, --header <k:v>      Custom header to include in forward requests (can be repeated)
  --openclaw              Format payload for OpenClaw hooks (sends {text: "..."})
  -h, --help              Show this help

Examples:
  ntfy-bridge -t alerts -f http://localhost:8080/hooks
  ntfy-bridge -t alerts -f http://localhost:18789/hooks/wake --openclaw -H "Authorization: Bearer token"
`);
      process.exit(0);
    }
  }

  if (topics.length === 0) {
    console.error("Error: No topics specified. Use --topic <topic>");
    process.exit(1);
  }
  if (!forward) {
    console.error("Error: No forward URL specified. Use --forward <url>");
    process.exit(1);
  }

  return { topics, forward, headers, openclawMode };
}

async function forwardMessage(
  msg: NtfyMessage,
  forwardUrl: string,
  customHeaders: Record<string, string> = {},
  openclawMode: boolean = false
): Promise<void> {
  let body: string;
  
  if (openclawMode) {
    // OpenClaw expects {text: "message"} format
    const text = msg.title 
      ? `[${msg.topic}] ${msg.title}: ${msg.message || ""}`
      : `[${msg.topic}] ${msg.message || msg.id}`;
    body = JSON.stringify({ text });
  } else {
    body = JSON.stringify(createPayload(msg));
  }

  try {
    const response = await fetch(forwardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...customHeaders },
      body,
    });

    if (response.ok) {
      console.log(`[${msg.topic}] Forwarded: ${msg.title || msg.message || msg.id}`);
    } else {
      console.warn(`[${msg.topic}] Forward returned ${response.status}`);
    }
  } catch (error) {
    console.error(`[${msg.topic}] Forward failed:`, error);
  }
}

function subscribeToTopic(topic: string, forwardUrl: string, headers: Record<string, string>, openclawMode: boolean): void {
  const url = normalizeTopicUrl(topic);
  console.log(`Subscribing to: ${url}`);

  const es = new EventSource(url);

  es.onopen = () => {
    console.log(`Connected to ${topic}`);
  };

  es.onmessage = async (event) => {
    try {
      const msg: NtfyMessage = JSON.parse(event.data);
      if (msg.event === "message" || !msg.event) {
        await forwardMessage(msg, forwardUrl, headers, openclawMode);
      }
    } catch (error) {
      console.warn(`Failed to parse message:`, error);
    }
  };

  es.onerror = (error) => {
    console.error(`SSE error on ${topic}:`, error);
    // EventSource auto-reconnects
  };
}

function main(): void {
  const { topics, forward, headers, openclawMode } = parseArgs();

  console.log("ntfy-bridge starting");
  console.log(`Forwarding to: ${forward}`);
  if (openclawMode) console.log("OpenClaw mode enabled");
  console.log(`Subscribing to ${topics.length} topic(s)`);

  for (const topic of topics) {
    subscribeToTopic(topic, forward, headers, openclawMode);
  }

  // Keep alive
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    process.exit(0);
  });
}

main();
