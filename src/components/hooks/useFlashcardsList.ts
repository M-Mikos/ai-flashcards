import { useCallback, useEffect, useRef, useState } from "react";

import type { SourceEnum } from "../../types";
import {
  fetchFlashcardsList,
  type CreateFlashcardArgs,
  type DeleteFlashcardArgs,
  type FetchFlashcardsListArgs,
  type UpdateFlashcardArgs,
  createFlashcardClient,
  deleteFlashcardClient,
  updateFlashcardClient,
} from "../../lib/api/flashcards.client";
import {
  DEFAULT_FLASHCARD_PAGE_SIZE,
  type FlashcardListQueryVM,
  type FlashcardViewModel,
  type SortOption,
} from "../../lib/view-models/flashcards";

interface UseFlashcardsListOptions {
  pageSize?: number;
  initialSource?: SourceEnum;
  initialSort?: SortOption;
}

export function useFlashcardsList(options?: UseFlashcardsListOptions) {
  const sourceRef = useRef<SourceEnum | undefined>(options?.initialSource);
  const sortRef = useRef<SortOption>(options?.initialSort ?? "created_at desc");
  const [items, setItems] = useState<FlashcardViewModel[]>([]);
  const itemsRef = useRef<FlashcardViewModel[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(options?.pageSize ?? DEFAULT_FLASHCARD_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<SourceEnum | undefined>(sourceRef.current);
  const [sort, setSort] = useState<SortOption>(sortRef.current);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);
  const pageRef = useRef(1);

  const updateListState = useCallback(
    (nextItems: FlashcardViewModel[], nextPage: number, totalCount: number) => {
      setItems(nextItems);
      itemsRef.current = nextItems;
      setTotal(totalCount);
      setPage(nextPage);
      pageRef.current = nextPage;
      const moreByTotal = nextPage * pageSize < totalCount;
      const moreByPageSize = nextItems.length >= nextPage * pageSize && nextItems.length % pageSize === 0;
      setHasMore(moreByTotal || moreByPageSize);
    },
    [pageSize]
  );

  const fetchPage = useCallback(
    async ({
      targetPage,
      reset = false,
      nextSource,
      nextSort,
      signal,
    }: { targetPage: number; reset?: boolean; nextSource?: SourceEnum; nextSort?: SortOption } & Pick<
      FetchFlashcardsListArgs,
      "signal"
    >) => {
      if (isFetchingRef.current && !reset) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const resolvedSource = reset ? nextSource : (nextSource ?? sourceRef.current);
        const resolvedSort = reset ? (nextSort ?? sortRef.current) : (nextSort ?? sortRef.current);

        const pageData = await fetchFlashcardsList({
          page: targetPage,
          pageSize,
          source: resolvedSource,
          sort: resolvedSort,
          signal: controller.signal ?? signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        const currentItems = itemsRef.current;
        const merged = reset ? pageData.items : dedupeById([...currentItems, ...pageData.items]);
        updateListState(merged, pageData.page, pageData.total);
        sourceRef.current = resolvedSource;
        sortRef.current = resolvedSort;
        setSource(resolvedSource);
        setSort(resolvedSort);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
        isFetchingRef.current = false;
      }
    },
    [pageSize, updateListState]
  );

  const loadInitial = useCallback(async () => {
    return fetchPage({ targetPage: 1, reset: true });
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }
    const nextPage = pageRef.current + 1;
    return fetchPage({ targetPage: nextPage, reset: false });
  }, [fetchPage, hasMore, isLoading]);

  const applySource = useCallback(
    async (nextSource?: SourceEnum) => {
      return fetchPage({ targetPage: 1, reset: true, nextSource });
    },
    [fetchPage]
  );

  const applySort = useCallback(
    async (nextSort: SortOption) => {
      return fetchPage({ targetPage: 1, reset: true, nextSort });
    },
    [fetchPage]
  );

  const prepend = useCallback(
    (item: FlashcardViewModel) => {
      const nextItems = dedupeById([item, ...items]);
      updateListState(nextItems, 1, Math.max(total + 1, nextItems.length));
    },
    [items, total, updateListState]
  );

  const updateOne = useCallback(
    (item: FlashcardViewModel) => {
      const nextItems = items.map((current) => (current.id === item.id ? item : current));
      setItems(nextItems);
    },
    [items]
  );

  const removeOne = useCallback(
    (id: string) => {
      const nextItems = items.filter((item) => item.id !== id);
      updateListState(nextItems, pageRef.current, Math.max(0, total - 1));
    },
    [items, total, updateListState]
  );

  const createOne = useCallback(
    async (args: CreateFlashcardArgs) => {
      const controller = new AbortController();
      const viewModel = await createFlashcardClient({ ...args, signal: controller.signal });
      prepend(viewModel);
      return viewModel;
    },
    [prepend]
  );

  const updateRemote = useCallback(
    async (args: UpdateFlashcardArgs) => {
      const controller = new AbortController();
      const updated = await updateFlashcardClient({ ...args, signal: controller.signal });
      updateOne(updated);
      return updated;
    },
    [updateOne]
  );

  const deleteRemote = useCallback(
    async (args: DeleteFlashcardArgs) => {
      const controller = new AbortController();
      await deleteFlashcardClient({ ...args, signal: controller.signal });
      removeOne(args.id);
    },
    [removeOne]
  );

  useEffect(() => {
    loadInitial();
    return () => abortRef.current?.abort();
  }, [loadInitial]);

  const query: FlashcardListQueryVM = {
    page,
    pageSize,
    source,
    sort,
  };

  return {
    items,
    page,
    pageSize,
    total,
    source,
    sort,
    isLoading,
    hasMore,
    error,
    loadInitial,
    loadMore,
    applySource,
    applySort,
    prepend,
    updateOne,
    removeOne,
    createOne,
    updateRemote,
    deleteRemote,
    query,
  };
}

function dedupeById(list: FlashcardViewModel[]): FlashcardViewModel[] {
  const seen = new Set<string>();
  const result: FlashcardViewModel[] = [];
  for (const item of list) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    result.push(item);
  }
  return result;
}
