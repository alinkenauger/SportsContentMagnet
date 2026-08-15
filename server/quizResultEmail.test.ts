import assert from "node:assert/strict";
import test from "node:test";
import { EmailService } from "./services/emailService";

test("quiz result email delivers the diagnosis safely and links back to the full report", async () => {
  const service = new EmailService();
  let captured: { to?: string; subject?: string; html?: string } | undefined;
  service.sendEmail = async (params) => {
    captured = params;
    return true;
  };

  const sent = await service.sendQuizResultEmail({
    to: "lead@example.com",
    firstName: "<Adam>",
    quizTitle: "Follow-through <script>alert(1)</script>",
    outcomeTitle: "The Focused Builder",
    outcomeSummary: "You have momentum & a clear opportunity.",
    quickWin: {
      title: "Name one next move",
      action: "Write it down before leaving this page.",
      timeframe: "5 minutes",
    },
    resultUrl: "https://example.com/quiz/follow-through?attemptId=abc",
    brandName: "Example Brand",
    primaryColor: "red; background:url(javascript:alert(1))",
    onPrimaryColor: "#FFFFFF",
  });

  assert.equal(sent, true);
  assert.equal(captured?.to, "lead@example.com");
  assert.match(captured?.subject || "", /The Focused Builder/);
  assert.match(captured?.html || "", /Open my full diagnostic report/);
  assert.match(captured?.html || "", /5 minutes/);
  assert.match(captured?.html || "", /&lt;Adam&gt;/);
  assert.doesNotMatch(captured?.html || "", /<script>|javascript:/i);
  assert.match(captured?.html || "", /background:#2563EB/);
});
