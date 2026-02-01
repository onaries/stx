import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MockAgent,
  setGlobalDispatcher,
  getGlobalDispatcher,
  type Dispatcher,
} from "undici";
import {
  fetchServerStatus,
  fetchAllServersStatus,
  formatStatusText,
  type ServerStatus,
} from "../status.js";

describe("status", () => {
  let mockAgent: MockAgent;
  let originalDispatcher: Dispatcher;

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    await mockAgent.close();
    setGlobalDispatcher(originalDispatcher);
  });

  describe("fetchServerStatus", () => {
    it("returns aggregated status on success", async () => {
      const mockPool = mockAgent.get("http://localhost:8384");

      mockPool
        .intercept({ path: "/rest/system/status", method: "GET" })
        .reply(200, {
          myID: "ABCDEFG-1234567-ABCDEFG-1234567-ABCDEFG-1234567-ABCDEFG-1234567",
          uptime: 3600,
          startTime: "2024-01-01T00:00:00Z",
          alloc: 1000000,
          sys: 2000000,
          goroutines: 50,
          discoveryEnabled: true,
        });

      mockPool
        .intercept({ path: "/rest/system/connections", method: "GET" })
        .reply(200, {
          connections: {
            "DEVICEID-1234567": {
              address: "192.168.1.1:22000",
              at: "2024-01-01T00:00:00Z",
              clientVersion: "v1.27.0",
              connected: true,
              inBytesTotal: 1000,
              outBytesTotal: 2000,
              paused: false,
              startedAt: "2024-01-01T00:00:00Z",
              type: "tcp-client",
            },
          },
          total: {
            at: "2024-01-01T00:00:00Z",
            inBytesTotal: 1000,
            outBytesTotal: 2000,
          },
        });

      mockPool
        .intercept({ path: "/rest/system/config", method: "GET" })
        .reply(200, {
          folders: [{ id: "folder-1", label: "Test Folder" }],
          devices: [
            {
              deviceID:
                "ABCDEFG-1234567-ABCDEFG-1234567-ABCDEFG-1234567-ABCDEFG-1234567",
              name: "local",
            },
            { deviceID: "DEVICEID-1234567", name: "remote" },
          ],
        });

      mockPool
        .intercept({ path: "/rest/db/status?folder=folder-1", method: "GET" })
        .reply(200, {
          globalBytes: 1024000,
          globalFiles: 100,
          globalDirectories: 10,
          globalDeleted: 0,
          globalTotalItems: 110,
          localBytes: 1024000,
          localFiles: 100,
          localDirectories: 10,
          localDeleted: 0,
          localTotalItems: 110,
          needBytes: 0,
          needFiles: 0,
          inSyncBytes: 1024000,
          inSyncFiles: 100,
          pullErrors: 0,
          state: "idle",
          stateChanged: "2024-01-01T00:00:00Z",
          version: 1,
          ignorePatterns: false,
        });

      const status = await fetchServerStatus(
        "test",
        "http://localhost:8384",
        "api-key",
      );

      expect(status.server).toBe("test");
      expect(status.url).toBe("http://localhost:8384");
      expect(status.error).toBeUndefined();
      expect(status.system?.deviceID).toContain("ABCDEFG");
      expect(status.system?.uptime).toBe(3600);
      expect(status.folders).toHaveLength(1);
      expect(status.folders?.[0].id).toBe("folder-1");
      expect(status.folders?.[0].state).toBe("idle");
      expect(status.devices).toHaveLength(1);
      expect(status.devices?.[0].name).toBe("remote");
      expect(status.devices?.[0].connected).toBe(true);
    });

    it("returns error on connection failure", async () => {
      const mockPool = mockAgent.get("http://localhost:8384");
      mockPool
        .intercept({ path: "/rest/system/status", method: "GET" })
        .reply(500, "Server Error");

      const status = await fetchServerStatus(
        "test",
        "http://localhost:8384",
        "api-key",
      );

      expect(status.server).toBe("test");
      expect(status.error).toBeDefined();
      expect(status.system).toBeUndefined();
    });
  });

  describe("fetchAllServersStatus", () => {
    it("fetches status for multiple servers concurrently", async () => {
      const mockPool1 = mockAgent.get("http://server1:8384");
      const mockPool2 = mockAgent.get("http://server2:8384");

      for (const pool of [mockPool1, mockPool2]) {
        pool
          .intercept({ path: "/rest/system/status", method: "GET" })
          .reply(200, {
            myID: "TEST-ID",
            uptime: 100,
            startTime: "2024-01-01T00:00:00Z",
          });
        pool
          .intercept({ path: "/rest/system/connections", method: "GET" })
          .reply(200, {
            connections: {},
            total: { at: "", inBytesTotal: 0, outBytesTotal: 0 },
          });
        pool
          .intercept({ path: "/rest/system/config", method: "GET" })
          .reply(200, {
            folders: [],
            devices: [],
          });
      }

      const result = await fetchAllServersStatus({
        server1: { url: "http://server1:8384", apiKey: "key1" },
        server2: { url: "http://server2:8384", apiKey: "key2" },
      });

      expect(result.servers).toHaveLength(2);
      expect(result.servers.map((s) => s.server).sort()).toEqual([
        "server1",
        "server2",
      ]);
    });

    it("handles partial failures without stopping", async () => {
      const mockPool1 = mockAgent.get("http://server1:8384");
      const mockPool2 = mockAgent.get("http://server2:8384");

      mockPool1
        .intercept({ path: "/rest/system/status", method: "GET" })
        .reply(500, "Error");

      mockPool2
        .intercept({ path: "/rest/system/status", method: "GET" })
        .reply(200, {
          myID: "TEST-ID",
          uptime: 100,
          startTime: "2024-01-01T00:00:00Z",
        });
      mockPool2
        .intercept({ path: "/rest/system/connections", method: "GET" })
        .reply(200, {
          connections: {},
          total: { at: "", inBytesTotal: 0, outBytesTotal: 0 },
        });
      mockPool2
        .intercept({ path: "/rest/system/config", method: "GET" })
        .reply(200, {
          folders: [],
          devices: [],
        });

      const result = await fetchAllServersStatus({
        server1: { url: "http://server1:8384", apiKey: "key1" },
        server2: { url: "http://server2:8384", apiKey: "key2" },
      });

      expect(result.servers).toHaveLength(2);
      const s1 = result.servers.find((s) => s.server === "server1");
      const s2 = result.servers.find((s) => s.server === "server2");
      expect(s1?.error).toBeDefined();
      expect(s2?.error).toBeUndefined();
      expect(s2?.system).toBeDefined();
    });
  });

  describe("formatStatusText", () => {
    it("formats successful status", () => {
      const status: ServerStatus = {
        server: "test",
        url: "http://localhost:8384",
        system: {
          deviceID: "ABCDEFG-1234567",
          uptime: 7265,
          startTime: "2024-01-01T00:00:00Z",
        },
        folders: [
          {
            id: "folder-1",
            label: "Test",
            state: "idle",
            globalBytes: 1048576,
            localBytes: 1048576,
            needBytes: 0,
            pullErrors: 0,
          },
        ],
        devices: [
          {
            deviceID: "DEVICEID-1234567",
            name: "remote",
            connected: true,
            clientVersion: "v1.27.0",
          },
        ],
      };

      const output = formatStatusText({ servers: [status] });

      expect(output).toContain("test");
      expect(output).toContain("localhost:8384");
      expect(output).toContain("ABCDEFG");
      expect(output).toContain("2h 1m");
      expect(output).toContain("Test");
      expect(output).toContain("idle");
      expect(output).toContain("remote");
      expect(output).toContain("connected");
    });

    it("formats error status", () => {
      const status: ServerStatus = {
        server: "test",
        url: "http://localhost:8384",
        error: "Connection refused",
      };

      const output = formatStatusText({ servers: [status] });

      expect(output).toContain("ERROR");
      expect(output).toContain("Connection refused");
    });
  });
});
