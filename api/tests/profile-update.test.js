import { test } from "vitest";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { handleProfile, handleUpdateProfile, vendorTypeStore } from "../routes/user.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test("rejects profile details update if password is missing", async () => {
  const passwordHash = await bcrypt.hash("correctPassword123", 10);
  const req = {
    user: {
      id: 1,
      email: "customer@example.com",
      name: "Customer User",
      type: "customer",
      accountType: "customer",
      password: passwordHash,
    },
    body: {
      email: "newemail@example.com",
    },
  };
  const res = createMockRes();

  await handleUpdateProfile(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /password is required/i);
});

test("rejects profile details update if password is incorrect", async () => {
  const passwordHash = await bcrypt.hash("correctPassword123", 10);
  const req = {
    user: {
      id: 2,
      email: "vendor@example.com",
      name: "Taco Haven",
      type: "business",
      accountType: "business",
      password: passwordHash,
    },
    body: {
      email: "newvendor@example.com",
      password: "wrongPassword",
    },
  };
  const res = createMockRes();

  await handleUpdateProfile(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /incorrect password/i);
});

test("allows customer to update email with valid password", async () => {
  const passwordHash = await bcrypt.hash("customerSecret123", 10);
  const req = {
    user: {
      id: 3,
      email: "original@customer.com",
      name: "Jane Doe",
      type: "customer",
      accountType: "customer",
      password: passwordHash,
    },
    body: {
      email: "updated@customer.com",
      password: "customerSecret123",
    },
  };
  const res = createMockRes();

  await handleUpdateProfile(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.profile.email, "updated@customer.com");
  assert.ok(res.body.token);
});

test("prevents customer from changing business name or vendor type", async () => {
  const passwordHash = await bcrypt.hash("pass123", 10);
  const reqName = {
    user: {
      id: 4,
      email: "user@example.com",
      name: "Original Name",
      type: "customer",
      accountType: "customer",
      password: passwordHash,
    },
    body: {
      name: "New Unauthorized Name",
      password: "pass123",
    },
  };
  const resName = createMockRes();
  await handleUpdateProfile(reqName, resName, () => {});
  assert.equal(resName.statusCode, 403);
  assert.match(resName.body.error, /customer accounts can only update their email/i);

  const reqType = {
    user: {
      id: 4,
      email: "user@example.com",
      name: "Original Name",
      type: "customer",
      accountType: "customer",
      password: passwordHash,
    },
    body: {
      vendorType: "Food Truck",
      password: "pass123",
    },
  };
  const resType = createMockRes();
  await handleUpdateProfile(reqType, resType, () => {});
  assert.equal(resType.statusCode, 403);
  assert.match(resType.body.error, /only vendor accounts can update vendor type/i);
});

test("allows vendor to update Business Name, email, and vendor type with password", async () => {
  const passwordHash = await bcrypt.hash("vendorPass456", 10);
  const req = {
    user: {
      id: 5,
      email: "oldbiz@tacos.com",
      name: "Old Taco Stand",
      type: "business",
      accountType: "business",
      password: passwordHash,
    },
    body: {
      name: "Artisan Taco Grill",
      email: "newbiz@tacos.com",
      vendorType: "Gourmet Food Truck",
      password: "vendorPass456",
    },
  };
  const res = createMockRes();

  await handleUpdateProfile(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.profile.name, "Artisan Taco Grill");
  assert.equal(res.body.profile.email, "newbiz@tacos.com");
  assert.equal(res.body.profile.vendorType, "Gourmet Food Truck");
  assert.equal(vendorTypeStore.get(5), "Gourmet Food Truck");
});

test("handleProfile returns vendorType for business users", async () => {
  vendorTypeStore.set(6, "Crafter & Artisan");
  const req = {
    user: {
      id: 6,
      email: "crafter@handmade.com",
      name: "Clay Studio",
      type: "business",
      accountType: "business",
    },
  };
  const res = createMockRes();

  await handleProfile(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.profile.vendorType, "Crafter & Artisan");
  assert.equal(res.body.profile.category, "Crafter & Artisan");
});
