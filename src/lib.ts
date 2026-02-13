export interface NtfyMessage {
  id: string;
  time: number;
  event?: string;
  topic: string;
  title?: string;
  message?: string;
  tags?: string[];
  priority?: number;
}

export interface BridgePayload {
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

export function normalizeTopicUrl(topic: string): string {
  if (topic.startsWith("http")) {
    return `${topic.replace(/\/$/, "")}/sse`;
  } else if (topic.includes("/")) {
    return `https://${topic.replace(/\/$/, "")}/sse`;
  } else {
    return `https://ntfy.sh/${topic}/sse`;
  }
}

export function createPayload(msg: NtfyMessage): BridgePayload {
  return {
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
}

export function parseArgs(argv: string[]): { topics: string[]; forward: string } | null {
  const args = argv.slice(2);
  const topics: string[] = [];
  let forward = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--topic" || arg === "-t") {
      topics.push(args[++i]);
    } else if (arg === "--forward" || arg === "-f") {
      forward = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      return null; // Signal help requested
    }
  }

  if (topics.length === 0 || !forward) {
    return null;
  }

  return { topics, forward };
}
