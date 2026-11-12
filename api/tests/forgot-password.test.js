import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

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
