# OpenRouter Service – Implementation Plan

## 1. Opis usługi

Usługa **OpenRouterService** to warstwa komunikacyjna pomiędzy aplikacją AI-Flashcards a publicznym API OpenRouter. Udostępnia zunifikowane metody do wysyłania i odbierania czatów opartych na modelach LLM, zapewniając obsługę:

- Dodawania komunikatu systemowego i komunikatów użytkownika
- Wymuszania struktury odpowiedzi poprzez `response_format`
- Parametryzacji modelu (nazwa modelu i parametry inferencji)
- Globalnej obsługi błędów i ponownych prób
- Logowania i limiterów API

Usługa zostanie zaimplementowana w TypeScripcie i udostępniona jako **singleton** eksportowany z `src/lib/openrouter.ts`.

---

## 2. Opis konstruktora

```ts
class OpenRouterService {
  constructor(private readonly config: OpenRouterConfig) {
    this.axios = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: config.timeoutMs,
    });
  }
}
```

**Parametry konfiguracji (`OpenRouterConfig`)**

1. `apiKey: string` – klucz API z OpenRouter
2. `baseUrl: string` – zazwyczaj `https://openrouter.ai/api/v1`
3. `timeoutMs: number` – domyślnie `30_000`
4. `maxRetries: number` – próby ponowienia (domyślnie `2`)
5. `rateLimitQPS: number` – ograniczenie zapytań/s (używane przez lejek)
6. `defaultModel: string` – model fallback, np. `openai/gpt-4o`

---

## 3. Publiczne metody i pola

| Metoda                        | Zwracany typ               | Cel                                             |
| ----------------------------- | -------------------------- | ----------------------------------------------- |
| `sendChat(messages, opts?)`   | `Promise<OpenRouterReply>` | Główna metoda wysyłająca czat do OpenRouter.    |
| `buildMessage(role, content)` | `OpenRouterMessage`        | Pomocnicza metoda fabrykująca komunikat.        |
| `setDefaultModel(model)`      | `void`                     | Dynamiczna zmiana modelu domyślnego.            |
| `parseResponse(resp)`         | `ParsedReply`              | Zamienia surową odpowiedź w struktury domenowe. |

**Typy**

```ts
type Role = "system" | "user" | "assistant";
interface OpenRouterMessage {
  role: Role;
  content: string;
}

interface SendChatOptions {
  model?: string; // Nazwa modelu
  temperature?: number; // Parametr modelu (0–2)
  max_tokens?: number; // Limit tokenów
  response_format?: JsonSchemaFmt; // Wymuszone formatowanie
  abortSignal?: AbortSignal;
}
```

---

## 4. Prywatne metody i pola

| Nazwa                           | Cel                                                                 |
| ------------------------------- | ------------------------------------------------------------------- |
| `axios`                         | Klient HTTP (Axios) z interceptorami dla logowania i ponownych prób |
| `withRetry(fn)`                 | Dekorator ponownych prób z wykładniczym czekaniem                   |
| `ensureRateLimit()`             | Prosty lejek tokenowy (np. `p-limit`)                               |
| `validateSchema(reply, schema)` | Walidacja odpowiedzi przez `zod` lub `ajv`                          |
| `handleError(err)`              | Mapowanie błędów HTTP → błędy domenowe                              |

---

## 5. Obsługa błędów

Potencjalne scenariusze (B1–B5):

1. **B1** – Brak lub niepoprawny klucz API → _401 Unauthorized_
2. **B2** – Przekroczony limit zapytań (`429`) → retry z opóźnieniem `Retry-After`
3. **B3** – Błąd sieci / timeout → max `maxRetries`, eksponujemy błąd `NetworkError`
4. **B4** – Odpowiedź niezgodna z `response_format` → `SchemaValidationError`
5. **B5** – Błąd serwera `5xx` → ponowienie (jeśli idempotentne) lub `ServerError`

Strategie:

- Mapowanie kodów HTTP → własne klasy błędów
- Konfigurowalne ponowne próby z back-offem (→ `withRetry`)
- Globalny `axios.interceptors.response` do centralnego logowania

---

## 6. Kwestie bezpieczeństwa

1. **Bezpieczne przechowywanie klucza API** – zmienne środowiskowe ładowane przez `import.meta.env` (Astro).
2. **Rate limiting** – aby zapobiec kosztom i banom.
3. **Sanityzacja promptów** – usuwanie wrażliwych danych (PII) z komunikatów przed wysyłką.
4. **Input validation** – walidacja typów TS (`zod`) przed przekazaniem do API.
5. **Output validation** – walidacja JSON schema przy użyciu `ajv`.
6. **Graceful degradation** – fallback do modelu domyślnego w razie błędów.

---

## 7. Plan wdrożenia krok po kroku

### Krok 1 – Konfiguracja projektu

1. Utwórz plik `src/lib/openrouter.ts`.
2. Dodaj zależności `axios`, `p-limit`, `ajv`, `zod` (`bun add axios p-limit ajv zod`).
3. Dodaj zmienne `.env`:
   ```bash
   OPENROUTER_API_KEY="sk-..."
   OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
   ```

### Krok 2 – Definicje typów

- W `src/types.ts` dodaj typy `OpenRouterMessage`, `SendChatOptions`, `OpenRouterReply`.
- Wyeksportuj interfejs `OpenRouterConfig`.

### Krok 3 – Implementacja klasy `OpenRouterService`

1. Zaimplementuj konstruktor z konfiguracją `axios` (sekcja 2).
2. Dodaj `sendChat()`:
   ```ts
   async sendChat(messages: OpenRouterMessage[], opts: SendChatOptions = {}) {
     await this.ensureRateLimit();
     const payload = {
       model: opts.model ?? this.config.defaultModel,
       messages,
       response_format: opts.response_format,
       temperature: opts.temperature,
       max_tokens: opts.max_tokens,
     };
     return this.withRetry(async () => {
       const { data } = await this.axios.post("/chat/completions", payload, {
         signal: opts.abortSignal,
       });
       return this.parseResponse(data);
     });
   }
   ```
3. Uzupełnij `parseResponse()` o walidację JSON-schema.
4. Dodaj pomocnicze `buildMessage()` do tworzenia komunikatów.

### Krok 4 – Interceptory i retry

- Skonfiguruj w konstruktorze interceptory `axios`:
  - `response` – mapowanie błędów + logi
  - `request` – nagłówki `User-Agent`, `X-Request-Id`
- Dodaj `withRetry()` wykorzystując exponential back-off (`Math.pow(2, attempt) * 500`).

### Krok 5 – Walidacja response_format

- Przygotuj helper `buildJsonSchemaFormat(name, schema)` zwracający:
  ```ts
  { type: 'json_schema', json_schema: { name, strict: true, schema } }
  ```
- W `parseResponse()` sparsuj `choices[0].message.content` → `JSON.parse` → walidacja `ajv`.

### Krok 6 – Testy jednostkowe (Vitest)

1. Mockuj `axios` i sprawdzaj scenariusze B1–B5.
2. Testuj walidację schema i błędy.

### Krok 7 – Integracja w komponentach React/Astro

1. Importuj singleton:
   ```ts
   import { openRouter } from "~/lib/openrouter";
   ```
2. Buduj komunikaty:
   ```ts
   const sys = openRouter.buildMessage("system", "You are a helpful AI…");
   const user = openRouter.buildMessage("user", prompt);
   const reply = await openRouter.sendChat([sys, user], {
     response_format: buildJsonSchemaFormat("flashcard_answer", zFlashcard.schema),
     temperature: 0.3,
   });
   ```

---

### Załącznik A – Przykłady elementów wymaganych przez API

1. **Komunikat systemowy**
   ```ts
   openRouter.buildMessage("system", "You are a flashcard generator assistant.");
   ```
2. **Komunikat użytkownika**
   ```ts
   openRouter.buildMessage("user", "Generate a flashcard about React hooks.");
   ```
3. **response_format**
   ```ts
   const schema = {
     type: "object",
     properties: {
       question: { type: "string" },
       answer: { type: "string" },
     },
     required: ["question", "answer"],
   };
   const response_format = {
     type: "json_schema",
     json_schema: { name: "flashcard", strict: true, schema },
   };
   ```
4. **Nazwa modelu**
   ```ts
   const model = "openai/gpt-4o";
   ```
5. **Parametry modelu**
   ```ts
   { temperature: 0.2, max_tokens: 256 }
   ```

---

> Plan spełnia wymagania Tech Stacku (Astro 5 + TypeScript 5 + React 19) oraz zasady implementacyjne projektu.
