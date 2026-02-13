import { describe, it, expect } from "vitest";
import { normalizeTopicUrl, createPayload, parseArgs, NtfyMessage } from "./lib.js";

describe("normalizeTopicUrl", () => {
  it("handles full https URL", () => {
    expect(normalizeTopicUrl("https://ntfy.sh/alerts")).toBe(
      "https://ntfy.sh/alerts/sse"
    );
  });

  it("handles full https URL with trailing slash", () => {
    expect(normalizeTopicUrl("https://ntfy.sh/alerts/")).toBe(
      "https://ntfy.sh/alerts/sse"
    );
  });

  it("handles domain/topic format", () => {
    expect(normalizeTopicUrl("ntfy.example.com/alerts")).toBe(
      "https://ntfy.example.com/alerts/sse"
    );
  });

  it("handles simple topic name (defaults to ntfy.sh)", () => {
    expect(normalizeTopicUrl("alerts")).toBe("https://ntfy.sh/alerts/sse");
  });

  it("handles http URL", () => {
    expect(normalizeTopicUrl("http://localhost:8080/test")).toBe(
      "http://localhost:8080/test/sse"
    );
  });
});

describe("createPayload", () => {
  it("creates payload with all fields", () => {
    const msg: NtfyMessage = {
      id: "abc123",
      time: 1700000000,
      event: "message",
      topic: "alerts",
      title: "Test Title",
      message: "Test message",
      tags: ["warning", "test"],
      priority: 4,
    };

    const payload = createPayload(msg);

    expect(payload.source).toBe("ntfy");
    expect(payload.topic).toBe("alerts");
    expect(payload.id).toBe("abc123");
    expect(payload.time).toBe(1700000000);
    expect(payload.title).toBe("Test Title");
    expect(payload.message).toBe("Test message");
    expect(payload.tags).toEqual(["warning", "test"]);
    expect(payload.priority).toBe(4);
    expect(payload.raw).toEqual(msg);
  });

  it("uses defaults for missing optional fields", () => {
    const msg: NtfyMessage = {
      id: "xyz",
      time: 1700000000,
      topic: "test",
    };

    const payload = createPayload(msg);

    expect(payload.tags).toEqual([]);
    expect(payload.priority).toBe(3);
    expect(payload.title).toBeUndefined();
    expect(payload.message).toBeUndefined();
  });
});

describe("parseArgs", () => {
  it("parses topic and forward", () => {
    const result = parseArgs(["node", "script", "-t", "alerts", "-f", "http://localhost:8080"]);
    expect(result).toEqual({
      topics: ["alerts"],
      forward: "http://localhost:8080",
    });
  });

  it("parses multiple topics", () => {
    const result = parseArgs([
      "node", "script",
      "--topic", "alerts",
      "--topic", "news",
      "--forward", "http://localhost:8080"
    ]);
    expect(result).toEqual({
      topics: ["alerts", "news"],
      forward: "http://localhost:8080",
    });
  });

  it("returns null for help flag", () => {
    const result = parseArgs(["node", "script", "--help"]);
    expect(result).toBeNull();
  });

  it("returns null if missing topics", () => {
    const result = parseArgs(["node", "script", "-f", "http://localhost"]);
    expect(result).toBeNull();
  });

  it("returns null if missing forward", () => {
    const result = parseArgs(["node", "script", "-t", "alerts"]);
    expect(result).toBeNull();
  });
});
