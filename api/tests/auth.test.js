import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ db: null }));
vi.mock("../prisma/db.ts", () => ({ get db() { return state.db; } }));

const { default: authRouter } = await import("../routes/auth.js");

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function handler(path, method) {
  return authRouter.stack.find((layer) => layer.route?.path === path)?.route.stack
    .find((layer) => layer.method === method).handle;
}

function setupDb({ user = null, existing = null } = {}) {
  const logs = { create: vi.fn().mockResolvedValue({}) };
  const users = {
    where: vi.fn((query) => ({
      first: vi.fn().mockResolvedValue(query.email ? (existing ?? user) : user),
      update: vi.fn().mockResolvedValue({}),
    })),
    create: vi.fn().mockImplementation(async (data) => ({ id: 7, ...data })),
  };
  state.db = { orm: { public: { User: users, Vendor: { create: vi.fn().mockResolvedValue({}) }, logs } } };
  return { users, logs };
}

beforeEach(() => {
  process.env.JWT_SECRET = "route-test-secret";
  setupDb();
});

describe("auth routes", () => {
  it("validates required login credentials", async () => {
    const res = response();
    await handler("/login", "post")({ body: { email: "a@example.com" } }, res, vi.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/email and password/i);
  });

  it("rejects an unknown user and records the failed attempt", async () => {
    const { logs } = setupDb();
    const res = response();
    await handler("/login", "post")({ body: { email: "none@example.com", password: "secret" } }, res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(logs.create).toHaveBeenCalledWith(expect.objectContaining({ type: "USER_LOGIN_FAILURE" }));
  });

  it("logs in a valid user with a signed token and normalized coordinate values", async () => {
    const password = await bcrypt.hash("correct-password", 4);
    const { logs } = setupDb({ user: { id: 4, email: "a@example.com", name: "Ada", password, type: "business", city: "St. Louis", latitude: "38.6", longitude: "-90.2" } });
    const res = response();
    await handler("/login", "post")({ body: { email: "a@example.com", password: "correct-password" } }, res, vi.fn());
    expect(res.statusCode).toBe(200);
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET)).toMatchObject({ id: 4, accountType: "business" });
    expect(res.body.user).toMatchObject({ latitude: 38.6, longitude: -90.2 });
    expect(logs.create).toHaveBeenCalledWith({ type: "USER_LOGIN_LOCAL", userId: 4 });
  });

  it("registers a business user, hashes its password, and creates its vendor", async () => {
    const { users } = setupDb();
    const res = response();
    await handler("/register", "post")({ body: { email: "new@example.com", password: "secret1", name: "New Biz", type: "business" } }, res, vi.fn());
    expect(res.statusCode).toBe(201);
    expect(await bcrypt.compare("secret1", users.create.mock.calls[0][0].password)).toBe(true);
    expect(state.db.orm.public.Vendor.create).toHaveBeenCalledWith(expect.objectContaining({ email: "new@example.com" }));
  });

  it("updates an existing user's password", async () => {
    const { users, logs } = setupDb({ user: { id: 8, email: "a@example.com" } });
    const res = response();
    await handler("/password", "put")({ body: { userId: "8", password: "new-secret" } }, res, vi.fn());
    expect(res.body).toEqual({ success: true });
    const update = users.where.mock.results[1].value.update;
    expect(await bcrypt.compare("new-secret", update.mock.calls[0][0].password)).toBe(true);
    expect(logs.create).toHaveBeenCalledWith({ type: "USER_PASSWORD_CHANGE", userId: 8 });
  });
});
