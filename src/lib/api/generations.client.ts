import type {
  CreateGenerationCommand,
  GenerationCreateResponse,
  GenerationCreateWithFlashcardsResponse,
} from "../../types";
import type { FlashcardProposal } from "@/components/generate/types";

async function parseJsonOrText<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return parseJsonOrText<T>(response);
  }

  const errorPayload = await parseJsonOrText<unknown>(response);
  const message =
    typeof errorPayload === "string"
      ? errorPayload
      : ((errorPayload as { message?: string; error?: string })?.message ??
        (errorPayload as { error?: string }).error ??
        response.statusText);
  throw new Error(message || "Request failed");
}

export interface CreateGenerationArgs {
  payload: CreateGenerationCommand;
  signal?: AbortSignal;
}

function toProposalId(index: number) {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proposal-${index}-${Date.now()}`;
}

export async function createGenerationClient({
  payload,
  signal,
}: CreateGenerationArgs): Promise<{ generation: GenerationCreateResponse; proposals: FlashcardProposal[] }> {
  const response = await fetch("/api/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  const { generation, flashcards } = await handleResponse<GenerationCreateWithFlashcardsResponse>(response);

  const proposals: FlashcardProposal[] = flashcards.map((item, index) => ({
    id: toProposalId(index),
    front: item.front,
    back: item.back,
    state: "pending",
  }));

  return { generation, proposals };
}
