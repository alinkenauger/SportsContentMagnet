import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/vidmagnet_test";
process.env.HIGHLEVEL_API_KEY ||= "test-key";

const {
  HighLevelService,
  publicAppBaseUrl,
} = await import("./services/emailService");
const {
  PENDING_SIGNUP_TTL_MS,
  hashAccountCompletionToken,
  registerAuthRoutes,
} = await import("./authRoutes");
const {
  attachCanonicalRequestUser,
  destroyAuthenticatedSession,
} = await import("./requestUser");

const NOW = Date.parse("2026-08-14T12:00:00.000Z");
const RAW_TOKEN = "a".repeat(64);
const FOREIGN_TOKEN = "b".repeat(64);

function pendingUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-a",
    email: "creator@example.com",
    firstName: "Ada",
    lastName: "Creator",
    profileImageUrl: null,
    tempPassword: null,
    resetToken: hashAccountCompletionToken(RAW_TOKEN),
    resetTokenExpiry: new Date(NOW + PENDING_SIGNUP_TTL_MS),
    emailVerificationToken: null,
    isEmailVerified: false,
    currentBrandId: null,
    role: "user",
    subscriptionTier: "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    billingCycle: "monthly",
    additionalBrands: 0,
    accountStatus: "active",
    pausedAt: null,
    storageQuotaGB: "1.0",
    storageUsedMB: "0",
    monthlyStorageCostUSD: "0",
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  };
}

function makeStorage(overrides: Record<string, unknown> = {}) {
  return {
    createPendingUser: async () => ({ user: pendingUser(), created: true }),
    getUser: async () => undefined,
    getUserByEmail: async () => undefined,
    getPendingUserByCompletionTokenHash: async () => undefined,
    claimAccountCompletionToken: async () => true,
    releaseAccountCompletionToken: async () => undefined,
    completePendingUserById: async () => undefined,
    completePendingUserWithTokenHash: async () => undefined,
    updateUserPassword: async () => undefined,
    getSubscriptionPlans: async () => [],
    ensureUserSubscription: async () => undefined,
    ...overrides,
  };
}

function makeDependencies(storageOverrides: Record<string, unknown> = {}) {
  return {
    storage: makeStorage(storageOverrides),
    emailService: {
      sendAccountCompletionEmail: async () => true,
      sendWelcomeEmail: async () => true,
    },
    highLevelService: {
      addContact: async () => true,
    },
    now: () => NOW,
    generateCompletionToken: () => RAW_TOKEN,
    hashPassword: async (password: string) => `hashed:${password}`,
    comparePassword: async (password: string, hashedPassword: string) => hashedPassword === `hashed:${password}`,
  };
}

function makeRoutes(dependencies: ReturnType<typeof makeDependencies>) {
  const routes = new Map<string, (req: any, res: any) => Promise<unknown>>();
  const app = {
    post(path: string, ...handlers: Array<(req: any, res: any) => Promise<unknown>>) {
      routes.set(`POST ${path}`, handlers.at(-1)!);
      return app;
    },
    get(path: string, ...handlers: Array<(req: any, res: any) => Promise<unknown>>) {
      routes.set(`GET ${path}`, handlers.at(-1)!);
      return app;
    },
  };
  registerAuthRoutes(app as any, dependencies as any);
  return routes;
}

function attachSession(
  req: any,
  initial: Record<string, unknown> = {},
  options: { failSave?: boolean; failRegenerate?: boolean } = {},
) {
  const calls = { save: 0, regenerate: 0 };
  const createSession = (data: Record<string, unknown>) => ({
    ...data,
    save(callback: (error?: Error) => void) {
      calls.save += 1;
      callback(options.failSave ? new Error("session save failed") : undefined);
    },
    regenerate(callback: (error?: Error) => void) {
      calls.regenerate += 1;
      if (options.failRegenerate) {
        callback(new Error("session regenerate failed"));
        return;
      }
      req.session = createSession({});
      callback();
    },
  });
  req.session = createSession(initial);
  return calls;
}

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined as any,
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

async function invoke(
  routes: ReturnType<typeof makeRoutes>,
  method: "POST" | "GET",
  path: string,
  body: Record<string, unknown>,
  session: Record<string, unknown> = {},
  sessionOptions: { failSave?: boolean; failRegenerate?: boolean } = {},
) {
  const req: any = { body, params: {}, user: undefined };
  const sessionCalls = attachSession(req, session, sessionOptions);
  const res = makeResponse();
  const handler = routes.get(`${method} ${path}`);
  assert.ok(handler, `Missing route ${method} ${path}`);
  await handler(req, res);
  return { req, res, sessionCalls };
}

test("valid emailed recovery is token-bound, single-use, verified, and session-persisted", async () => {
  let tokenWasConsumed = false;
  let completedHash = "";
  const user = pendingUser();
  const dependencies = makeDependencies({
    getPendingUserByCompletionTokenHash: async (hash: string) => (
      !tokenWasConsumed && hash === user.resetToken ? user : undefined
    ),
    completePendingUserWithTokenHash: async (hash: string, password: string, now: Date) => {
      completedHash = hash;
      assert.equal(password, "hashed:correct horse battery staple");
      assert.equal(now.getTime(), NOW);
      if (tokenWasConsumed || hash !== user.resetToken) return undefined;
      tokenWasConsumed = true;
      return pendingUser({
        tempPassword: password,
        resetToken: null,
        resetTokenExpiry: null,
        isEmailVerified: true,
      });
    },
  });
  let welcomeCalls = 0;
  dependencies.emailService.sendWelcomeEmail = async () => {
    welcomeCalls += 1;
    return true;
  };
  const routes = makeRoutes(dependencies);

  const first = await invoke(routes, "POST", "/api/auth/complete-account", {
    password: "correct horse battery staple",
    token: RAW_TOKEN,
  });
  assert.equal(first.res.statusCode, 200);
  assert.equal(first.res.body.authenticated, true);
  assert.equal(first.res.body.emailVerified, true);
  assert.equal(completedHash, hashAccountCompletionToken(RAW_TOKEN));
  assert.notEqual(completedHash, RAW_TOKEN);
  assert.equal(first.sessionCalls.regenerate, 1);
  assert.equal(first.sessionCalls.save, 1);
  assert.equal(first.req.session.userId, "user-a");
  assert.equal(welcomeCalls, 1);

  const used = await invoke(routes, "POST", "/api/auth/complete-account", {
    password: "correct horse battery staple",
    token: RAW_TOKEN,
  });
  assert.equal(used.res.statusCode, 400);
  assert.equal(used.res.body.code, "INVALID_OR_EXPIRED_COMPLETION");
});

test("expired emailed recovery is rejected before password hashing", async () => {
  let hashCalls = 0;
  const dependencies = makeDependencies({
    getPendingUserByCompletionTokenHash: async () => pendingUser({
      resetTokenExpiry: new Date(NOW),
    }),
  });
  dependencies.hashPassword = async () => {
    hashCalls += 1;
    return "should-not-run";
  };
  const result = await invoke(
    makeRoutes(dependencies),
    "POST",
    "/api/auth/complete-account",
    { password: "long enough password", token: RAW_TOKEN },
  );

  assert.equal(result.res.statusCode, 400);
  assert.equal(result.res.body.code, "INVALID_OR_EXPIRED_COMPLETION");
  assert.equal(hashCalls, 0);
});

test("foreign session cannot retarget an emailed recovery token", async () => {
  const tokenOwner = pendingUser({ id: "token-owner" });
  let completedUserId = "";
  const dependencies = makeDependencies({
    getPendingUserByCompletionTokenHash: async (hash: string) => (
      hash === tokenOwner.resetToken ? tokenOwner : undefined
    ),
    completePendingUserWithTokenHash: async (hash: string, password: string) => {
      assert.equal(hash, tokenOwner.resetToken);
      completedUserId = tokenOwner.id;
      return { ...tokenOwner, tempPassword: password, isEmailVerified: true };
    },
  });
  const result = await invoke(
    makeRoutes(dependencies),
    "POST",
    "/api/auth/complete-account",
    { password: "long enough password", token: RAW_TOKEN },
    { pendingSignupUserId: "foreign-user", pendingSignupExpiresAt: NOW + PENDING_SIGNUP_TTL_MS },
  );

  assert.equal(result.res.statusCode, 200);
  assert.equal(completedUserId, "token-owner");
  assert.equal(result.req.session.userId, "token-owner");
});

test("unknown recovery does not fall back to a foreign pending session", async () => {
  let sessionCompletionCalls = 0;
  const dependencies = makeDependencies({
    getPendingUserByCompletionTokenHash: async () => undefined,
    completePendingUserById: async () => {
      sessionCompletionCalls += 1;
      return pendingUser();
    },
  });
  const result = await invoke(
    makeRoutes(dependencies),
    "POST",
    "/api/auth/complete-account",
    { password: "long enough password", token: FOREIGN_TOKEN },
    { pendingSignupUserId: "user-a", pendingSignupExpiresAt: NOW + PENDING_SIGNUP_TTL_MS },
  );

  assert.equal(result.res.statusCode, 400);
  assert.equal(sessionCompletionCalls, 0);
});

test("same-session completion keeps email unverified and rotates then saves the session", async () => {
  const user = pendingUser();
  const dependencies = makeDependencies({
    getUser: async (id: string) => id === user.id ? user : undefined,
    completePendingUserById: async (id: string, password: string) => (
      id === user.id
        ? pendingUser({ tempPassword: password, resetToken: null, resetTokenExpiry: null })
        : undefined
    ),
  });
  const result = await invoke(
    makeRoutes(dependencies),
    "POST",
    "/api/auth/complete-account",
    { password: "long enough password" },
    { pendingSignupUserId: user.id, pendingSignupExpiresAt: NOW + PENDING_SIGNUP_TTL_MS },
  );

  assert.equal(result.res.statusCode, 200);
  assert.equal(result.res.body.emailVerified, false);
  assert.equal(result.sessionCalls.regenerate, 1);
  assert.equal(result.sessionCalls.save, 1);
});

test("signup retry is idempotent and resumable while CRM cannot block success", async () => {
  const user = pendingUser({ resetToken: null, resetTokenExpiry: null });
  let signupCalls = 0;
  let subscriptionCreates = 0;
  let subscriptionExists = false;
  const dependencies = makeDependencies({
    createPendingUser: async () => ({
      user,
      created: signupCalls++ === 0,
    }),
    getSubscriptionPlans: async () => [{ id: 10, name: "free" }],
    ensureUserSubscription: async () => {
      if (!subscriptionExists) {
        subscriptionCreates += 1;
        subscriptionExists = true;
      }
    },
  });
  let crmCalls = 0;
  dependencies.highLevelService.addContact = () => {
    crmCalls += 1;
    return new Promise<boolean>(() => {});
  };
  const routes = makeRoutes(dependencies);
  const req: any = {
    body: { firstName: "Ada", lastName: "Creator", email: "Creator@Example.com" },
  };
  const sessionCalls = attachSession(req);

  const firstRes = makeResponse();
  await routes.get("POST /api/auth/signup")!(req, firstRes);
  assert.equal(firstRes.statusCode, 201);
  assert.equal(firstRes.body.nextStep, "completeAccount");
  assert.equal(req.session.pendingSignupUserId, user.id);

  const secondRes = makeResponse();
  await routes.get("POST /api/auth/signup")!(req, secondRes);
  assert.equal(secondRes.statusCode, 200);
  assert.equal(secondRes.body.resumed, true);
  assert.equal(subscriptionCreates, 1);
  assert.equal(sessionCalls.save, 2);
  assert.equal(crmCalls, 1);
});

test("simultaneous signup attempts use the atomic subscription ensure contract", async () => {
  const user = pendingUser({ resetToken: null, resetTokenExpiry: null });
  let signupCalls = 0;
  let subscriptionCreates = 0;
  let subscription: { id: number } | undefined;
  let subscriptionQueue = Promise.resolve();
  const dependencies = makeDependencies({
    createPendingUser: async () => ({
      user,
      created: signupCalls++ === 0,
    }),
    getSubscriptionPlans: async () => [{ id: 10, name: "free" }],
    ensureUserSubscription: async () => {
      const previous = subscriptionQueue;
      let releaseQueue!: () => void;
      subscriptionQueue = new Promise<void>((resolve) => {
        releaseQueue = resolve;
      });
      await previous;
      try {
        if (!subscription) {
          await Promise.resolve();
          subscriptionCreates += 1;
          subscription = { id: 1 };
        }
        return subscription;
      } finally {
        releaseQueue();
      }
    },
  });
  const routes = makeRoutes(dependencies);

  const signup = () => invoke(
    routes,
    "POST",
    "/api/auth/signup",
    { firstName: "Ada", lastName: "Creator", email: "creator@example.com" },
  );
  const [first, second] = await Promise.all([signup(), signup()]);

  assert.deepEqual(
    [first.res.statusCode, second.res.statusCode].sort((a, b) => a - b),
    [201, 202],
  );
  assert.equal(subscriptionCreates, 1);
});

test("a pending signup in another browser receives a hashed emailed recovery", async () => {
  const user = pendingUser({ resetToken: null, resetTokenExpiry: null });
  let storedHash = "";
  let emailedToken = "";
  const dependencies = makeDependencies({
    createPendingUser: async () => ({ user, created: false }),
    ensureUserSubscription: async () => ({ id: 1 }),
    claimAccountCompletionToken: async (_id: string, hash: string, expiry: Date) => {
      storedHash = hash;
      assert.equal(expiry.getTime(), NOW + PENDING_SIGNUP_TTL_MS);
      return true;
    },
  });
  dependencies.emailService.sendAccountCompletionEmail = async (_user, token) => {
    emailedToken = token;
    return true;
  };
  const result = await invoke(
    makeRoutes(dependencies),
    "POST",
    "/api/auth/signup",
    { firstName: "Ada", lastName: "Creator", email: "creator@example.com" },
  );

  assert.equal(result.res.statusCode, 202);
  assert.equal(result.res.body.nextStep, "checkEmail");
  assert.equal(emailedToken, RAW_TOKEN);
  assert.equal(storedHash, hashAccountCompletionToken(RAW_TOKEN));
  assert.notEqual(storedHash, emailedToken);
});

test("an unexpired completion token is not rotated or emailed again", async () => {
  const user = pendingUser({ resetToken: "existing-hash" });
  const dependencies = makeDependencies({
    createPendingUser: async () => ({ user, created: false }),
    claimAccountCompletionToken: async () => false,
  });
  let emailCalls = 0;
  dependencies.emailService.sendAccountCompletionEmail = async () => {
    emailCalls += 1;
    return true;
  };

  const result = await invoke(
    makeRoutes(dependencies),
    "POST",
    "/api/auth/signup",
    { firstName: "Ada", lastName: "Creator", email: "creator@example.com" },
  );

  assert.equal(result.res.statusCode, 202);
  assert.equal(result.res.body.nextStep, "checkEmail");
  assert.equal(emailCalls, 0);
});

test("failed recovery delivery releases only the claimed completion token", async () => {
  const user = pendingUser({ resetToken: null, resetTokenExpiry: null });
  let releasedHash = "";
  const dependencies = makeDependencies({
    createPendingUser: async () => ({ user, created: false }),
    claimAccountCompletionToken: async () => true,
    releaseAccountCompletionToken: async (_userId: string, tokenHash: string) => {
      releasedHash = tokenHash;
    },
  });
  dependencies.emailService.sendAccountCompletionEmail = async () => false;

  const result = await invoke(
    makeRoutes(dependencies),
    "POST",
    "/api/auth/signup",
    { firstName: "Ada", lastName: "Creator", email: "creator@example.com" },
  );

  assert.equal(result.res.statusCode, 503);
  assert.equal(result.res.body.code, "RECOVERY_EMAIL_UNAVAILABLE");
  assert.equal(releasedHash, hashAccountCompletionToken(RAW_TOKEN));
});

test("auth email origins reject malformed and insecure production URLs", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousPublicAppUrl = process.env.PUBLIC_APP_URL;
  const previousReplitDomains = process.env.REPLIT_DOMAINS;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.REPLIT_DOMAINS;
    process.env.PUBLIC_APP_URL = "http://vidmagnet.example";
    assert.equal(publicAppBaseUrl(), undefined);
    process.env.PUBLIC_APP_URL = "javascript:alert(1)";
    assert.equal(publicAppBaseUrl(), undefined);
    process.env.PUBLIC_APP_URL = "https://user:pass@vidmagnet.example";
    assert.equal(publicAppBaseUrl(), undefined);
    process.env.PUBLIC_APP_URL = "https://vidmagnet.example/app";
    assert.equal(publicAppBaseUrl(), undefined);
    process.env.PUBLIC_APP_URL = "https://vidmagnet.example/";
    assert.equal(publicAppBaseUrl(), "https://vidmagnet.example");
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousPublicAppUrl === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previousPublicAppUrl;
    if (previousReplitDomains === undefined) delete process.env.REPLIT_DOMAINS;
    else process.env.REPLIT_DOMAINS = previousReplitDomains;
  }
});

test("password sessions receive the canonical identity shape expected by protected routes", () => {
  const req: any = {
    session: {
      userId: "user-a",
      user: { id: "user-a", email: "creator@example.com", currentBrandId: 12 },
    },
  };
  attachCanonicalRequestUser(req, req.session.userId);

  assert.equal(req.user.id, "user-a");
  assert.equal(req.user.claims.sub, "user-a");
  assert.equal(req.user.currentBrandId, 12);
});

test("logout destroys both Passport and password-session authentication", async () => {
  const calls: string[] = [];
  const req: any = {
    session: {
      userId: "user-a",
      user: { id: "user-a" },
      destroy(callback: (error?: Error) => void) {
        calls.push("session.destroy");
        delete req.session.userId;
        delete req.session.user;
        callback();
      },
    },
    logout(callback: (error?: Error) => void) {
      calls.push("passport.logout");
      callback();
    },
  };

  await destroyAuthenticatedSession(req);

  assert.deepEqual(calls, ["passport.logout", "session.destroy"]);
  assert.equal(req.session.userId, undefined);
  assert.equal(req.session.user, undefined);
});

test("a password session can rotate its password without clearing the new hash", async () => {
  let updatedPassword = "";
  const user = pendingUser({ tempPassword: "hashed:old-password" });
  const dependencies = makeDependencies({
    getUser: async (id: string) => id === user.id ? user : undefined,
    updateUserPassword: async (id: string, password: string) => {
      assert.equal(id, user.id);
      updatedPassword = password;
    },
  });
  const result = await invoke(
    makeRoutes(dependencies),
    "POST",
    "/api/auth/change-password",
    { currentPassword: "old-password", newPassword: "new-password" },
    { userId: user.id, user: { id: user.id } },
  );

  assert.equal(result.res.statusCode, 200);
  assert.equal(updatedPassword, "hashed:new-password");
});

test("session persistence failure never reports authenticated success", async () => {
  const user = pendingUser();
  const dependencies = makeDependencies({
    getUser: async () => user,
    completePendingUserById: async (_id: string, password: string) => ({
      ...user,
      tempPassword: password,
    }),
  });
  const result = await invoke(
    makeRoutes(dependencies),
    "POST",
    "/api/auth/complete-account",
    { password: "long enough password" },
    { pendingSignupUserId: user.id, pendingSignupExpiresAt: NOW + PENDING_SIGNUP_TTL_MS },
    { failSave: true },
  );

  assert.equal(result.res.statusCode, 503);
  assert.equal(result.res.body.code, "ACCOUNT_COMPLETED_SIGN_IN_REQUIRED");
  assert.equal(result.res.body.redirect, "/login");
});

test("HighLevel requests time out without rejecting the signup path", async () => {
  const service = new HighLevelService({
    requestTimeoutMs: 5,
    fetchImpl: ((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as typeof fetch,
  });

  const result = await service.addContact({
    firstName: "Ada",
    lastName: "Creator",
    email: "creator@example.com",
  });
  assert.equal(result, false);
});
