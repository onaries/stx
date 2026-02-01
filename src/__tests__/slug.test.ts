import { describe, it, expect } from "vitest";
import { generateFolderId, toKebabCase, shortHash } from "../slug.js";

describe("toKebabCase", () => {
  it("converts spaces to hyphens", () => {
    expect(toKebabCase("My Project")).toBe("my-project");
  });

  it("converts underscores to hyphens", () => {
    expect(toKebabCase("my_project")).toBe("my-project");
  });

  it("removes special characters", () => {
    expect(toKebabCase("My Project!@#$%")).toBe("my-project");
  });

  it("collapses multiple hyphens", () => {
    expect(toKebabCase("my---project")).toBe("my-project");
  });

  it("trims leading/trailing hyphens", () => {
    expect(toKebabCase("-my-project-")).toBe("my-project");
  });

  it("handles mixed case", () => {
    expect(toKebabCase("MyProject")).toBe("myproject");
  });

  it("handles already kebab-case", () => {
    expect(toKebabCase("my-project")).toBe("my-project");
  });

  it("handles empty string", () => {
    expect(toKebabCase("")).toBe("");
  });

  it("handles numbers", () => {
    expect(toKebabCase("project 123")).toBe("project-123");
  });
});

describe("shortHash", () => {
  it("returns 4 hex characters", () => {
    const hash = shortHash("test");
    expect(hash).toHaveLength(4);
    expect(/^[0-9a-f]{4}$/.test(hash)).toBe(true);
  });

  it("is deterministic", () => {
    expect(shortHash("test")).toBe(shortHash("test"));
  });

  it("different inputs produce different hashes", () => {
    expect(shortHash("test1")).not.toBe(shortHash("test2"));
  });
});

describe("generateFolderId", () => {
  it("combines kebab-case and hash", () => {
    const id = generateFolderId("My Project");
    expect(id).toMatch(/^my-project-[0-9a-f]{4}$/);
  });

  it("is deterministic", () => {
    expect(generateFolderId("My Project")).toBe(generateFolderId("My Project"));
  });

  it("handles complex labels", () => {
    const id = generateFolderId("Node.js Backend API");
    expect(id).toMatch(/^nodejs-backend-api-[0-9a-f]{4}$/);
  });
});
