import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rateLimit } from "@/lib/rate-limit";

const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-03T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
  if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
});

describe("rateLimit fallback local", () => {
  it("bloqueia chamadas acima do limite", async () => {
    const options = {
      namespace: "test-limit",
      identifier: "visitor-a",
      limit: 2,
      windowSeconds: 60,
    };

    expect((await rateLimit(options)).allowed).toBe(true);
    expect((await rateLimit(options)).allowed).toBe(true);
    expect((await rateLimit(options)).allowed).toBe(false);
  });

  it("liberta o identificador depois da janela", async () => {
    const options = {
      namespace: "test-expiry",
      identifier: "visitor-a",
      limit: 1,
      windowSeconds: 60,
    };

    expect((await rateLimit(options)).allowed).toBe(true);
    expect((await rateLimit(options)).allowed).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect((await rateLimit(options)).allowed).toBe(true);
  });

  it("conta visitantes separadamente", async () => {
    const base = {
      namespace: "test-visitors",
      limit: 1,
      windowSeconds: 60,
    };

    expect(
      (await rateLimit({ ...base, identifier: "visitor-a" })).allowed,
    ).toBe(true);
    expect(
      (await rateLimit({ ...base, identifier: "visitor-a" })).allowed,
    ).toBe(false);
    expect(
      (await rateLimit({ ...base, identifier: "visitor-b" })).allowed,
    ).toBe(true);
  });
});
