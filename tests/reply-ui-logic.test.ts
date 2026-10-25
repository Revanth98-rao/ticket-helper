import { describe, it, expect } from "bun:test";

/**
 * Pure functions mirroring the UI business rules implemented in TicketDetailModal.tsx
 */
export function isSendReplyVisible(replyText: string | null | undefined): boolean {
  return typeof replyText === "string" && replyText.trim().length > 0;
}

export function isPolishDisabled(
  replyText: string | null | undefined,
  isPending: boolean = false
): boolean {
  if (isPending) return true;
  return !replyText || replyText.trim().length === 0;
}

export interface ReplyFormState {
  replyText: string;
  replyError: string | null;
  replySuccess: boolean;
  polishInfo: string | null;
}

export function createInitialReplyFormState(): ReplyFormState {
  return {
    replyText: "",
    replyError: null,
    replySuccess: false,
    polishInfo: null,
  };
}

export function handleTicketChange(
  _previousState: ReplyFormState,
  _newTicketId: string | null
): ReplyFormState {
  // Always clean out draft state when switching tickets to prevent cross-ticket bleed
  return createInitialReplyFormState();
}

export function handleReplySentSuccess(
  _previousState: ReplyFormState
): ReplyFormState {
  return {
    replyText: "",
    replyError: null,
    replySuccess: true,
    polishInfo: null,
  };
}

describe("Reply UI Business Logic & State Rules", () => {
  describe("Send Reply Button Visibility Rule", () => {
    it("hides 'Send Reply' when textarea is empty", () => {
      expect(isSendReplyVisible("")).toBe(false);
    });

    it("hides 'Send Reply' when textarea contains only whitespace or newlines", () => {
      expect(isSendReplyVisible("   ")).toBe(false);
      expect(isSendReplyVisible("\n\n\t  ")).toBe(false);
    });

    it("shows 'Send Reply' when user types any non-whitespace characters", () => {
      expect(isSendReplyVisible("Hello")).toBe(true);
      expect(isSendReplyVisible("  We are reviewing your request  ")).toBe(true);
      expect(isSendReplyVisible("a")).toBe(true);
    });
  });

  describe("Polish Button Enablement Rule", () => {
    it("disables Polish button when textarea is empty or whitespace", () => {
      expect(isPolishDisabled("")).toBe(true);
      expect(isPolishDisabled("    ")).toBe(true);
      expect(isPolishDisabled(null)).toBe(true);
      expect(isPolishDisabled(undefined)).toBe(true);
    });

    it("enables Polish button when rough draft is entered", () => {
      expect(isPolishDisabled("reset credentials and clear cache")).toBe(false);
    });

    it("disables Polish button while mutation is in-flight (pending)", () => {
      expect(isPolishDisabled("reset credentials", true)).toBe(true);
    });
  });

  describe("Ticket Switch & Form Reset Rules", () => {
    it("resets replyText to empty when switching from one ticket to another", () => {
      const activeDraftState: ReplyFormState = {
        replyText: "We have updated Invoice #INV-2026-041 with your reverse-charge VAT ID...",
        replyError: "Some transient error",
        replySuccess: false,
        polishInfo: "Draft polished using Gemini!",
      };

      const newState = handleTicketChange(activeDraftState, "new-ticket-uuid-2");

      expect(newState.replyText).toBe("");
      expect(newState.replyError).toBeNull();
      expect(newState.replySuccess).toBe(false);
      expect(newState.polishInfo).toBeNull();
      expect(isSendReplyVisible(newState.replyText)).toBe(false);
    });

    it("hides Send Reply immediately upon successful reply submission", () => {
      const pendingSubmitState: ReplyFormState = {
        replyText: "Here is your resolved ticket response.",
        replyError: null,
        replySuccess: false,
        polishInfo: null,
      };

      const successState = handleReplySentSuccess(pendingSubmitState);

      expect(successState.replyText).toBe("");
      expect(successState.replySuccess).toBe(true);
      expect(isSendReplyVisible(successState.replyText)).toBe(false);
    });
  });
});

