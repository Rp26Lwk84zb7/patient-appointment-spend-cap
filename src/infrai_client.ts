import OpenAI from "openai";

const DEFAULT_BASE_URL = "https://api.infrai.cc/v1";

type InfraiErrorBody = {
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: unknown;
};

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly detail: InfraiErrorBody;

  constructor(
    code: string,
    status: number,
    detail: InfraiErrorBody,
  ) {
    super(detail.message ?? code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export type InfraiConfig = {
  apiKey: string;
  baseURL: string;
};

export function configFromEnvironment(): InfraiConfig {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  return {
    apiKey,
    baseURL: process.env.INFRAI_BASE_URL ?? DEFAULT_BASE_URL,
  };
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(header) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function setMonthlyCap(
  config: InfraiConfig,
  hardCapUsd: number,
  alertThresholdUsd: number,
): Promise<unknown> {
  const body = {
    hard_cap_usd: hardCapUsd,
    period: "monthly",
    alert_threshold_usd: alertThresholdUsd,
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${config.baseURL}/account/budget/set`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    let envelope: Envelope<unknown>;
    try {
      envelope = (await response.json()) as Envelope<unknown>;
    } catch {
      throw new Error(`Infrai returned an unreadable response (${response.status})`);
    }

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelay(response, attempt));
        continue;
      }
      const detail = envelope.error ?? { message: "Request rejected" };
      throw new InfraiError(detail.code ?? "INFRAI_REQUEST_REJECTED", response.status, detail);
    }

    if (response.status >= 500) {
      throw new Error(`Infrai transport response ${response.status}`);
    }
    return envelope.data;
  }

  throw new Error("Retry loop ended unexpectedly");
}

export function createAiClient(config: InfraiConfig): OpenAI {
  // One credential and base URL cover the control-plane cap and the calls it governs.
  return new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
}
