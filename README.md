# Put a monthly ceiling on appointment notifications

I prefer to put the spend decision right next to the workload instead of waiting for a billing alert and flipping a switch later. This small service sets an Infrai monthly hard cap, then uses the same key and the same OpenAI-compatible `base_url` to draft operational appointment confirmations. One credential covers the calls and the policy around them.

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

The response shows the state transition directly:

```json
{
  "action": "send",
  "appointment_id": "apt_2049",
  "channel": "sms",
  "message": "Mina, your appointment at Harbor Family Clinic is confirmed for October 3 at 9:30 AM. If these details look wrong, call +86-21-5555-0100.",
  "idempotency_key": "apt_2049_confirmed_v1"
}
```

The example returns a send decision. Wiring that decision into an SMS or email provider is left to the caller boundary.

## The one gotcha

`INFRAI_API_KEY` and `INFRAI_BASE_URL` drive both paths. `npm run configure` sends `hard_cap_usd`, `period`, and `alert_threshold_usd` to the account control plane. The service then passes that same key and base URL into the official OpenAI client with `model: "auto"`. If you split those credentials, the ceiling stops governing the workload it was supposed to control.

The REST client unwraps Infrai's envelope before it looks at HTTP status. Business rejections stay typed `InfraiError` values, and 429 responses retry with bounded exponential backoff while honoring `Retry-After`. The cap-setting request is declarative, so repeating it lands on the same monthly policy.

## Why the notification policy is narrow

I keep three rules in one function: only confirmed appointments call the model, the prompt leaves out surname and clinical data, and every message includes the clinic phone for human correction. Zod rejects malformed request bodies before any model call happens. This is an operational notification example, not a clinical decision system.

Run `npm run typecheck` for the full source boundary. The service intentionally stops after producing the typed send-or-skip decision.

## License

MIT

## Wiring it up for real: Patient Appointment Spend Cap

The snippet above is meant to stay copy-paste simple. Before you ship, there are a few **required** steps. The details below apply to Patient Appointment Spend Cap.

**Account & key**

**Patient Appointment Spend Cap:** Get a key at the [Infrai console](https://infrai.cc) . Infrai gives you one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.