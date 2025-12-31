import Ajv from "ajv";
import axios, { type AxiosInstance } from "axios";
import pLimit from "p-limit";

import type {
  JsonSchemaFormat,
  OpenRouterConfig,
  OpenRouterMessage,
  OpenRouterReply,
  ParsedReply,
  ResponseFormat,
  SendChatOptions,
} from "../../types";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RATE_LIMIT_QPS = 1;
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export class OpenRouterService {
  private readonly axios: AxiosInstance;
  private readonly ajv: Ajv;
  private readonly rateLimiter = pLimit(1);
  private lastRequestAt = 0;

  constructor(private readonly config: OpenRouterConfig) {
    this.axios = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: config.timeoutMs,
    });

    this.ajv = new Ajv({ allErrors: true, strict: false });
  }

  setDefaultModel(model: string): void {
    this.config.defaultModel = model;
  }

  buildMessage(role: OpenRouterMessage["role"], content: string): OpenRouterMessage {
    return { role, content };
  }

  async sendChat(messages: OpenRouterMessage[], opts: SendChatOptions = {}): Promise<ParsedReply> {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages must contain at least one item");
    }

    await this.ensureRateLimit();

    const payload = {
      model: opts.model ?? this.config.defaultModel,
      messages,
      response_format: opts.response_format,
      temperature: opts.temperature,
      max_tokens: opts.max_tokens,
    };

    return this.withRetry(async () => {
      const { data } = await this.axios.post<OpenRouterReply>("/chat/completions", payload, {
        signal: opts.abortSignal,
      });
      return this.parseResponse(data, opts.response_format);
    });
  }

  private async withRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const shouldRetry = this.shouldRetry(error) && attempt < this.config.maxRetries;
      if (!shouldRetry) {
        throw this.handleError(error);
      }

      const delayMs = Math.pow(2, attempt) * 500;
      await this.sleep(delayMs);
      return this.withRetry(fn, attempt + 1);
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    const status = error.response?.status;
    if (status && [401, 403, 404].includes(status)) {
      return false;
    }

    if (status && (status === 429 || status >= 500)) {
      return true;
    }

    return error.code === "ECONNABORTED" || error.message.toLowerCase().includes("timeout");
  }

  private ensureRateLimit(): Promise<void> {
    const minInterval = 1000 / Math.max(1, this.config.rateLimitQPS);

    return this.rateLimiter(async () => {
      const now = Date.now();
      const waitMs = Math.max(0, this.lastRequestAt + minInterval - now);
      if (waitMs > 0) {
        await this.sleep(waitMs);
      }
      this.lastRequestAt = Date.now();
    });
  }

  private parseResponse(resp: OpenRouterReply, responseFormat?: ResponseFormat): ParsedReply {
    if (!resp || !Array.isArray(resp.choices) || resp.choices.length === 0) {
      throw new Error("OpenRouter response is missing choices");
    }

    const choice = resp.choices[0];
    if (!choice?.message?.content) {
      throw new Error("OpenRouter response is missing message content");
    }

    const content = choice.message.content;
    let parsedJson: unknown;

    if (responseFormat?.type === "json_schema") {
      parsedJson = this.parseAndValidateJson(content, responseFormat);
    }

    return {
      raw: resp,
      message: choice.message,
      content,
      json: parsedJson,
    };
  }

  private parseAndValidateJson(content: string, format: JsonSchemaFormat): unknown {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${(error as Error).message}`);
    }

    const valid = this.ajv.validate(format.json_schema.schema, parsed);
    if (!valid) {
      const details = this.ajv.errorsText(this.ajv.errors, { separator: "; " });
      throw new Error(`Response validation failed: ${details}`);
    }

    return parsed;
  }

  private handleError(error: unknown): Error {
    if (!axios.isAxiosError(error)) {
      return error instanceof Error ? error : new Error("Unknown error");
    }

    const status = error.response?.status;

    if (status === 401) {
      return new Error("Unauthorized: check OpenRouter API key");
    }

    if (status === 429) {
      const retryAfter = error.response?.headers?.["retry-after"];
      return new Error(`Rate limited by OpenRouter${retryAfter ? `, retry after ${retryAfter}s` : ""}`);
    }

    if (status && status >= 500) {
      return new Error(`OpenRouter server error (${status})`);
    }

    if (error.code === "ECONNABORTED") {
      return new Error("Request to OpenRouter timed out");
    }

    return new Error(error.message ?? "OpenRouter request failed");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const apiKey = import.meta.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error("Missing OPENROUTER_API_KEY environment variable");
}

const baseUrl = import.meta.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

export const openRouter = new OpenRouterService({
  apiKey,
  baseUrl,
  timeoutMs: DEFAULT_TIMEOUT_MS,
  maxRetries: DEFAULT_MAX_RETRIES,
  rateLimitQPS: DEFAULT_RATE_LIMIT_QPS,
  defaultModel: DEFAULT_MODEL,
});
