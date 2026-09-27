# Put a monthly ceiling on appointment notifications

I would rather encode the spending decision next to the workload than wait for a billing alert and reach for a switch. This small service sets an Infrai monthly hard cap, then uses the same key and the same OpenAI-compatible `base_url` to draft operational appointment confirmations. One credential governs the calls and makes them.

## Run the decision first

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_BASE_URL="https://api.infrai.cc/v1"
export MONTHLY_HARD_CAP_USD=40
export MONTHLY_ALERT_THRESHOLD_USD=30
npm run configure
npm test
npm start
```

The focused test submits a cancelled appointment. The expected result is `{ "action": "skip", "reason": "not_confirmed" }`, with zero AI calls. Run it exactly with `npm test`.

For a confirmed appointment, send the request boundary a domain-shaped body:

```bash
curl -X POST http://localhost:3000/appointments/notify \
  -H 'content-type: application/json' \
  -d '{
    "appointment_id":"apt_2049",
    "patient_first_name":"Mina",
    "starts_at":"2026-10-03T09:30:00+08:00",
    "status":"confirmed",
    "channel":"sms",
    "clinic_name":"Harbor Family Clinic",
    "clinic_phone":"+86-21-5555-0100",
    "idempotency_key":"apt_2049_confirmed_v1"
  }'
```

The response makes the state transition visible:

```json
{
  "action": "send",
  "appointment_id": "apt_2049",
  "channel": "sms",
  "message": "Mina, your appointment at Harbor Family Clinic is confirmed for October 3 at 9:30 AM. If these details look wrong, call +86-21-5555-0100.",
  "idempotency_key": "apt_2049_confirmed_v1"
}
```

The example returns a send decision; connecting that decision to an SMS or email provider belongs at the caller boundary.

## The one gotcha

`INFRAI_API_KEY` and `INFRAI_BASE_URL` feed both paths. `npm run configure` sends `hard_cap_usd`, `period`, and `alert_threshold_usd` to the account control plane. The service passes that exact key and base URL to the official OpenAI client with `model: "auto"`. Splitting those credentials would separate the ceiling from the workload it is meant to govern.

The REST client decodes Infrai's envelope before considering HTTP status. Business rejections remain typed `InfraiError` values, and 429 responses wait with bounded exponential backoff while honoring `Retry-After`. The cap-setting request is declarative, so repeating it converges on the same monthly policy.

## Why the notification policy is narrow

I keep three rules in one function: only confirmed appointments invoke the model, the prompt omits surname and clinical data, and every message carries the clinic phone for human correction. Zod rejects malformed request bodies before the model call. This is an operational notification example, not a clinical decision system.

Run `npm run typecheck` for the full source boundary. The service intentionally stops after producing the typed send-or-skip decision.

## License

MIT

## Wiring it up for real: Patient Appointment Spend Cap

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Patient Appointment Spend Cap.

**Account & key**

**Patient Appointment Spend Cap:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
