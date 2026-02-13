#!/usr/bin/env node

import EventSource from "eventsource";

interface NtfyMessage {
  id: string;
  time: number;
  event?: string;
  topic: string;
  title?: string;
  message?: string;
  tags?: string[];
  priority?: number;
}

interface BridgePayload {
  source: "ntfy";
  topic: string;
  id: string;
  time: number;
  title?: string;
  message?: string;
  tags: string[];
  priority: number;
  raw: NtfyMessage;
}

function parseArgs(): { topics: string[]; forward: string } {
  const args = process.argv.slice(2);
  const topics: string[] = [];
  let forward = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--topic" || arg === "-t") {
      topics.push(args[++i]);
    } else if (arg === "--forward" || arg === "-f") {
      forward = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
ntfy-bridge - Local bridge from ntfy.sh to localhost

Usage:
  ntfy-bridge --topic <topic> --forward <url>

Options:
  -t, --topic <topic>    ntfy.sh topic to subscribe to (can be repeated)
  -f, --forward <url>    Local endpoint to forward messages to
  -h, --help             Show this help

Examples:
  ntfy-bridge -t alerts -f http://localhost:8080/hooks
  ntfy-bridge -t ntfy.sh/my-topic -t ntfy.sh/other -f http://localhost:18789/hooks/ntfy
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

  return { topics, forward };
}

function normalizeTopicUrl(topic: string): string {
  if (topic.startsWith("http")) {
    return `${topic.replace(/\/$/, "")}/sse`;
  } else if (topic.includes("/")) {
    return `https://${topic.replace(/\/$/, "")}/sse`;
  } else {
    return `https://ntfy.sh/${topic}/sse`;
  }
}

async function forwardMessage(
  msg: NtfyMessage,
  forwardUrl: string
): Promise<void> {
  const payload: BridgePayload = {
    source: "ntfy",
    topic: msg.topic,
    id: msg.id,
    time: msg.time,
    title: msg.title,
    message: msg.message,
    tags: msg.tags || [],
    priority: msg.priority || 3,
    raw: msg,
  };

  try {
    const response = await fetch(forwardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

function subscribeToTopic(topic: string, forwardUrl: string): void {
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
        await forwardMessage(msg, forwardUrl);
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
  const { topics, forward } = parseArgs();

  console.log("ntfy-bridge starting");
  console.log(`Forwarding to: ${forward}`);
  console.log(`Subscribing to ${topics.length} topic(s)`);

  for (const topic of topics) {
    subscribeToTopic(topic, forward);
  }

  // Keep alive
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    process.exit(0);
  });
}

main();
