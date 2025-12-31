import { useMemo } from "react";

export const MIN_TEXT_LENGTH = 1000;
export const MAX_TEXT_LENGTH = 10000;

interface CounterResult {
  length: number;
  isTooShort: boolean;
  isTooLong: boolean;
  isValid: boolean;
}

export function useCharacterCounter(value: string, min = MIN_TEXT_LENGTH, max = MAX_TEXT_LENGTH): CounterResult {
  return useMemo(() => {
    const length = value?.length ?? 0;
    const isTooShort = length < min;
    const isTooLong = length > max;
    return {
      length,
      isTooShort,
      isTooLong,
      isValid: !isTooShort && !isTooLong,
    };
  }, [max, min, value]);
}

