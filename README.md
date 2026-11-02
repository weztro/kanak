# KANAK

> **Shared Groceries. Transparent Expenses. Organized Living.**

**KANAK** is a production-grade, shared accommodation management Progressive Web App (PWA) designed for groups of 3–4 bachelors living together. It automates and streamlines grocery inventory, multi-item grocery purchases, daily cooking consumption, monthly contributions, common fund ledgers, non-grocery shared expenses, and debt settlements.

---

## 🌟 Key Features

1. **Multi-Tenant Accommodation Management**
   - Create or join shared accommodations with an invite code.
   - Configurable monthly budgets, contribution dues per member, and currency settings (INR default).
   - Role-based access control (`admin`, `member`) with strict privilege escalation prevention.

2. **Automated Grocery & Household Inventory**
   - 12 comprehensive categories (Rice & Grains, Vegetables, Fruits, Dairy, Cooking Essentials, Masala & Spices, etc.).
   - Standardized base unit normalization (`g`, `ml`, `pcs`) preventing unit mismatch errors.
   - Real-time stock status (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`) with automated low-stock notifications.
   - Opening inventory wizard for seamless initial house setup.
   - Immutable audit trail: every inventory movement logs a `stock_transactions` record.

3. **Multi-Item Purchases & Receipt Uploads**
   - Record multi-item supermarket purchases with quantities, unit prices, discounts, and tax.
   - Dual payment sources: **Personal Advance** or **Common Fund**.
   - Atomic PostgreSQL execution (`post_purchase_atomic`): simultaneously creates purchase records, increments inventory, logs stock history, and allocates expense shares among active members.
   - Private Supabase Storage bucket (`purchase-bills`) with client and server-side magic byte file signature verification (JPEG, PNG, WebP, PDF ≤ 5 MB).
   - Temporary signed URLs for secure receipt previewing (no public bucket exposure, no Base64 in PostgreSQL).

4. **Daily Cooking Consumption Tracking**
   - Log ingredient consumption by meal type (Breakfast, Lunch, Dinner, Snacks, Other).
   - Automatically decrements inventory in real-time with threshold detection and prevents accidental negative stock.

5. **Shared Expenses & Non-Grocery Utilities**
   - Track shared utility bills (Electricity, Drinking Water, Wi-Fi, LPG Cylinder, Repairs, Maid/Cook).
   - Equal expense sharing calculated strictly against active members on the expense date.
   - Penny/Paise remainder distribution ensuring total allocated shares equal 100% of the expense amount without rounding drift.

6. **Common Fund & Monthly Contributions**
   - Track monthly dues, paid contributions, and common fund cash flow (`fund_transactions`).
   - Clean financial separation: Grocery purchases never conflate with member contributions.

7. **Debt Simplification & Settlements**
   - Real-time net balance formula:
     $$\text{Net Balance} = \text{Contributions} + \text{Personal Advances} - \text{Allocated Expenses} - \text{Reimbursements} + \text{Settlements Paid} - \text{Settlements Received}$$
   - Optimal debt settlement recommendation engine powered by a greedy min-cash-flow algorithm.
   - Record and mark settlements as settled with zero financial record deletion.

8. **Interactive Dashboards & Analytics**
   - Summary cards: Total Members, Monthly Expenses, Common Fund Balance, Pending Dues, Low Stock Alerts, and Pending Settlements.
   - Recharts monthly expense trends and category-wise spending distribution.
   - Interactive shared shopping list with low-stock auto-suggestions.
   - Export accommodation reports to CSV.

9. **Installable Progressive Web App (PWA)**
   - Fully responsive design matching Linear/Notion minimal aesthetics.
   - Mobile-optimized bottom navigation, quick action floating action button (FAB), and touch-friendly sheets.
   - Desktop collapsible sidebar and accommodation switcher.
   - Installable on Android, iOS, and Desktop with offline fallback cache.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router, Server Actions, Route Handlers)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4 & [Lucide React](https://lucide.dev/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Shadcn UI](https://ui.shadcn.com/) patterns
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 15+, Row-Level Security, Auth, Storage)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Package Manager**: [pnpm](https://pnpm.io/)

---

## 🗄️ Database Architecture

The database enforces multi-tenant isolation via `accommodation_id` and PostgreSQL Row-Level Security (RLS). All critical multi-table transactions run inside ACID stored procedures in `supabase/migrations/`:

| Migration File | Description |
|---|---|
| `20261102000001_kanak_schema.sql` | 22 relational tables with foreign keys, checks, indexes, audit logs, and RLS policies |
| `20261102000002_kanak_functions.sql` | Stored functions (`post_purchase_atomic`, `cancel_purchase_atomic`, `record_consumption_atomic`, `record_contribution_atomic`, `post_expense_atomic`, `get_member_balances`, `get_common_fund_balance`) |
| `20261102000003_kanak_seed.sql` | Seeds the 12 default item categories |

---

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or v20+ LTS recommended)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- A Supabase Project ([supabase.com](https://supabase.com))

### 2. Clone and Install Dependencies

```bash
git clone https://github.com/weztro/kanak.git
cd kanak
pnpm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env.local` and populate your Supabase project keys:

```bash
cp .env.example .env.local
```

Inside `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Supabase Setup

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run the SQL migrations in order from the `supabase/migrations/` directory:
   - `supabase/migrations/20261102000001_kanak_schema.sql`
   - `supabase/migrations/20261102000002_kanak_functions.sql`
   - `supabase/migrations/20261102000003_kanak_seed.sql`
3. In **Storage**, create a private bucket named:
   - Name: `purchase-bills`
   - Public: **No** (Unchecked)
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
   - Max file size: `5MB`

### 5. Run the Application

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 PWA Installation

- **Android (Chrome)**: Tap the browser menu (⋮) -> **Install App** or tap the install prompt at the bottom of the screen.
- **Desktop (Chrome/Edge)**: Click the install icon in the URL address bar or navigate to Settings -> Install KANAK.
- **iOS (Safari)**: Tap the Share button -> **Add to Home Screen**.

---

## 🔒 Security & Privacy

- **Row-Level Security (RLS)**: Enforced on all tables. Accommodation members can only read and write data belonging to their active accommodation.
- **File Upload Verification**: Files uploaded to `purchase-bills` are validated against actual binary magic bytes (`FF D8 FF`, `89 50 4E 47`, `52 49 46 46`, `%PDF`), preventing malicious file masquerading.
- **Strict Role Boundaries**: Regular members cannot self-promote to admin or alter accommodation financial settings.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
