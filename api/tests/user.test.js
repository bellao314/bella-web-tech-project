import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ db: null }));
vi.mock("../prisma/db.ts", () => ({ get db() { return state.db; } }));

const userModule = await import("../routes/user.js");
const { default: userRouter, getUserFromRequest, getUserFavorites, handleProfile, handleUpdateProfile, userBrandingStore, vendorTypeStore } = userModule;

function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function setupDb({ user = null, favorites = [], vendors = [], favoriteExisting = null } = {}) {
  state.db = {
    orm: { public: {
      User: { where: vi.fn(() => ({ first: vi.fn().mockResolvedValue(user), update: vi.fn().mockResolvedValue({}) })) },
      Favorite: { where: vi.fn(() => ({ all: vi.fn().mockResolvedValue(favorites), first: vi.fn().mockResolvedValue(favoriteExisting), delete: vi.fn().mockResolvedValue({}) })), create: vi.fn().mockResolvedValue({}) },
      Vendor: { where: vi.fn((query) => ({ first: vi.fn().mockResolvedValue(vendors.find((vendor) =>
        (query.id !== undefined && vendor.id === query.id) ||
        (query.email !== undefined && vendor.email === query.email) ||
        (query.name !== undefined && vendor.name === query.name)
      ) ?? null), include() { return this; } })) },
      Location: { where: vi.fn(() => ({ first: vi.fn().mockResolvedValue(null) })), create: vi.fn().mockResolvedValue({}) },
    } },
  };
  return state.db.orm.public;
}

function route(path, method) {
  return userRouter.stack
    .filter((layer) => layer.route?.path === path)
    .flatMap((layer) => layer.route.stack)
    .find((layer) => layer.method === method).handle;
}

beforeEach(() => {
  process.env.JWT_SECRET = "user-test-secret";
  userBrandingStore.clear();
  vendorTypeStore.clear();
  setupDb();
});

describe("user helpers and profile handlers", () => {
  it("uses an already authenticated request user and safely rejects a missing token", async () => {
    const requestUser = { id: 1, email: "in-request@example.com" };
    await expect(getUserFromRequest({ user: requestUser })).resolves.toBe(requestUser);
    await expect(getUserFromRequest({ headers: {} })).resolves.toBeNull();
  });

  it("resolves a bearer token to the persisted user", async () => {
    const persisted = { id: 2, email: "token@example.com", type: "customer" };
    setupDb({ user: persisted });
    const token = jwt.sign({ id: 2, email: persisted.email }, process.env.JWT_SECRET);
    await expect(getUserFromRequest({ headers: { authorization: `Bearer ${token}` } })).resolves.toMatchObject(persisted);
  });

  it("formats favorite vendors and skips missing vendor records", async () => {
    setupDb({
      favorites: [{ vendorId: 10 }, { vendorId: 11 }],
      vendors: [{ id: 10, name: "Coffee Cart", type: "food truck", city: "St. Louis, MO" }],
    });
    await expect(getUserFavorites(1)).resolves.toEqual([
      expect.objectContaining({ id: 10, name: "Coffee Cart", location: expect.any(Object) }),
    ]);
  });

  it("requires authentication before returning a profile", async () => {
    const res = response();
    await handleProfile({ headers: {} }, res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/authentication/i);
  });

  it("returns profile branding and vendor type for a business account", async () => {
    const user = { id: 3, email: "biz@example.com", name: "Coffee Cart", type: "business" };
    setupDb({ user, vendors: [{ id: 20, email: user.email, type: "Coffee Truck" }] });
    userBrandingStore.set(3, { logo: "logo.png", banner: "banner.png" });
    const res = response();
    await handleProfile({ user }, res, vi.fn());
    expect(res.body.profile).toMatchObject({ vendorType: "Coffee Truck", logo: "logo.png", banner: "banner.png" });
  });

  it("rejects malformed email updates and persists profile-only branding changes", async () => {
    const user = { id: 4, email: "person@example.com", type: "customer", password: null };
    const invalidRes = response();
    await handleUpdateProfile({ user, body: { email: "not-an-email", password: "anything" } }, invalidRes, vi.fn());
    expect(invalidRes.statusCode).toBe(400);

    const res = response();
    await handleUpdateProfile({ user, body: { logo: "new-logo.png", banner: null } }, res, vi.fn());
    expect(res.body).toMatchObject({ success: true, profile: { logo: "new-logo.png", banner: null } });
    expect(userBrandingStore.get(4)).toEqual({ logo: "new-logo.png", banner: null });
  });

  it("returns the authenticated user's favorites", async () => {
    const user = { id: 8, email: "favorites@example.com", type: "customer" };
    setupDb({ user, favorites: [{ vendorId: 50 }], vendors: [{ id: 50, name: "Taco Cart", type: "food truck", city: "St. Louis, MO" }] });
    const res = response();
    await route("/favorites", "get")({ user }, res, vi.fn());
    expect(res.body.favorites).toEqual([expect.objectContaining({ id: 50, name: "Taco Cart" })]);
  });

  it("adds a numeric favorite and accepts custom business identifiers", async () => {
    const user = { id: 9, email: "person@example.com", type: "customer" };
    const db = setupDb({ user });
    const numericRes = response();
    await route("/favorites", "post")({ user, body: { vendorId: "15" } }, numericRes, vi.fn());
    expect(numericRes.body).toMatchObject({ success: true, isFavorite: true });
    expect(db.Favorite.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 9, vendorId: 15 }));

    const customRes = response();
    await route("/favorites", "post")({ user, body: { vendorId: "my-business" } }, customRes, vi.fn());
    expect(customRes.body).toMatchObject({ vendorId: "my-business", isFavorite: true });
  });

  it("toggles existing favorites off and removes numeric favorites", async () => {
    const user = { id: 10, email: "person@example.com", type: "customer" };
    const db = setupDb({ user, favoriteExisting: { id: 1, userId: 10, vendorId: 20 } });
    const toggleRes = response();
    await route("/favorites/toggle", "post")({ user, body: { vendorId: 20 } }, toggleRes, vi.fn());
    expect(toggleRes.body).toMatchObject({ isFavorite: false });
    expect(db.Favorite.where.mock.results[1].value.delete).toHaveBeenCalled();

    const removeRes = response();
    await route("/favorites/:vendorId", "delete")({ user, params: { vendorId: "20" } }, removeRes, vi.fn());
    expect(removeRes.body).toMatchObject({ success: true, isFavorite: false });
  });

  it("toggles a new numeric favorite on", async () => {
    const user = { id: 11, email: "person@example.com", type: "customer" };
    const db = setupDb({ user });
    const res = response();
    await route("/favorites/toggle", "post")({ user, body: { vendorId: 21 } }, res, vi.fn());
    expect(res.body).toMatchObject({ isFavorite: true });
    expect(db.Favorite.create).toHaveBeenCalledWith(expect.objectContaining({ vendorId: 21 }));
  });
});
