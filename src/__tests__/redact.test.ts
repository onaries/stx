import { describe, it, expect } from "vitest";
import { redact } from "../redact.js";

describe("redact", () => {
  it("returns null/undefined unchanged", () => {
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
  });

  it("returns primitives unchanged", () => {
    expect(redact("hello")).toBe("hello");
    expect(redact(123)).toBe(123);
    expect(redact(true)).toBe(true);
  });

  it("redacts top-level sensitive keys (case-insensitive)", () => {
    expect(redact({ apiKey: "secret123" })).toEqual({ apiKey: "REDACTED" });
    expect(redact({ ApiKey: "secret123" })).toEqual({ ApiKey: "REDACTED" });
    expect(redact({ APIKEY: "secret123" })).toEqual({ APIKEY: "REDACTED" });
    expect(redact({ password: "pass" })).toEqual({ password: "REDACTED" });
    expect(redact({ passwd: "pass" })).toEqual({ passwd: "REDACTED" });
    expect(redact({ token: "tok" })).toEqual({ token: "REDACTED" });
    expect(redact({ accessToken: "at" })).toEqual({ accessToken: "REDACTED" });
    expect(redact({ refreshToken: "rt" })).toEqual({
      refreshToken: "REDACTED",
    });
    expect(redact({ secret: "sec" })).toEqual({ secret: "REDACTED" });
    expect(redact({ authorization: "auth" })).toEqual({
      authorization: "REDACTED",
    });
  });

  it("preserves non-sensitive keys", () => {
    const input = { name: "test", url: "http://example.com", count: 42 };
    expect(redact(input)).toEqual(input);
  });

  it("handles nested objects", () => {
    const input = {
      server: "myserver",
      config: {
        gui: {
          apiKey: "secret-key",
          address: "127.0.0.1:8384",
        },
        user: {
          name: "admin",
          password: "admin123",
        },
      },
    };
    expect(redact(input)).toEqual({
      server: "myserver",
      config: {
        gui: {
          apiKey: "REDACTED",
          address: "127.0.0.1:8384",
        },
        user: {
          name: "admin",
          password: "REDACTED",
        },
      },
    });
  });

  it("handles arrays", () => {
    const input = [{ apiKey: "key1" }, { apiKey: "key2" }, { name: "safe" }];
    expect(redact(input)).toEqual([
      { apiKey: "REDACTED" },
      { apiKey: "REDACTED" },
      { name: "safe" },
    ]);
  });

  it("handles arrays of primitives", () => {
    const input = [1, 2, "hello", true];
    expect(redact(input)).toEqual([1, 2, "hello", true]);
  });

  it("handles deeply nested structures", () => {
    const input = {
      level1: {
        level2: {
          level3: {
            secret: "deep-secret",
            data: "visible",
          },
        },
      },
    };
    expect(redact(input)).toEqual({
      level1: {
        level2: {
          level3: {
            secret: "REDACTED",
            data: "visible",
          },
        },
      },
    });
  });

  it("handles event payload with nested apiKey/password (Syncthing ConfigSaved example)", () => {
    const event = {
      id: 123,
      type: "ConfigSaved",
      time: "2024-01-01T00:00:00Z",
      data: {
        gui: {
          enabled: true,
          address: "127.0.0.1:8384",
          apiKey: "my-secret-api-key",
          user: "admin",
          password: "hashed-password",
        },
        options: {
          listenAddresses: ["default"],
        },
      },
    };

    const redacted = redact(event);

    expect(redacted).toEqual({
      id: 123,
      type: "ConfigSaved",
      time: "2024-01-01T00:00:00Z",
      data: {
        gui: {
          enabled: true,
          address: "127.0.0.1:8384",
          apiKey: "REDACTED",
          user: "admin",
          password: "REDACTED",
        },
        options: {
          listenAddresses: ["default"],
        },
      },
    });
  });

  it("handles ServerEvents structure", () => {
    const serverEvents = {
      server: "safe-101",
      url: "http://100.1.2.3:8384",
      events: [
        {
          id: 1,
          type: "ConfigSaved",
          time: "2024-01-01T00:00:00Z",
          data: {
            gui: {
              apiKey: "secret",
              password: "hash",
            },
          },
        },
        {
          id: 2,
          type: "DeviceConnected",
          time: "2024-01-01T00:00:01Z",
          data: {
            deviceID: "DEVICE-ID",
          },
        },
      ],
    };

    const redacted = redact(serverEvents);

    expect(redacted).toEqual({
      server: "safe-101",
      url: "http://100.1.2.3:8384",
      events: [
        {
          id: 1,
          type: "ConfigSaved",
          time: "2024-01-01T00:00:00Z",
          data: {
            gui: {
              apiKey: "REDACTED",
              password: "REDACTED",
            },
          },
        },
        {
          id: 2,
          type: "DeviceConnected",
          time: "2024-01-01T00:00:01Z",
          data: {
            deviceID: "DEVICE-ID",
          },
        },
      ],
    });
  });

  it("does not mutate original object", () => {
    const original = { apiKey: "secret", nested: { password: "pass" } };
    const copy = JSON.parse(JSON.stringify(original));

    redact(original);

    expect(original).toEqual(copy);
  });
});
