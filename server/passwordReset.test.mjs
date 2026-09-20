import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("password reset API", () => {
  let baseUrl = "";
  let deliveredCode = "";
  let deliveryFails = false;
  let holdDelivery = false;
  let releaseDelivery;
  let directory = "";
  let server;
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), "projectvibe-reset-"));
    process.env.DATABASE_URL = `file:${join(directory, "test.sqlite")}`;
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "ProjectVibe <no-reply@example.com>";
    globalThis.fetch = async (input, init) => {
      if (String(input) === "https://api.resend.com/emails") {
        const body = JSON.parse(String(init?.body));
        deliveredCode = String(body.text).match(/\b\d{6}\b/)?.[0] ?? "";
        if (holdDelivery) {
          return new Promise((resolve) => {
            releaseDelivery = () => resolve(new Response(null, { status: deliveryFails ? 500 : 200 }));
          });
        }
        return new Response(null, { status: deliveryFails ? 500 : 200 });
      }
      return realFetch(input, init);
    };
    const { handleApiRequest } = await import("./index.mjs");
    server = createServer(handleApiRequest);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("Test server did not start");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    globalThis.fetch = realFetch;
    rmSync(directory, { recursive: true, force: true });
  });

  it("resets a password once and revokes the existing session", async () => {
    // Given
    const email = "reset@example.com";
    const oldPassword = "old-password";
    const registration = await realFetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Reset User", email, password: oldPassword }),
    });
    const sessionCookie = registration.headers.get("set-cookie") ?? "";

    // When
    const request = await realFetch(`${baseUrl}/api/auth/password-reset/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const verification = await realFetch(`${baseUrl}/api/auth/password-reset/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code: deliveredCode }),
    });
    const verificationBody = await verification.json();
    const completion = await realFetch(`${baseUrl}/api/auth/password-reset/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resetToken: verificationBody.resetToken, password: "new-password" }),
    });
    const replay = await realFetch(`${baseUrl}/api/auth/password-reset/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resetToken: verificationBody.resetToken, password: "another-password" }),
    });
    const oldLogin = await realFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: oldPassword }),
    });
    const newLogin = await realFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "new-password" }),
    });
    const previousSession = await realFetch(`${baseUrl}/api/auth/session`, { headers: { cookie: sessionCookie } });

    // Then
    expect(registration.status).toBe(201);
    expect(request.status).toBe(202);
    expect(deliveredCode).toMatch(/^\d{6}$/);
    expect(verification.status).toBe(200);
    expect(completion.status).toBe(200);
    expect(replay.status).toBe(400);
    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
    await expect(previousSession.json()).resolves.toEqual({ authenticated: false });
  });

  it("expires a verification code after five failed attempts", async () => {
    // Given
    const email = "user@example.com";
    const request = await realFetch(`${baseUrl}/api/auth/password-reset/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // When
    const failures = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      failures.push(await realFetch(`${baseUrl}/api/auth/password-reset/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: "000000" }),
      }));
    }
    const correctCodeAfterFailures = await realFetch(`${baseUrl}/api/auth/password-reset/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code: deliveredCode }),
    });

    // Then
    expect(request.status).toBe(202);
    expect(failures.every((response) => response.status === 400)).toBe(true);
    expect(correctCodeAfterFailures.status).toBe(400);
  });

  it("does not reveal account existence when email delivery fails", async () => {
    // Given
    deliveryFails = true;
    holdDelivery = true;

    // When
    const registered = await realFetch(`${baseUrl}/api/auth/password-reset/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });
    const missing = await realFetch(`${baseUrl}/api/auth/password-reset/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "missing@example.com" }),
    });
    holdDelivery = false;
    deliveryFails = false;
    const newerRequest = await realFetch(`${baseUrl}/api/auth/password-reset/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });
    const newerCode = deliveredCode;
    releaseDelivery?.();
    await new Promise((resolve) => setImmediate(resolve));
    const newerVerification = await realFetch(`${baseUrl}/api/auth/password-reset/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", code: newerCode }),
    });
    const { resetToken } = await newerVerification.json();
    const concurrentCompletions = await Promise.all(["first-password", "second-password"].map((password) => realFetch(`${baseUrl}/api/auth/password-reset/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resetToken, password }),
    })));

    // Then
    expect(registered.status).toBe(202);
    expect(missing.status).toBe(202);
    await expect(registered.json()).resolves.toEqual(await missing.json());
    expect(newerRequest.status).toBe(202);
    expect(newerVerification.status).toBe(200);
    expect(concurrentCompletions.map((response) => response.status).sort()).toEqual([200, 400]);
  });
});
