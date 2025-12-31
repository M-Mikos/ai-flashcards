import type {
  BulkCreateFlashcardsCommand,
  BulkCreateFlashcardsResponse,
  CreateFlashcardCommand,
  FlashcardCreateResponse,
  FlashcardListQuery,
  FlashcardUpdateResponse,
  UpdateFlashcardCommand,
} from "../../types";
import {
  DEFAULT_FLASHCARD_PAGE_SIZE,
  type FlashcardListPage,
  type FlashcardListQueryVM,
  toFlashcardListPage,
  toFlashcardViewModel,
} from "../view-models/flashcards";

async function parseJsonOrText<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      // No Content
      return {} as T;
    }
    return parseJsonOrText<T>(response);
  }

  const errorPayload = await parseJsonOrText<unknown>(response);
  const message =
    typeof errorPayload === "string"
      ? errorPayload
      : ((errorPayload as { message?: string })?.message ?? response.statusText);
  throw new Error(message || "Request failed");
}

function buildQueryParams(query: FlashcardListQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.source) params.set("source", query.source);
  if (query.generationId) params.set("generationId", query.generationId);
  if (query.sort) params.set("sort", query.sort);
  return params.toString();
}

export interface FetchFlashcardsListArgs extends FlashcardListQueryVM {
  signal?: AbortSignal;
}

export async function fetchFlashcardsList({
  page,
  pageSize = DEFAULT_FLASHCARD_PAGE_SIZE,
  source,
  sort,
  signal,
}: FetchFlashcardsListArgs): Promise<FlashcardListPage> {
  const search = buildQueryParams({
    page,
    pageSize,
    source,
    sort,
  });

  const response = await fetch(`/api/flashcards?${search}`, { method: "GET", signal });
  const data = await handleResponse<Parameters<typeof toFlashcardListPage>[0]>(response);
  return toFlashcardListPage(data);
}

export interface CreateFlashcardArgs {
  payload: CreateFlashcardCommand;
  signal?: AbortSignal;
}

export async function createFlashcardClient({ payload, signal }: CreateFlashcardArgs) {
  const response = await fetch("/api/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const data = await handleResponse<FlashcardCreateResponse>(response);
  return toFlashcardViewModel({
    ...data,
    generationId: data.generationId ?? null,
    updatedAt: data.createdAt,
  });
}

export interface UpdateFlashcardArgs {
  id: string;
  payload: UpdateFlashcardCommand;
  signal?: AbortSignal;
}

export async function updateFlashcardClient({ id, payload, signal }: UpdateFlashcardArgs) {
  const response = await fetch(`/api/flashcards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const data = await handleResponse<FlashcardUpdateResponse>(response);
  return toFlashcardViewModel(data);
}

export interface DeleteFlashcardArgs {
  id: string;
  signal?: AbortSignal;
}

export async function deleteFlashcardClient({ id, signal }: DeleteFlashcardArgs) {
  const response = await fetch(`/api/flashcards/${id}`, { method: "DELETE", signal });
  await handleResponse<unknown>(response);
  return id;
}

export interface BulkCreateFlashcardsArgs {
  payload: BulkCreateFlashcardsCommand;
  signal?: AbortSignal;
}

export async function bulkCreateFlashcardsClient({ payload, signal }: BulkCreateFlashcardsArgs) {
  const response = await fetch("/api/flashcards/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse<BulkCreateFlashcardsResponse>(response);
}
