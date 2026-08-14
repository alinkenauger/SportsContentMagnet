import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/vidmagnet_test";

const { createRequireRole, Role } = await import("./roleAuth");

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

test("super-admin middleware accepts canonical password-session identity only at the required role", async () => {
  const middleware = createRequireRole(
    Role.SUPER_ADMIN,
    async (userId) => ({
      role: userId === "root-user"
        ? "super_admin"
        : userId === "legacy-admin"
          ? "admin"
          : "account_admin",
    }),
  );
  let nextCalls = 0;
  const allowedResponse = response();
  await middleware(
    { session: { userId: "root-user", user: { id: "root-user" } } } as any,
    allowedResponse as any,
    () => { nextCalls += 1; },
  );
  assert.equal(nextCalls, 1);

  const deniedResponse = response();
  await middleware(
    { session: { userId: "ordinary-user", user: { id: "ordinary-user" } } } as any,
    deniedResponse as any,
    () => { nextCalls += 1; },
  );
  assert.equal(deniedResponse.statusCode, 403);
  assert.equal(nextCalls, 1);

  const legacyAdminResponse = response();
  await middleware(
    { session: { userId: "legacy-admin", user: { id: "legacy-admin" } } } as any,
    legacyAdminResponse as any,
    () => { nextCalls += 1; },
  );
  assert.equal(legacyAdminResponse.statusCode, 403);
  assert.equal(nextCalls, 1);
});

test("admin user and stats routes have one authenticated registration each", async () => {
  const source = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const registrations = [
    "app.patch('/api/admin/guides/:id/transfer', isAuthenticated, requireSuperAdmin",
    "app.post('/api/subscription/init-plans', isAuthenticated, requireSuperAdmin",
    "app.get('/api/admin/users', isAuthenticated, requireSuperAdmin",
    "app.post('/api/admin/users', isAuthenticated, requireSuperAdmin",
    "app.get('/api/admin/stats', isAuthenticated, requireSuperAdmin",
    "app.delete('/api/admin/users/:userId', isAuthenticated, requireSuperAdmin",
    "app.patch('/api/admin/users/:userId/role', isAuthenticated, requireSuperAdmin",
    "app.post('/api/admin/storage/cleanup', isAuthenticated, requireSuperAdmin",
  ];

  for (const registration of registrations) {
    assert.equal(source.split(registration).length - 1, 1, registration);
  }
  assert.doesNotMatch(source, /temporary bypass for broken session/i);
  assert.doesNotMatch(source, /isGlobalAdmin|\badminAuth\b/);
});
