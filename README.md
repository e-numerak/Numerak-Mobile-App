# E-Numerak · UAE PEPPOL Invoicing App

> **Built by [AL Merak Tax Consultant LLC](https://www.e-numerak.com)**  
> A professional mobile application for UAE-compliant PEPPOL e-invoicing, company management, and financial operations — built for suppliers, accountants, and business owners operating under the UAE Ministry of Finance e-invoicing framework.

---

## Table of Contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Integration](#api-integration)
- [Authentication & MFA Flow](#authentication--mfa-flow)
- [Module Breakdown](#module-breakdown)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

**E-Numerak** is a React Native mobile application (Expo) that serves as the mobile client for the E-Numerak PEPPOL Service Provider platform. It enables UAE businesses to:

- Issue and manage **PEPPOL-compliant invoices** (PINT-AE UBL 2.1)
- Manage **companies, members, and customers** with UAE regulatory fields (TRN, TIN, Emirate)
- Calculate **UAE VAT** (5% standard, zero-rated, exempt, out-of-scope)
- Track **inbound invoices** received via the PEPPOL AS4 network
- Access **real-time invoice dashboard** statistics

The app communicates exclusively with the **E-Numerak REST API** (`https://api.e-numerak.com/api/v1/`) using JWT authentication with automatic token refresh.

---

## Features

### ✅ Implemented (Production Ready)

| Module | Features |
|---|---|
| **Authentication** | Login, JWT token management, secure storage, MFA (TOTP) setup & verify, Remember Me, session restore |
| **Dashboard** | Real-time revenue stats, invoice status breakdown, company selector, quick actions, animated card entrance |
| **Companies** | List, create (with logo upload), view, edit, soft-deactivate, Members CRUD (add/role-change/remove) |
| **Customers** | List (searchable, paginated), create (logo + TRN document upload), view, edit, deactivate, completeness tracking |
| **VAT Calculator** | Live backend calculation (standard/zero/exempt/out-of-scope), dynamic rate loading |
| **Invoices** | List, create (with line items), detail view, status transitions (submit/cancel), validation |
| **Navigation** | Protected Drawer with SmartHeaderLeft (hamburger ↔ back arrow), global loading bar, active route highlighting |



## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Expo](https://expo.dev) SDK 54 (React Native 0.81) |
| **Routing** | [Expo Router](https://expo.github.io/router) v6 (file-based, nested groups) |
| **State management** | [Zustand](https://zustand-demo.pmnd.rs) v5 (auth store) |
| **Server state** | [TanStack React Query](https://tanstack.com/query) v5 (caching, pagination, mutations) |
| **HTTP client** | [Axios](https://axios-http.com) with request/response interceptors + JWT refresh queue |
| **UI / Icons** | [@expo/vector-icons](https://icons.expo.fyi) (Feather set), [expo-linear-gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/) |
| **Animations** | React Native `Animated` API (staggered fade+slide, global loading bar) |
| **File picking** | [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [expo-document-picker](https://docs.expo.dev/versions/latest/sdk/document-picker/) |
| **Date picking** | [@react-native-community/datetimepicker](https://github.com/react-native-datetimepicker/datetimepicker) |
| **Secure storage** | [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) (tokens, remembered credentials) |
| **Haptics** | [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) (login feedback) |
| **TypeScript** | v5.9 — strict types derived from Django models/serializers |

---

## Project Structure

```
enumerak-app/
│
├── app/                          # Expo Router screens (file-based routing)
│   ├── (auth)/                   # Public screens (no auth required)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   ├── verify-email.tsx
│   │   └── mfa-verify.tsx
│   │
│   ├── (app)/                    # Protected screens (JWT required)
│   │   ├── _layout.tsx           # Drawer navigator + auth guard + global loading bar
│   │   ├── dashboard.tsx         # Revenue stats + quick actions
│   │   ├── companies/
│   │   │   ├── index.tsx         # Companies list
│   │   │   ├── create.tsx        # Add company (multipart)
│   │   │   └── [companyId]/
│   │   │       ├── index.tsx     # Company detail / edit
│   │   │       ├── members.tsx   # Members CRUD
│   │   │       └── customers/
│   │   │           ├── index.tsx          # Customers list
│   │   │           ├── create.tsx         # Add customer (multipart)
│   │   │           └── [customerId]/
│   │   │               └── index.tsx      # Customer detail / edit
│   │   ├── customers/
│   │   │   └── index.tsx         # Top-level: company picker → customers
│   │   ├── invoices/
│   │   │   ├── index.tsx         # Invoices list
│   │   │   ├── create.tsx        # Create invoice + line items
│   │   │   ├── products.tsx      # Product catalog
│   │   │   └── [invoiceId]/
│   │   │       ├── index.tsx     # Invoice detail + status actions
│   │   │       ├── items.tsx     # Line items CRUD
│   │   │       ├── vat-summary.tsx
│   │   │       └── payments.tsx
│   │   ├── reports/
│   │   │   └── index.tsx         # VAT Calculator
│   │   └── settings/
│   │       └── profile.tsx
│   │
│   ├── _layout.tsx               # Root layout (QueryClient, SafeAreaProvider)
│   └── index.tsx                 # Splash redirect
│
├── src/
│   ├── api/                      # Axios API functions (one file per module)
│   │   ├── client.ts             # Base instance + interceptors + 401 refresh queue
│   │   ├── auth.api.ts
│   │   ├── companies.api.ts
│   │   ├── customers.api.ts      # Multipart FormData upload support
│   │   ├── taxes.api.ts
│   │   └── invoices.api.ts
│   │
│   ├── hooks/                    # React Query wrappers (one hook file per module)
│   │   ├── useCompanies.ts       # Centralized query keys + cache invalidation
│   │   ├── useCustomers.ts
│   │   ├── useTaxes.ts
│   │   └── useInvoices.ts
│   │
│   ├── store/
│   │   └── authStore.ts          # Zustand: tokens, user, MFA state, login/logout
│   │
│   ├── components/
│   │   ├── shared/
│   │   │   └── PlaceholderScreen.tsx
│   │   ├── invoice/              # Invoice-specific components
│   │   └── InvoiceStatusBadge.tsx
│   │
│   ├── types/                    # TypeScript interfaces (derived from Django serializers)
│   │   ├── company.types.ts
│   │   ├── customer.types.ts
│   │   ├── tax.types.ts
│   │   └── invoice.types.ts
│   │
│   ├── constants/
│   │   ├── api.ts                # All endpoint URLs (BASE_URL + /api/v1/ prefix)
│   │   └── peppol.ts             # PEPPOL identifiers, CustomizationIDs
│   │
│   └── utils/
│       ├── tokenStorage.ts       # expo-secure-store wrappers
│       ├── formatters.ts         # AED currency, date, VAT formatting
│       └── validators.ts
│
├── assets/
├── app.config.ts                 # Expo config (name, icon, env-based API URL)
├── eas.json                      # EAS Build profiles (dev / preview / production)
├── babel.config.js               # babel-preset-expo only (no manual reanimated plugin)
├── .env                          # See Environment Variables section
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Expo Go app on your device (for development), or a development build

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/al-merak/enumerak-app.git
cd enumerak-app

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env
# → Fill in EXPO_PUBLIC_API_BASE_URL (see Environment Variables)

# 4. Start the development server
npx expo start
```

### Running on device

```bash
# Android
npx expo start --android

# iOS
npx expo start --ios

# Web (limited support)
npx expo start --web
```

> **Note:** If you see a `react-native-worklets` / Reanimated crash on startup, make sure `babel.config.js` does **not** manually include `react-native-reanimated/plugin` — this is handled automatically by `babel-preset-expo` on SDK 54.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Base URL of the E-Numerak REST API (no trailing slash)
EXPO_PUBLIC_API_BASE_URL=https://api.e-numerak.com

# API version prefix
EXPO_PUBLIC_API_VERSION=/api/v1
```

> All variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app bundle. Never put secrets (private keys, passwords) in `.env` — these are bundled into the client.

---

## API Integration

| Detail | Value |
|---|---|
| Base URL | `https://api.e-numerak.com/api/v1/` |
| Auth | `Authorization: Bearer <access_token>` (JWT) |
| Content type | `application/json` (file uploads: `multipart/form-data`) |
| Token refresh | Automatic via Axios response interceptor (queued 401 retry) |
| Error shape | `{ success, error: { code, message, details } }` |
| Pagination | `{ count, next, previous, results }` (DRF `StandardResultsPagination`) |

### Key endpoints used

```
POST   /auth/login/                          Login (JWT)
POST   /auth/token/refresh/                  Refresh access token
GET    /auth/me/                             Current user profile
POST   /auth/mfa/verify-login/               MFA verification

GET    /companies/                           List companies
POST   /companies/                           Create company
GET    /companies/{id}/                      Company detail
PUT    /companies/{id}/                      Update company
DELETE /companies/{id}/                      Soft-deactivate
GET    /companies/{id}/members/              List members
POST   /companies/{id}/members/              Add member
PUT    /companies/{id}/members/{mid}/        Change member role
DELETE /companies/{id}/members/{mid}/        Remove member

GET    /customers/?company_id={uuid}         List customers (paginated)
POST   /customers/                           Create customer (multipart)
GET    /customers/{id}/                      Customer detail
PUT    /customers/{id}/                      Update customer

GET    /taxes/rates/                         UAE VAT rate reference
POST   /taxes/calculate/                     On-demand VAT calculation

GET    /invoices/?company_id={uuid}          List invoices (paginated)
POST   /invoices/                            Create invoice
GET    /invoices/{id}/                       Invoice detail
POST   /invoices/{id}/submit/                Submit to PEPPOL
POST   /invoices/{id}/validate/              PINT-AE validation
GET    /invoices/dashboard/?company_id={id}  Dashboard stats
```

---

## Authentication & MFA Flow

```
POST /auth/login/
        │
        ├─ access token returned ──────────────────► Dashboard
        │
        ├─ mfa_setup_required = true ─────────────► MFA Setup screen
        │     (setup-login → QR scan → enable-login)
        │                                            │
        │                                            └─► Dashboard
        │
        └─ mfa_required = true ───────────────────► MFA Verify screen
              (verify-login with TOTP code)
                                                     │
                                                     └─► Dashboard
```

Tokens are stored in `expo-secure-store` (encrypted). The Axios interceptor automatically queues all concurrent 401 responses, refreshes the token once, then retries all queued requests — preventing race conditions on parallel API calls.

---

## Module Breakdown

### Companies
Full CRUD with UAE-specific regulatory fields: TRN (15-digit), TIN (auto-derived), Emirate (7 UAE choices), Legal Registration Type (TL/CRN/EID/PAS/CD), VAT group flag, PEPPOL endpoint. Logo upload supported on create/edit. Soft-deactivate (reversible by admin).

### Customers
Company-scoped. Create requires mandatory file uploads: **logo** (JPG/PNG via `expo-image-picker`) and **TRN document** (PDF/JPG/PNG via `expo-document-picker`). Profile completeness tracking (`is_complete`, `completion_percent`, `missing_fields`) for invoice-readiness gating. Paginated list with search (name, TRN, email).

### VAT Calculator
Calls `POST /taxes/calculate/` — rates loaded dynamically from `GET /taxes/rates/`. Supports standard (5%), zero, exempt, out-of-scope. Quantity multiplier. Results: subtotal, VAT amount, total in AED.

### Invoices
Create in DRAFT with header fields (customer, type, dates, currency) and inline line items (description, quantity, unit price, VAT rate type). Status transitions: DRAFT → PENDING (submit) → VALIDATED/REJECTED. PINT-AE validation on demand (`/validate/`). Dashboard stats (total revenue, VAT, invoice count, status breakdown).

### Navigation

- **Drawer:** 8 top-level routes with Feather icons, active route highlighted with gold accent bar

- **SmartHeaderLeft:** hamburger on top-level screens, back arrow (step-up one path segment) on detail screens

- **GlobalLoadingBar:** amber shimmer bar appears whenever any React Query request is in-flight

- **Auth guard:** `(app)/_layout.tsx` reads `isAuthenticated` from Zustand, redirects to `/login` if not authenticated, shows spinner during session restore

---

## Known Limitations

| Limitation | Detail |
|---|---|
| Customer document re-upload | `CustomerUpdateSerializer` does not accept file fields — logo and TRN document can only be set at creation time. Edit mode shows an info notice. |

| Onboarding module | Admin invitation flow and public invite-accept registration are out of scope for this app — admin-only operations. |

| RBAC (Role-based UI) | Backend enforces permissions on all endpoints. Frontend currently shows all UI to all authenticated users — a dedicated RBAC pass is planned to hide/disable actions based on `user.role` and company membership role. |

| Expo Go + Reanimated | Reanimated 4.x + `react-native-worklets` requires explicit peer installation (`npx expo install react-native-worklets`) and no manual babel plugin. |

---

---

## License

Copyright © 2026 **AL Merak Tax Consultant LLC**. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or modification of this software, in whole or in part, is strictly prohibited without prior written consent from AL Merak Tax Consultant LLC.

---

<div align="center">

**E-Numerak** · UAE Invoicing  
Built with ❤️ by AL Merak Tax Consultant LLC  Developer : Ehtisham Malik


</div>
