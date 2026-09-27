import { configFromEnvironment, setMonthlyCap } from "./infrai_client.js";

const hardCapUsd = Number(process.env.MONTHLY_HARD_CAP_USD ?? 40);
const alertThresholdUsd = Number(process.env.MONTHLY_ALERT_THRESHOLD_USD ?? 30);

if (!Number.isFinite(hardCapUsd) || hardCapUsd <= 0) {
  throw new Error("MONTHLY_HARD_CAP_USD must be a positive number");
}
if (!Number.isFinite(alertThresholdUsd) || alertThresholdUsd <= 0 || alertThresholdUsd > hardCapUsd) {
  throw new Error("MONTHLY_ALERT_THRESHOLD_USD must be positive and no greater than the cap");
}

await setMonthlyCap(configFromEnvironment(), hardCapUsd, alertThresholdUsd);
console.log(`Monthly hard cap configured at USD ${hardCapUsd.toFixed(2)}`);
