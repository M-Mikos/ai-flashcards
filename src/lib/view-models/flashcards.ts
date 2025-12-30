import type { FlashcardDTO, FlashcardListResponse, SourceEnum } from "../../types";

export type SortOption = "created_at desc" | "created_at asc";

export interface FlashcardViewModel {
  id: string;
  front: string;
  back: string;
  source: SourceEnum;
  generationId: string | null;
  createdAt: string;
  updatedAt: string;
  createdLabel: string;
}

export interface FlashcardListQueryVM {
  page: number;
  pageSize: number;
  source?: SourceEnum;
  sort: SortOption;
}

export interface FlashcardListPage {
  items: FlashcardViewModel[];
  page: number;
  pageSize: number;
  total: number;
}

export const DEFAULT_FLASHCARD_PAGE_SIZE = 24;

const createdAtFormatter = new Intl.DateTimeFormat("pl-PL", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export function toFlashcardViewModel(dto: FlashcardDTO): FlashcardViewModel {
  const createdAt = dto.createdAt ?? new Date().toISOString();
  const updatedAt = dto.updatedAt ?? createdAt;
  const createdAtDate = dto.createdAt ? new Date(dto.createdAt) : new Date();

  return {
    id: dto.id,
    front: dto.front,
    back: dto.back,
    source: dto.source,
    generationId: dto.generationId,
    createdAt,
    updatedAt,
    createdLabel: createdAtFormatter.format(createdAtDate),
  };
}

export function toFlashcardListPage(response: FlashcardListResponse): FlashcardListPage {
  return {
    items: response.items.map(toFlashcardViewModel),
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
  };
}
