import { test } from "vitest";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeState = vi.hoisted(() => ({ db: null }));
vi.mock("../prisma/db.ts", () => ({ get db() { return routeState.db; } }));

const { default: forgotPasswordRouter } = await import("../routes/forgot-password.js");

function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function route(path, method) {
  return forgotPasswordRouter.stack
    .filter((layer) => layer.route?.path === path)
    .flatMap((layer) => layer.route.stack)
    .find((layer) => layer.method === method).handle;
}

function setupRouteDb(user = null) {
  const users = { where: vi.fn(() => ({ first: vi.fn().mockResolvedValue(user), update: vi.fn().mockResolvedValue({}) })) };
  const logs = { create: vi.fn().mockResolvedValue({}) };
  routeState.db = { orm: { public: { User: users, logs } } };
  return { users, logs };
}

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.APP_URL = "https://app.example";
  setupRouteDb();
});

const JWT_SECRET = "test_jwt_secret_key_123";

test("password reset token generation and verification", () => {
  const user = { id: 42, email: "test@example.com" };
  const token = jwt.sign(
    { id: user.id, email: user.email, type: "password_reset" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const decoded = jwt.verify(token, JWT_SECRET);
  assert.equal(decoded.id, 42);
  assert.equal(decoded.email, "test@example.com");
  assert.equal(decoded.type, "password_reset");
});

test("password reset token expires after duration", () => {
  const token = jwt.sign(
    { id: 42, email: "test@example.com" },
    JWT_SECRET,
    { expiresIn: "0s" }
  );

  assert.throws(
    () => jwt.verify(token, JWT_SECRET),
    (err) => err.name === "TokenExpiredError"
  );
});

test("bcrypt password hashing and verification for password updates", async () => {
  const newPassword = "myNewSecurePassword123";
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const isMatch = await bcrypt.compare(newPassword, hashedPassword);
  assert.equal(isMatch, true);

  const isWrong = await bcrypt.compare("wrongPassword", hashedPassword);
  assert.equal(isWrong, false);
});

test("reset link URL formatting", () => {
  const baseUrl = "http://localhost:5173";
  const token = "mock_token_abc";
  const resetLink = `${baseUrl}/reset?reset_tok=${token}`;

  const url = new URL(resetLink);
  assert.equal(url.origin, "http://localhost:5173");
  assert.equal(url.pathname, "/reset");
  assert.equal(url.searchParams.get("reset_tok"), "mock_token_abc");
});

describe("forgot-password route", () => {
  it("validates email, sends a reset link for known users, and records the request", async () => {
    const invalidRes = response();
    await route("/", "post")({ body: {} }, invalidRes, vi.fn());
    expect(invalidRes.statusCode).toBe(400);

    const { logs } = setupRouteDb({ id: 5, email: "user@example.com" });
    const res = response();
    await route("/", "post")({ body: { email: " USER@example.com " } }, res, vi.fn());
    expect(res.body).toMatchObject({ success: true, message: expect.stringMatching(/sent/i) });
    const token = new URL(res.body.resetLink).searchParams.get("reset_tok");
    expect(jwt.verify(token, JWT_SECRET)).toMatchObject({ id: 5, type: "password_reset" });
    expect(logs.create).toHaveBeenCalledWith({ type: "USER_PASSWORD_CHANGE", userId: 5 });
  });

  it("does not issue a reset link for a user that does not exist", async () => {
    const res = response();
    await route("/", "post")({ body: { email: "none@example.com" } }, res, vi.fn());
    expect(res.statusCode).toBe(404);
  });

  it("validates reset credentials and changes a password from a valid token", async () => {
    const missingToken = response();
    await route("/", "put")({ body: { newPassword: "long-enough" } }, missingToken, vi.fn());
    expect(missingToken.statusCode).toBe(400);

    const { users } = setupRouteDb({ id: 7, email: "user@example.com" });
    const token = jwt.sign({ id: 7 }, JWT_SECRET);
    const res = response();
    await route("/", "put")({ body: { reset_tok: token, newPassword: "long-enough" } }, res, vi.fn());
    expect(res.body.success).toBe(true);
    const update = users.where.mock.results[1].value.update;
    expect(await bcrypt.compare("long-enough", update.mock.calls[0][0].password)).toBe(true);
  });

  it("rejects expired or invalid reset tokens", async () => {
    const res = response();
    await route("/", "put")({ body: { token: "not-a-token", password: "long-enough" } }, res, vi.fn());
    expect(res.statusCode).toBe(401);
  });
});
