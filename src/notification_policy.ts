import type OpenAI from "openai";
import { z } from "zod";

export const appointmentRequestSchema = z.object({
  appointment_id: z.string().min(1),
  patient_first_name: z.string().min(1),
  starts_at: z.string().datetime({ offset: true }),
  status: z.enum(["pending", "confirmed", "cancelled"]),
  channel: z.enum(["sms", "email"]),
  clinic_name: z.string().min(1),
  clinic_phone: z.string().min(1),
  idempotency_key: z.string().min(8),
});

export type AppointmentRequest = z.infer<typeof appointmentRequestSchema>;

export type NotificationDecision =
  | { action: "skip"; appointment_id: string; reason: "not_confirmed" }
  | {
      action: "send";
      appointment_id: string;
      channel: "sms" | "email";
      message: string;
      idempotency_key: string;
    };

type ChatClient = Pick<OpenAI, "chat">;

export async function decideAppointmentNotification(
  input: AppointmentRequest,
  ai: ChatClient,
): Promise<NotificationDecision> {
  if (input.status !== "confirmed") {
    return {
      action: "skip",
      appointment_id: input.appointment_id,
      reason: "not_confirmed",
    };
  }

  const completion = await ai.chat.completions.create({
    model: "auto",
    messages: [
      {
        role: "system",
        content:
          "Write one concise appointment confirmation. State the date, clinic, and clinic phone. Include no diagnosis, treatment advice, or patient surname. Tell the patient to call the clinic if details look wrong.",
      },
      {
        role: "user",
        content: JSON.stringify({
          patient_first_name: input.patient_first_name,
          starts_at: input.starts_at,
          clinic_name: input.clinic_name,
          clinic_phone: input.clinic_phone,
          channel: input.channel,
        }),
      },
    ],
  });

  const message = completion.choices[0]?.message.content?.trim();
  if (!message) throw new Error("AI response did not contain notification text");

  return {
    action: "send",
    appointment_id: input.appointment_id,
    channel: input.channel,
    message,
    idempotency_key: input.idempotency_key,
  };
}
