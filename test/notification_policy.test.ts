import assert from "node:assert/strict";
import test from "node:test";
import type OpenAI from "openai";
import { decideAppointmentNotification } from "../src/notification_policy.js";

test("a cancelled appointment never spends an AI call or produces a message", async () => {
  let calls = 0;
  const ai = {
    chat: {
      completions: {
        create: async () => {
          calls += 1;
          throw new Error("unexpected call");
        },
      },
    },
  } as unknown as Pick<OpenAI, "chat">;

  const decision = await decideAppointmentNotification(
    {
      appointment_id: "apt_2048",
      patient_first_name: "Mina",
      starts_at: "2026-10-03T09:30:00+08:00",
      status: "cancelled",
      channel: "sms",
      clinic_name: "Harbor Family Clinic",
      clinic_phone: "+86-21-5555-0100",
      idempotency_key: "apt_2048_cancelled_v1",
    },
    ai,
  );

  assert.deepEqual(decision, {
    action: "skip",
    appointment_id: "apt_2048",
    reason: "not_confirmed",
  });
  assert.equal(calls, 0);
});
