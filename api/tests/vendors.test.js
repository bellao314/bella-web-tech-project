import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ db: null }));
vi.mock("../prisma/db.ts", () => ({ get db() { return state.db; } }));

const { default: vendorsRouter, formatVendor, vendorBrandingStore } = await import("../routes/vendors.js");

function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function route(path, method) {
  return vendorsRouter.stack
    .filter((layer) => layer.route?.path === path)
    .flatMap((layer) => layer.route.stack)
    .find((layer) => layer.method === method).handle;
}

beforeEach(() => {
  vendorBrandingStore.clear();
  state.db = { orm: { public: { Vendor: { include: vi.fn(() => ({ all: vi.fn().mockResolvedValue([]) })), where: vi.fn(() => ({ include() { return this; }, first: vi.fn().mockResolvedValue(null) })) } } } };
});

describe("vendor formatting and routes", () => {
  it("uses precise location coordinates and calculates distance when user coordinates exist", () => {
    const formatted = formatVendor({ id: 3, name: "Cart", type: "food truck", city: "St. Louis, MO", location: { latitude: "38.627", longitude: "-90.199" } }, { lat: 38.627, lng: -90.199 });
    expect(formatted).toMatchObject({ latitude: 38.627, longitude: -90.199, distance: "0.1 mi", distanceInMiles: 0 });
  });

  it("updates and retrieves stored branding", async () => {
    const putRes = response();
    await route("/:id/branding", "put")({ params: { id: "12" }, body: { logo: "logo.png", banner: "banner.jpg" } }, putRes, vi.fn());
    expect(putRes.body).toEqual({ success: true, vendorId: 12, branding: { logo: "logo.png", banner: "banner.jpg" } });

    const getRes = response();
    await route("/:id/branding", "get")({ params: { id: "12" } }, getRes, vi.fn());
    expect(getRes.body).toEqual({ vendorId: 12, logo: "logo.png", banner: "banner.jpg" });
  });

  it("rejects invalid vendor identifiers", async () => {
    const res = response();
    await route("/:id", "get")({ params: { id: "not-a-number" } }, res, vi.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid vendor id/i);
  });

  it("sorts listed vendors by distance when latitude and longitude are supplied", async () => {
    const raw = [
      { id: 1, name: "Far", type: "food truck", city: "St. Louis, MO", location: { latitude: 39, longitude: -90.2 } },
      { id: 2, name: "Near", type: "food truck", city: "St. Louis, MO", location: { latitude: 38.628, longitude: -90.199 } },
    ];
    state.db.orm.public.Vendor.include.mockReturnValue({ all: vi.fn().mockResolvedValue(raw) });
    const res = response();
    await route("/", "get")({ query: { lat: "38.627", lng: "-90.199" } }, res, vi.fn());
    expect(res.body.vendors.map((vendor) => vendor.name)).toEqual(["Near", "Far"]);
  });
});
