import { describe, expect, it, vi } from "vitest";

import type { FlashcardDTO, FlashcardListResponse, SourceEnum } from "../../types";
import { toFlashcardListPage, toFlashcardViewModel } from "./flashcards";

const makeDto = (overrides: Partial<FlashcardDTO> = {}): FlashcardDTO => ({
  id: "flash-1",
  front: "Front",
  back: "Back",
  source: "manual" as SourceEnum,
  generationId: null,
  createdAt: "2024-01-01T12:00:00.000Z",
  updatedAt: "2024-01-02T08:30:00.000Z",
  ...overrides,
});

describe("flashcard view-models", () => {
  it("mapuje DTO na ViewModel zachowując wartości dat i etykietę", () => {
    const dto = makeDto();

    const vm = toFlashcardViewModel(dto);

    expect(vm).toEqual({
      id: "flash-1",
      front: "Front",
      back: "Back",
      source: "manual",
      generationId: null,
      createdAt: "2024-01-01T12:00:00.000Z",
      updatedAt: "2024-01-02T08:30:00.000Z",
      createdLabel: "01 sty 2024",
    });
  });

  it("ustawia domyślne createdAt/updatedAt oraz etykietę gdy DTO ich nie podaje", () => {
    vi.useFakeTimers();
    const fixedNow = new Date("2025-02-10T15:00:00.000Z");
    vi.setSystemTime(fixedNow);

    const dto = makeDto({ createdAt: undefined, updatedAt: undefined });
    const vm = toFlashcardViewModel(dto);

    expect(vm.createdAt).toBe("2025-02-10T15:00:00.000Z");
    expect(vm.updatedAt).toBe("2025-02-10T15:00:00.000Z");
    expect(vm.createdLabel).toBe("10 lut 2025");

    vi.useRealTimers();
  });

  it("przepisuje listę odpowiedzi API na stronę z metadanymi i VM", () => {
    const response: FlashcardListResponse = {
      items: [makeDto({ id: "f-1" }), makeDto({ id: "f-2", source: "ai_generated" as SourceEnum })],
      page: 2,
      pageSize: 10,
      total: 42,
    };

    const page = toFlashcardListPage(response);

    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(10);
    expect(page.total).toBe(42);
    expect(page.items.map((item) => item.id)).toEqual(["f-1", "f-2"]);
    expect(page.items[1].source).toBe("ai_generated");
    expect(page.items[0].createdLabel).toBe("01 sty 2024");
  });
});
