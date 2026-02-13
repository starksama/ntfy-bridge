# ntfy-bridge

Local bridge from [ntfy.sh](https://ntfy.sh) to localhost.

Subscribe to ntfy.sh topics and forward messages to your local endpoint. Perfect for AI agents that need real-time notifications without exposing public webhooks.

```
ntfy.sh → ntfy-bridge (local) → localhost:8080
```

## Install

```bash
npm install -g ntfy-bridge
```

Or run directly with npx:

```bash
npx ntfy-bridge --topic alerts --forward http://localhost:8080/hooks
```

## Usage

```bash
ntfy-bridge --topic <topic> --forward <url>
```

**Options:**
- `-t, --topic <topic>` — ntfy.sh topic to subscribe (can repeat)
- `-f, --forward <url>` — Local endpoint to forward messages to

**Examples:**

```bash
# Single topic
ntfy-bridge -t alerts -f http://localhost:8080/hooks

# Multiple topics
ntfy-bridge -t alerts -t news -f http://localhost:18789/hooks/ntfy

# Full URL
ntfy-bridge -t ntfy.sh/my-secret-topic -f http://localhost:8080/hooks

# Self-hosted ntfy
ntfy-bridge -t ntfy.example.com/alerts -f http://localhost:8080/hooks
```

## Payload Format

Messages are normalized and forwarded as JSON:

```json
{
  "source": "ntfy",
  "topic": "alerts",
  "id": "abc123",
  "time": 1707379800,
  "title": "Alert",
  "message": "Something happened",
  "tags": ["warning"],
  "priority": 3,
  "raw": { ... }
}
```

## Use Cases

- **AI Agents** — Feed real-time signals to OpenClaw, AutoGPT, etc.
- **Automation** — Trigger local scripts from ntfy notifications
- **Development** — Test webhook integrations locally

## How It Works

1. ntfy-bridge connects to ntfy.sh topics via SSE (outbound only)
2. When a message arrives, it forwards to your local endpoint
3. Your app receives the webhook on localhost

No public endpoint needed. No firewall config. Just run locally.

## Related

For a managed signal marketplace with routing, billing, and delivery guarantees, see [Herald](https://github.com/starksama/herald).

## License

MIT
