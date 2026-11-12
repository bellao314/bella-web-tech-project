import test from "node:test";
import assert from "node:assert/strict";

function getNavItems(isVendor) {
  return [
    { path: "/map", icon: "map", label: "Explore" },
    isVendor
      ? { path: "/vendor/my-business", icon: "briefcase", label: "Business" }
      : { path: "/recommended", icon: "sparkles", label: "For you" },
    { path: "/profile", icon: "user", label: "Account" },
  ];
}

function resolveUserRole({ token, user, storedRole }) {
  const raw = user?.accountType || user?.type || storedRole || "customer";
  const accountType = String(raw).toLowerCase();
  const isAuthenticated = Boolean(token);
  const isVendor = isAuthenticated && (accountType === "business" || accountType === "vendor");
  const isCustomer = !isVendor;
  return { isAuthenticated, accountType, isVendor, isCustomer };
}

function getRecommendedRedirect(isVendor) {
  if (isVendor) {
    return "/vendor/my-business";
  }
  return null;
}

function getVendorBusinessRedirect({ isMyBusiness, isAuthenticated, isVendor }) {
  if (isMyBusiness && isAuthenticated && !isVendor) {
    return "/recommended";
  }
  if (isMyBusiness && !isAuthenticated) {
    return "/";
  }
  return null;
}

test("Customer receives For You recommendations tab", () => {
  const roleInfo = resolveUserRole({
    token: "mock-token",
    user: { accountType: "customer" },
    storedRole: "customer",
  });
  assert.equal(roleInfo.isVendor, false);
  assert.equal(roleInfo.isCustomer, true);

  const items = getNavItems(roleInfo.isVendor);
  assert.equal(items.length, 3);
  assert.deepEqual(items[1], {
    path: "/recommended",
    icon: "sparkles",
    label: "For you",
  });
});

test("Vendor receives Business details tab instead of recommendations", () => {
  const roleInfo = resolveUserRole({
    token: "mock-token",
    user: { accountType: "business" },
    storedRole: "business",
  });
  assert.equal(roleInfo.isVendor, true);

  const items = getNavItems(roleInfo.isVendor);
  assert.equal(items.length, 3);
  assert.deepEqual(items[1], {
    path: "/vendor/my-business",
    icon: "briefcase",
    label: "Business",
  });
});

test("Vendor navigating to /recommended is redirected to their business details page", () => {
  const redirectPath = getRecommendedRedirect(true);
  assert.equal(redirectPath, "/vendor/my-business");

  const customerRedirect = getRecommendedRedirect(false);
  assert.equal(customerRedirect, null);
});

test("Customer navigating to /vendor/my-business is redirected away to /recommended", () => {
  const customerRedirect = getVendorBusinessRedirect({
    isMyBusiness: true,
    isAuthenticated: true,
    isVendor: false,
  });
  assert.equal(customerRedirect, "/recommended");

  const vendorRedirect = getVendorBusinessRedirect({
    isMyBusiness: true,
    isAuthenticated: true,
    isVendor: true,
  });
  assert.equal(vendorRedirect, null);
});
