import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { SourceEnum } from "../../types";
import MyFlashcardsView from "./MyFlashcardsView";

const mockUseFlashcardsList = vi.fn();

vi.mock("../hooks/useFlashcardsList", () => ({
  useFlashcardsList: (...args: unknown[]) => mockUseFlashcardsList(...args),
}));

const baseViewModel = {
  id: "flash-1",
  front: "Front",
  back: "Back",
  source: "manual" as SourceEnum,
  generationId: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  createdLabel: "1 sty 2024",
};

const createHookState = (overrides: Record<string, unknown> = {}) => {
  return {
    items: [],
    isLoading: false,
    hasMore: false,
    error: null,
    source: undefined,
    sort: "created_at desc",
    total: 0,
    loadMore: vi.fn(),
    loadInitial: vi.fn(),
    applySource: vi.fn(),
    applySort: vi.fn(),
    createOne: vi.fn(),
    updateRemote: vi.fn(),
    deleteRemote: vi.fn(),
    ...overrides,
  };
};

class IntersectionObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
  trigger(entries: IntersectionObserverEntry[]) {
    return entries;
  }
}

const originalIntersectionObserver = globalThis.IntersectionObserver;
const originalLocation = globalThis.location;
const originalRandomUUID = globalThis.crypto?.randomUUID;
const stubUuid = "11111111-1111-1111-1111-111111111111" as const;

beforeAll(() => {
  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
  Object.defineProperty(globalThis, "location", {
    writable: true,
    value: { ...originalLocation, href: "http://localhost/" },
  });
  if (!globalThis.crypto) {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => stubUuid) });
  } else if (!globalThis.crypto.randomUUID) {
    globalThis.crypto.randomUUID = vi.fn(() => stubUuid) as unknown as typeof originalRandomUUID;
  } else {
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => stubUuid);
  }
});

afterAll(() => {
  globalThis.IntersectionObserver = originalIntersectionObserver as typeof IntersectionObserver;
  Object.defineProperty(globalThis, "location", { value: originalLocation });
  if (originalRandomUUID) {
    globalThis.crypto.randomUUID = originalRandomUUID;
  }
});

beforeEach(() => {
  mockUseFlashcardsList.mockReturnValue(createHookState());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MyFlashcardsView", () => {
  it("pokazuje pusty stan i waliduje formularz tworzenia", async () => {
    const user = userEvent.setup();
    render(<MyFlashcardsView />);

    expect(screen.getByText("Nie masz jeszcze żadnych fiszek.")).toBeInTheDocument();

    const createButtons = screen.getAllByRole("button", { name: "Utwórz" });
    await user.click(createButtons[0]);
    const front = screen.getByLabelText("Front");
    const back = screen.getByLabelText("Back");
    await user.type(front, " ");
    await user.type(back, " ");
    await user.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(await screen.findByText("Front musi mieć 1-200 znaków")).toBeInTheDocument();
    expect(await screen.findByText("Back musi mieć 1-500 znaków")).toBeInTheDocument();
  });

  it("tworzy fiszkę po poprawnym wypełnieniu formularza", async () => {
    const createOne = vi.fn().mockResolvedValue(baseViewModel);
    mockUseFlashcardsList.mockReturnValue(createHookState({ createOne }));
    const user = userEvent.setup();
    render(<MyFlashcardsView />);

    const createButtons = screen.getAllByRole("button", { name: "Utwórz" });
    await user.click(createButtons[0]);
    await user.type(screen.getByLabelText("Front"), " Nowy front ");
    await user.type(screen.getByLabelText("Back"), " Nowy back ");
    await user.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(createOne).toHaveBeenCalledWith({
      payload: { front: "Nowy front", back: "Nowy back", source: "manual", generationId: null },
    });
    expect(screen.queryByRole("heading", { name: "Utwórz fiszkę" })).not.toBeInTheDocument();
    expect(screen.getByText("Fiszka utworzona")).toBeInTheDocument();
  });

  it("filtruje i sortuje listę poprzez akcje użytkownika", async () => {
    const applySource = vi.fn();
    const applySort = vi.fn();
    mockUseFlashcardsList.mockReturnValue(createHookState({ applySource, applySort }));

    const user = userEvent.setup();
    render(<MyFlashcardsView />);

    await user.click(screen.getByRole("button", { name: "AI wygenerowane" }));
    expect(applySource).toHaveBeenCalledWith("ai_generated");

    await user.selectOptions(screen.getByRole("combobox"), "created_at asc");
    expect(applySort).toHaveBeenCalledWith("created_at asc");
  });

  it("obsługuje edycję fiszki i wysyła poprawione dane", async () => {
    const updateRemote = vi.fn().mockResolvedValue({ ...baseViewModel, front: "Zmieniony", back: "Zmieniony back" });
    mockUseFlashcardsList.mockReturnValue(
      createHookState({
        items: [baseViewModel],
        total: 1,
        updateRemote,
      })
    );

    const user = userEvent.setup();
    render(<MyFlashcardsView />);

    await user.click(screen.getByRole("button", { name: "Edytuj fiszkę" }));

    const dialog = screen.getByRole("dialog", { name: "Edytuj fiszkę" });
    const front = within(dialog).getByLabelText("Front");
    const back = within(dialog).getByLabelText("Back");
    await user.clear(front);
    await user.type(front, "Zmieniony front");
    await user.clear(back);
    await user.type(back, "Zmieniony back");
    await user.click(within(dialog).getByRole("button", { name: "Zapisz zmiany" }));

    expect(updateRemote).toHaveBeenCalledWith({
      id: baseViewModel.id,
      payload: { front: "Zmieniony front", back: "Zmieniony back" },
    });
    expect(screen.queryByRole("heading", { name: "Edytuj fiszkę" })).not.toBeInTheDocument();
  });

  it("usuwa fiszkę po potwierdzeniu", async () => {
    const deleteRemote = vi.fn().mockResolvedValue(undefined);
    mockUseFlashcardsList.mockReturnValue(
      createHookState({
        items: [baseViewModel],
        total: 1,
        deleteRemote,
      })
    );

    const user = userEvent.setup();
    render(<MyFlashcardsView />);

    await user.click(screen.getByRole("button", { name: "Usuń fiszkę" }));
    const dialog = screen.getByRole("dialog", { name: "Usuń fiszkę" });
    await user.click(within(dialog).getByRole("button", { name: "Usuń" }));

    expect(deleteRemote).toHaveBeenCalledWith({ id: baseViewModel.id });
    expect(screen.queryByRole("heading", { name: "Usuń fiszkę" })).not.toBeInTheDocument();
  });

  it("pozwala na ponowienie ładowania przy błędzie listy", async () => {
    const loadInitial = vi.fn();
    mockUseFlashcardsList.mockReturnValue(
      createHookState({
        error: "Wystąpił błąd",
        loadInitial,
      })
    );

    const user = userEvent.setup();
    render(<MyFlashcardsView />);

    expect(screen.getByText("Wystąpił błąd")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(loadInitial).toHaveBeenCalledTimes(1);
  });
});
