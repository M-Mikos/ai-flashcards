# AI-Flashcards

A mobile-first web application for creating and learning educational flashcards with AI-powered generation using spaced repetition algorithms. This project was done as a credit project for the 10xDEVS course focusing on integrating AI tools into a software developer's workflow, by Przemysław Smyrdek and Marcin Czarkowski

## Overview

AI-Flashcards solves the time-consuming problem of manually creating high-quality flashcards. Users paste text (1,000-10,000 characters), and AI generates flashcard proposals that can be accepted, edited, or rejected. The app includes manual flashcard creation, user authentication, and learning sessions powered by spaced repetition.

## Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- npm/pnpm
- Supabase account (for database and auth)
- OpenRouter API key (for AI generation)

### Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd ai-flashcards
npm install
```

2. **Configure environment variables:**
Create `.env` file with:
```
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Run database migrations:**
Apply migrations from `supabase/migrations/` to your Supabase project.

4. **Start development server:**
```bash
npm run dev
```
App runs at `http://localhost:3000`

### Available Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Lint codebase
- `npm run format` - Format with Prettier

## Features

### Core Functionality
- **AI-Powered Generation**: Paste text and receive 5-20 flashcard proposals from GPT-4o-mini
- **Review & Edit**: Accept, edit, or reject AI-generated proposals before saving
- **Manual Creation**: Create flashcards manually with front/back fields
- **My Flashcards**: View, edit, and delete saved flashcards with metadata (source, date)
- **Learning Sessions**: Learning with grade feedback (0-5 scale)
- **Authentication**: Email/password registration, login, password reset, account deletion

### User Experience
- Dark/light/system theme support
- Form validation with helpful error messages
- Accessible UI components (Shadcn/ui + Radix)

## Tech Stack

**Frontend:**
- Astro 5 - Fast static-first framework with minimal JavaScript
- React 19 - Interactive UI components
- TypeScript 5 - Type safety and IDE support
- Tailwind CSS 4 - Utility-first styling
- Shadcn/ui - Accessible component library

**Backend:**
- Supabase - PostgreSQL database with BaaS SDK
- Supabase Auth - Built-in user authentication
- Row Level Security (RLS) - Database-level access control

**AI:**
- OpenRouter.ai - Access to GPT-4o-mini and multiple LLM providers
- JSON Schema validation with AJV

**DevOps & Testing:**
- Vitest + Testing Library - Unit/integration tests
- Playwright - E2E tests
- GitHub Actions - CI/CD pipelines
- DigitalOcean - Docker-based hosting

## Architecture

### Application Structure
The app follows a layered architecture:

**Presentation Layer (Pages & Components)**
- Astro pages with SSR for authenticated routes
- React components for interactivity
- View models for UI state management

**API Layer (Endpoints)**
- RESTful API routes in `src/pages/api/`
- Request validation with Zod schemas
- DTO pattern for data transfer

**Service Layer**
- Business logic isolated in `src/lib/services/`
- OpenRouter integration for AI generation
- Flashcard and learning session management

**Data Layer**
- Supabase client with TypeScript types
- RLS policies enforce user data isolation
- Automatic `updated_at` timestamps via triggers

### Security Model
- All routes protected by Astro middleware
- JWT-based session management via Supabase
- Database-level RLS policies prevent unauthorized access
- Explicit policies for `authenticated` and `anon` roles

## Folder Structure

```
src/
├── components/         # React & Astro components
│   ├── account/        # Account management
│   ├── auth/           # Login, register, reset forms
│   ├── flashcards/     # Flashcard listing
│   ├── generate/       # AI generation workflow
│   ├── learning/       # Learning session UI
│   ├── navigation/     # Site navigation
│   └── ui/             # Shadcn/ui components
├── db/                 # Supabase client & generated types
├── layouts/            # Astro layout templates
├── lib/
│   ├── api/            # Frontend API clients
│   ├── services/       # Backend business logic
│   ├── hooks/          # Custom React hooks
│   ├── validation/     # Zod schemas
│   └── view-models/    # UI state transformers
├── middleware/         # Auth middleware
├── pages/
│   ├── api/            # API endpoints
│   └── *.astro         # Public pages
├── styles/             # Global CSS
└── types.ts            # Shared DTOs & interfaces

supabase/
└── migrations/         # Database schema migrations

tests/
├── e2e/                # Playwright E2E tests
└── unit/               # Vitest unit tests
```

## API & Services Design

### REST API Endpoints

**Generations:**
- `POST /api/generations` - Create generation from text
- `GET /api/generations` - List user generations (paginated)

**Flashcards:**
- `POST /api/flashcards` - Create single flashcard
- `POST /api/flashcards/bulk` - Bulk create flashcards
- `GET /api/flashcards` - List flashcards with filters (source, generationId)
- `PATCH /api/flashcards/:id` - Update flashcard
- `DELETE /api/flashcards/:id` - Delete flashcard

**Learning:**
- `POST /api/learning/session` - Create learning session (returns cards)

**Auth:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/reset` - Request password reset
- `POST /api/auth/reset/confirm` - Confirm password reset

### Data Models

**Generations** - AI generation metadata:
- Text hash to prevent duplicates
- Input length, generation time, counts
- Model name and timestamps

**Flashcards** - Core entity:
- `front` (max 200 chars), `back` (max 500 chars)
- `source` enum: `ai_generated`, `ai_edited`, `manual`
- Optional `generation_id` foreign key

## AI Integration

### OpenRouter Service
Custom service class handling:
- Rate limiting (1 QPS default)
- Exponential backoff retry logic
- JSON Schema validation for structured outputs
- Timeout handling (30s default)

### Generation Flow
1. User submits text (validated 1,000-10,000 chars)
2. System sends text to GPT-4o-mini with JSON schema
3. AI returns array of flashcard objects
4. Frontend displays proposals with accept/edit/reject actions
5. Only accepted flashcards saved to database
6. Generation metadata logged for analytics

## Authentication & Security

### Supabase Auth
- Email/password authentication
- Magic link support for password reset
- Server-side session validation in middleware
- Automatic token refresh

### Row Level Security (RLS)
PostgreSQL RLS policies enforce:
- Users can only access their own flashcards/generations
- Anonymous users denied all access
- Cascading deletes on user account removal
- `service_role` bypasses RLS for admin operations

## Testing Strategy

### Unit & Integration Tests (Vitest)
- Component testing with React Testing Library
- Service layer logic tests
- View model transformations
- Coverage reporting with V8

### End-to-End Tests (Playwright)
- Critical user flows: auth, generation, learning
- Page Object Model pattern
- Chromium-based testing
- Screenshot on failure, trace on retry

### Code Quality
- ESLint with TypeScript, React, Astro configs
- Prettier for formatting
- Husky + lint-staged for pre-commit hooks
- Type checking with TypeScript strict mode

## Future Improvements

### Current Limitations (MVP Scope)
- No custom spaced repetition algorithm
- No file imports (PDF, DOCX)
- No shared flashcard sets between users
- No soft-limits on AI costs (controlled via OpenRouter dashboard)
- Single fixed model (GPT-4o-mini)

### Future Enhancements
- Multi-model support with user selection
- Import from documents and web pages
- Collaborative flashcard decks
- Real-time study statistics dashboard
- Gamification elements (streaks, achievements)
- Advanced spaced repetition customization

## License

MIT

---

**Project Status:** MVP Development  
**Maintained by:** Marcin Mikos
**Contact:** [mikos.marcin.m@gmail.com]

