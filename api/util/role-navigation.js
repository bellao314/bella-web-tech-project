/**
 * Returns navigation items for bottom navigation or sidebar depending on account role.
 */
export function getNavItems(isVendor) {
  return [
    { path: "/map", icon: "map", label: "Explore" },
    isVendor
      ? { path: "/vendor/my-business", icon: "briefcase", label: "Business" }
      : { path: "/recommended", icon: "sparkles", label: "For you" },
    { path: "/profile", icon: "user", label: "Account" },
  ];
}

/**
 * Resolves user role and authentication flags from token, user object, or stored role.
 */
export function resolveUserRole({ token, user, storedRole } = {}) {
  const raw = user?.accountType || user?.type || storedRole || "customer";
  const accountType = String(raw).toLowerCase();
  const isAuthenticated = Boolean(token);
  const isVendor = isAuthenticated && (accountType === "business" || accountType === "vendor");
  const isCustomer = !isVendor;
  return { isAuthenticated, accountType, isVendor, isCustomer };
}

/**
 * Returns redirection path if a vendor navigates to /recommended.
 */
export function getRecommendedRedirect(isVendor) {
  if (isVendor) {
    return "/vendor/my-business";
  }
  return null;
}

/**
 * Returns redirection path for business pages based on authentication and role.
 */
export function getVendorBusinessRedirect({ isMyBusiness, isAuthenticated, isVendor } = {}) {
  if (isMyBusiness && isAuthenticated && !isVendor) {
    return "/recommended";
  }
  if (isMyBusiness && !isAuthenticated) {
    return "/";
  }
  return null;
}
