// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 slice 4b — extraction provider abstraction (NFR-009, KI-35)
// ══════════════════════════════════════════════════════════════
//
// One interface, provider-agnostic. Anthropic is live; Azure OpenAI (Australia
// East, under HNZ tenancy) is a compiling stub that throws `NotConfiguredError`
// — the residency path is designed in, not built (NFR-009). A provider switch is
// a config change plus a benchmark run (slice 9), not a code change.
//
// Output shape (prompt v3.0.1): the caller passes `tool` (the `outputTool` from
// the prompt); the provider forces the model to call it and returns the tool
// call's `input` as `toolInput`. The model emits no free text. Both Anthropic
// tool use and Azure OpenAI function calling map onto this.
//
// Model parameters are owned HERE:
//   - max_tokens: passed in by the caller (PROMPT_DECISION_RECORD proposes 8000).
//     A truncated response (stopReason "max_tokens" / "length") is a GATE FAILURE,
//     not a sparse answer — the caller must treat it as such.
//   - temperature: NOT SET. The provider default therefore applies and may differ
//     between providers; extraction variance is measured per provider in slice 9
//     (KI-14, KI-28 — newer Sonnet versions 400 on `temperature: 0.1`).
//   - model: governance-controlled (CLAUDE.md). `EXTRACTION_MODEL` env var,
//     default `claude-sonnet-4-6` (the production Triage Advisor setting). A
//     change is a benchmark-gated release with an SD entry (KI-27, SR-09).

export type ContentBlock =
  | { type: "text"; text: string; cache_control?: { type: "ephemeral" } };

export interface ExtractionMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// The output tool (prompt-v3.0.1 `outputTool`). When present, the provider must
// force the model to call it and return its `input` as `toolInput` — the model
// no longer emits free text (SR-09).
export interface ExtractionTool {
  name: string;
  description: string;
  input_schema: any;
}

export interface ExtractionRequest {
  system: string;
  messages: ExtractionMessage[];
  maxTokens: number;
  tool?: ExtractionTool;
}

export interface ExtractionResult {
  text: string; // stringified toolInput when a tool was used; raw assistant text otherwise
  toolInput: any | null; // the tool call's `input` object, or null if no tool was used
  modelId: string;
  provider: string;
  stopReason: string | null; // "end_turn" / "tool_use" ok; "max_tokens"/"length" -> gate failure
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  };
}

export interface ExtractionProvider {
  readonly name: string;
  extract(req: ExtractionRequest): Promise<ExtractionResult>;
}

export class NotConfiguredError extends Error {
  readonly code = "provider-not-configured";
  constructor(message: string) {
    super(message);
    this.name = "NotConfiguredError";
  }
}

export class ProviderCallError extends Error {
  readonly code = "provider-call-failed";
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ProviderCallError";
  }
}

export const DEFAULT_EXTRACTION_MODEL = "claude-sonnet-4-6";

// ── Anthropic ──────────────────────────────────────────────────
export class AnthropicProvider implements ExtractionProvider {
  readonly name = "anthropic";
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async extract(req: ExtractionRequest): Promise<ExtractionResult> {
    const body: any = {
      model: this.model,
      max_tokens: req.maxTokens,
      // temperature deliberately omitted — see the header comment.
      system: req.system,
      messages: req.messages,
    };
    if (req.tool) {
      body.tools = [{ name: req.tool.name, description: req.tool.description, input_schema: req.tool.input_schema }];
      body.tool_choice = { type: "tool", name: req.tool.name };
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify(body),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      throw new ProviderCallError(`Anthropic call failed: ${msg}`, res.status);
    }

    const blocks: any[] = Array.isArray(json.content) ? json.content : [];
    const toolBlock = req.tool ? blocks.find((b) => b?.type === "tool_use" && b?.name === req.tool!.name) : undefined;
    const toolInput = toolBlock ? toolBlock.input ?? null : null;
    const text = toolBlock
      ? JSON.stringify(toolInput)
      : blocks.filter((b) => b?.type === "text").map((b) => b.text).join("");
    return {
      text,
      toolInput,
      modelId: json.model ?? this.model,
      provider: this.name,
      stopReason: json.stop_reason ?? null,
      usage: {
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: json.usage?.output_tokens ?? 0,
        cacheReadTokens: json.usage?.cache_read_input_tokens ?? 0,
        cacheWriteTokens: json.usage?.cache_creation_input_tokens ?? 0,
      },
    };
  }
}

// ── Azure OpenAI (Australia East) — stub (NFR-009) ─────────────
export class AzureOpenAIProvider implements ExtractionProvider {
  readonly name = "azure-openai";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async extract(_req: ExtractionRequest): Promise<ExtractionResult> {
    throw new NotConfiguredError(
      "Azure OpenAI provider is a stub — the residency path (NFR-009, Australia East under HNZ tenancy) is designed in, not built. Set EXTRACTION_PROVIDER=anthropic.",
    );
  }
}

export interface ProviderEnv {
  ANTHROPIC_API_KEY?: string;
  EXTRACTION_PROVIDER?: string; // "anthropic" (default) | "azure-openai"
  EXTRACTION_MODEL?: string;
}

export function makeProvider(env: ProviderEnv): ExtractionProvider {
  const which = (env.EXTRACTION_PROVIDER || "anthropic").toLowerCase();
  if (which === "azure-openai" || which === "azure") return new AzureOpenAIProvider();
  if (which === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) {
      throw new NotConfiguredError("ANTHROPIC_API_KEY is not set — the extraction provider cannot be constructed.");
    }
    return new AnthropicProvider(env.ANTHROPIC_API_KEY, env.EXTRACTION_MODEL || DEFAULT_EXTRACTION_MODEL);
  }
  throw new NotConfiguredError(`Unknown EXTRACTION_PROVIDER "${which}".`);
}

// A truncated model response must not be read as a sparse answer (rule 1's most
// dangerous failure mode). The caller passes this to the gate.
export function isTruncated(stopReason: string | null): boolean {
  return stopReason === "max_tokens" || stopReason === "length";
}
