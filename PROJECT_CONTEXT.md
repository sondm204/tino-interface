# Tino Interface Project Context

## Product Vision

Tino Interface is a personal and wallet expense tracking application.

The product helps users record expenses across multiple spending contexts, then review monthly totals, member contributions, and settlement suggestions. A user can belong to several wallets at the same time, such as:

- Personal spending: 1 member.
- Roommate spending: 2 members.
- Company/team spending: 5 members.

Each wallet has its own members, expenses, monthly summary, and settlement logic.

## Phase 1 Scope

Phase 1 is a straightforward expense tracking product. The focus is to make expense entry, walleting, and monthly review reliable before adding advanced automation.

Phase 1 should support:

- Manual account registration and login.
- Creating and managing expense wallets.
- Inviting or adding members to a wallet.
- Adding expenses inside a wallet.
- Seeing each wallet's expense list.
- Seeing monthly totals per wallet.
- Seeing how much each member paid in a selected month.
- Seeing a simple split summary for who should reimburse whom.

Phase 1 does not need:

- Bank integrations.
- OCR receipt scanning.
- AI categorization.
- Multi-currency conversion.
- Supabase Auth.
- Complex approval workflows.
- Payroll/accounting-grade reports.

## Core User Flows

### Authentication

Users register and log in through a custom authentication system implemented by the backend.

Supabase is used as the database platform, but Supabase Auth should not be used. Do not build around Supabase session helpers, Supabase Auth middleware, or Supabase OAuth flows unless the product direction changes.

Expected auth direction:

- Express backend owns registration, login, password hashing, sessions/tokens, and authorization.
- Web and mobile clients authenticate against the Express API.
- The backend validates the current user before allowing access to wallets, expenses, summaries, or settlements.

### Wallet Management

A user can create multiple wallets. A wallet represents one shared spending context.

Examples:

- `Personal`
- `Room 302`
- `Company Lunch`

Wallets should support:

- Name.
- Description or note.
- Type, such as personal, household, company, or another product-defined walleting.
- Currency.
- Owner.
- Member list.
- Member roles and statuses.

### Expense Tracking

Every expense belongs to a wallet and is created by a wallet member.

An expense should include:

- Wallet.
- Category.
- Title and description.
- Total amount.
- Currency.
- Paid-by member.
- Created-by member.
- Expense date.
- Split method.
- Optional attachment files.
- Split rows for each participant.

Default split behavior for Phase 1 can be equal split among all active wallet members. The schema also supports amount, percentage, and shares-based splits through `ExpenseSplit`.

### Monthly Summary

At the end of each month, a wallet summary should answer:

- Total wallet spending.
- Total paid by each member.
- Expected share for each member.
- Difference between paid amount and expected share.
- Settlement suggestions.

Example settlement output:

- A paid too little and should pay B.
- C paid too much and should receive from A or B.

The settlement algorithm should start simple and deterministic:

- Calculate each member balance.
- Members with positive balances should receive money.
- Members with negative balances should pay money.
- Generate transfers until balances are close to zero.

## Suggested Domain Model

This is the canonical database model for future implementation. Feature work should use these table concepts and field names unless the user explicitly changes the schema.

### User

- `id`
- `email`
- `password`
- `display_name`
- `avatar_url`
- `status`
- `created_at`
- `updated_at`

### Wallet

- `id`
- `name`
- `description`
- `type`
- `currency`
- `owner_id`
- `created_at`
- `updated_at`

### Wallet Member

- `id`
- `wallet_id`
- `user_id`
- `role`
- `status`
- `joined_at`

### Category

- `id`
- `wallet_id`
- `name`
- `color`
- `icon`
- `created_at`

### Expense

- `id`
- `wallet_id`
- `category_id`
- `title`
- `description`
- `total_amount`
- `currency`
- `paid_by_user_id`
- `created_by_user_id`
- `expense_date`
- `split_method`
- `created_at`
- `updated_at`
- `deleted_at`

### Expense Split

- `id`
- `expense_id`
- `user_id`
- `amount`
- `percentage`
- `shares`
- `created_at`

### Attachment

- `id`
- `expense_id`
- `file_url`
- `file_path`
- `file_name`
- `file_type`
- `file_size`
- `uploaded_by_user_id`
- `created_at`

### Settlement

- `id`
- `wallet_id`
- `from_user_id`
- `to_user_id`
- `amount`
- `currency`
- `period_start`
- `period_end`
- `status`
- `created_by_user_id`
- `settled_at`
- `created_at`

Categories are wallet-scoped through `wallet_id`. Attachments belong to expenses. Settlements are persisted monthly or per selected period after the summary calculation is generated.

## Tech Stack

This repository is intended to be a Turbo monorepo.

Current root stack:

- Package manager: pnpm `11.9.0`.
- Monorepo task runner: Turborepo.
- Language: TypeScript.
- Formatting: Prettier.

Planned apps:

- Web: Next.js.
- Mobile: React Native with Expo.
- Backend: Express.js.

Database:

- Supabase Postgres.
- Supabase client libraries may be used for database access where appropriate.
- Supabase Auth should not be used.

## Current Repository State

Current workspace packages:

- `apps/web`: Next.js web application.

Current important files:

- `package.json`: root scripts and package manager configuration.
- `pnpm-workspace.yaml`: pnpm workspace config.
- `turbo.json`: Turbo task pipeline.
- `apps/web/package.json`: web app dependencies and scripts.
- `apps/web/app`: current Next.js App Router directory.

The web app is currently close to a fresh `create-next-app` template. Product screens, routing, auth UI, API integration, and domain-specific components still need to be built.

## Workspace Commands

Run commands from the monorepo root:

```bash
cd E:\Tino\tino-interface
```

Install dependencies:

```bash
pnpm.cmd install
```

Run all dev tasks:

```bash
pnpm.cmd dev
```

Run only the web app:

```bash
pnpm.cmd --filter web dev
```

Build all packages:

```bash
pnpm.cmd build
```

Build only web:

```bash
pnpm.cmd --filter web build
```

Note: On this Windows machine, use `pnpm.cmd` if PowerShell blocks `pnpm.ps1`.

## Web App Direction

The web app should be an authenticated product UI, not a marketing landing page.

Recommended first screens:

- Login.
- Register.
- Wallet list/dashboard.
- Wallet detail with current month expenses.
- Add expense form.
- Monthly summary view.

Design direction:

- Internal finance/productivity SaaS.
- Clear, dense, calm, and easy to scan.
- Prioritize tables, lists, totals, filters, and forms over decorative hero sections.
- Mobile-responsive, but the mobile app will eventually be implemented separately with Expo.

## Backend Direction

The Express backend should own:

- Manual auth.
- Password hashing.
- Token/session creation.
- Request authorization.
- Wallet/member access checks.
- Expense CRUD.
- Monthly summary and settlement calculations.

The web and mobile clients should not bypass backend authorization for sensitive writes.

Recommended API surface for Phase 1:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`
- `GET /wallets`
- `POST /wallets`
- `GET /wallets/:walletId`
- `POST /wallets/:walletId/members`
- `GET /wallets/:walletId/expenses`
- `POST /wallets/:walletId/expenses`
- `PATCH /wallets/:walletId/expenses/:expenseId`
- `DELETE /wallets/:walletId/expenses/:expenseId`
- `GET /wallets/:walletId/summary?month=YYYY-MM`

## Supabase Usage

Supabase is the database provider. Treat it as Postgres plus platform tooling.

Use Supabase for:

- Postgres database.
- Local development database if configured later.
- Migrations if the team chooses Supabase migration tooling.

Do not use Supabase for:

- User authentication.
- OAuth.
- Session middleware.
- Supabase SSR auth helpers.

Current cleanup decision:

- Keep `@supabase/supabase-js` for database access experiments or future shared clients.
- Remove `@supabase/ssr` because the project is not using Supabase Auth or Supabase SSR session helpers.

If backend database access is implemented only with a server-side Postgres driver later, `@supabase/supabase-js` can also be removed from the web app.

## Coding Conventions

General:

- Prefer TypeScript for all app and package code.
- Keep code scoped to the app/package that owns the behavior.
- Use shared packages only when duplication becomes real.
- Keep business calculations testable and separate from UI components.

Next.js:

- Use App Router.
- Prefer Server Components for read-only pages.
- Use Client Components for forms, interactive controls, local UI state, and optimistic updates.
- Keep API integration behind small client/server helper modules instead of calling `fetch` from every component.

Auth:

- Do not add Supabase Auth middleware.
- Do not use `@supabase/ssr` for session handling.
- Plan for custom backend-issued auth cookies or bearer tokens.

Expense calculations:

- Keep settlement logic deterministic.
- Put shared calculation logic in a plain TypeScript module so it can be reused by backend tests and UI previews if needed.
- Avoid hiding rounding behavior. Decide and document currency rounding rules before implementing settlement transfers.

## Suggested Monorepo Layout

The repo can grow toward this structure:

```text
apps/
  web/
  mobile/
  api/
packages/
  config/
  types/
  expense-core/
```

Potential package roles:

- `apps/web`: Next.js UI.
- `apps/mobile`: Expo mobile app.
- `apps/api`: Express backend.
- `packages/types`: shared DTOs and domain types.
- `packages/expense-core`: pure expense summary and settlement logic.
- `packages/config`: shared ESLint/TypeScript config if needed.

Do not create all shared packages prematurely. Add them when the code actually needs to be shared.

## Open Questions

These decisions are still open and should be confirmed before implementing the related feature:

- Primary currency: VND only, or multi-currency from the start?
- Wallet invitation model: invite by email, invite link, or manual member creation?
- Can non-registered people be temporary wallet members in Phase 1?
- Split behavior: always equal split in Phase 1, or allow custom split per expense?
- Auth transport: HTTP-only cookie session or JWT bearer token?
- Backend location: `apps/api` inside this monorepo, or separate repository?
- Supabase access: backend uses Supabase client, direct Postgres driver, Prisma, Drizzle, or another ORM/query builder?
- Deployment target for web, api, and database.

## How Codex Should Use This File

Before making meaningful product or architecture changes, read this file first.

When adding a feature:

- Preserve the Phase 1 scope unless the user explicitly expands it.
- Prefer simple, working product flows over speculative architecture.
- Keep manual auth separate from Supabase Auth.
- Update this file when a major product or technical decision changes.
