import assert from "node:assert/strict";
import test from "node:test";

import {
  attachCanonicalRequestUser,
  destroyAuthenticatedSession,
  getRequestUserId,
  requireRequestUser,
} from "./requestUser";

test("request identity resolves canonical sources in precedence order", () => {
  const req: any = {
    authUserId: "canonical",
    session: { userId: "password-session", user: { id: "session-user" } },
    user: { claims: { sub: "passport-claim" }, id: "passport-id", sub: "oidc-sub" },
  };

  assert.equal(getRequestUserId(req), "canonical");
  delete req.authUserId;
  assert.equal(getRequestUserId(req), "password-session");
  assert.equal(getRequestUserId({}), null);
});

test("canonical attachment preserves session profile while normalizing the protected-route claim", () => {
  const req: any = {
    user: { access_token: "opaque", claims: { email: "old@example.com" } },
    session: { user: { email: "new@example.com", currentBrandId: 8 } },
  };

  attachCanonicalRequestUser(req, "user-8");

  assert.equal(req.user.id, "user-8");
  assert.equal(req.user.claims.sub, "user-8");
  assert.equal(req.user.claims.email, "old@example.com");
  assert.equal(req.user.email, "new@example.com");
  assert.equal(req.user.currentBrandId, 8);
});

test("request guard returns 401 without identity and stores authenticated identity otherwise", () => {
  const missingResponse: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  let nextCalls = 0;
  requireRequestUser({} as any, missingResponse, () => { nextCalls += 1; });
  assert.equal(missingResponse.statusCode, 401);
  assert.equal(nextCalls, 0);

  const authenticated: any = { session: { userId: "user-a" } };
  requireRequestUser(authenticated, missingResponse, () => { nextCalls += 1; });
  assert.equal(authenticated.authUserId, "user-a");
  assert.equal(nextCalls, 1);
});

test("session destruction still runs when Passport logout fails, then surfaces the error", async () => {
  const calls: string[] = [];
  const req: any = {
    logout(callback: (error?: Error) => void) {
      calls.push("passport.logout");
      callback(new Error("passport failed"));
    },
    session: {
      destroy(callback: (error?: Error) => void) {
        calls.push("session.destroy");
        callback();
      },
    },
  };

  await assert.rejects(() => destroyAuthenticatedSession(req), /passport failed/);
  assert.deepEqual(calls, ["passport.logout", "session.destroy"]);
});
