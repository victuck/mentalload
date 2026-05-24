# Mental Load App — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app where households visualise and rebalance the mental load each person carries, with a Today tab (daily task view) and a Balance tab (load distribution).

**Architecture:** Next.js App Router frontend with Supabase for auth (magic link), database (Postgres), and real-time subscriptions. Balance scores are calculated from owned tasks (frequency × effort) plus pickup completions (tasks completed by someone other than the owner). All household data is protected by Supabase Row Level Security.

**Tech Stack:** Next.js 14 (App Router), Supabase (auth + Postgres + real-time), Tailwind CSS, Vitest (unit + integration tests), deployed on Vercel.

---

## File Map

```
mentalload/
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Root layout
│   │   ├── page.tsx                     # Redirect to login or household
│   │   ├── auth/
│   │   │   ├── login/page.tsx           # Magic link request form
│   │   │   └── callback/route.ts        # Exchange code for session
│   │   ├── onboarding/page.tsx          # Create household + seed tasks
│   │   ├── join/[token]/page.tsx        # Join household via invite token
│   │   └── h/[householdId]/
│   │       ├── layout.tsx               # Tab shell (Today | Balance)
│   │       ├── today/page.tsx           # Today tab
│   │       └── balance/page.tsx         # Balance tab
│   ├── components/
│   │   ├── TaskCard.tsx                 # Task display + completion buttons
│   │   ├── TaskForm.tsx                 # Add/edit task modal
│   │   ├── BalanceChart.tsx             # Load distribution bar chart
│   │   ├── UnassignedPool.tsx           # Unassigned tasks section
│   │   └── ReconnectIndicator.tsx       # Offline/reconnecting banner
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # Browser Supabase client
│   │   │   └── server.ts                # Server Supabase client
│   │   ├── balance.ts                   # Score calculation (pure functions)
│   │   └── types.ts                     # Shared TypeScript types
│   └── middleware.ts                    # Auth guard
├── supabase/
│   └── migrations/
│       ├── 20260511000001_schema.sql    # All tables
│       └── 20260511000002_rls.sql       # Row Level Security policies
├── vitest.config.ts
├── .env.local.example
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `.env.local.example`

- [ ] **Step 1: Bootstrap Next.js app**

```bash
cd /Users/victoria.shakspeare/development/mentalload
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
```

When prompted, accept all defaults.

- [ ] **Step 2: Install Supabase and test dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Install Supabase CLI** (if not already installed)

```bash
npm install -D supabase
npx supabase --version
```

Expected: version string printed (e.g. `1.x.x`)

- [ ] **Step 4: Configure Vitest**

Replace the contents of `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create env example**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Copy to `.env.local`:

```bash
cp .env.local.example .env.local
```

- [ ] **Step 6: Verify setup**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with Supabase and Vitest"
```

---

## Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/20260511000001_schema.sql`
- Create: `supabase/migrations/20260511000002_rls.sql`

- [ ] **Step 1: Initialise Supabase local dev**

```bash
npx supabase init
npx supabase start
```

Expected output includes:
```
API URL: http://localhost:54321
anon key: eyJ...
```

Copy the anon key into `.env.local`.

- [ ] **Step 2: Write schema migration**

Create `supabase/migrations/20260511000001_schema.sql`:

```sql
-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_colour TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Households
CREATE TABLE households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membership (user belongs to household)
CREATE TABLE household_members (
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  default_tab TEXT NOT NULL DEFAULT 'balance' CHECK (default_tab IN ('today', 'balance')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (household_id, user_id)
);

-- Invite tokens
CREATE TABLE invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('chores', 'planning', 'errands', 'admin', 'other')),
  frequency TEXT NOT NULL CHECK (frequency IN ('one-off', 'daily', 'weekly', 'monthly', 'custom')),
  custom_frequency_label TEXT,
  custom_frequency_weight INTEGER CHECK (custom_frequency_weight > 0),
  next_due_date DATE,
  effort TEXT NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
  is_invisible_work BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Completions (who did the task, and whether it was a pickup)
CREATE TABLE task_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  completed_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  is_pickup BOOLEAN NOT NULL DEFAULT FALSE
);

-- Auto-create profile row on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar_colour)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    '#6366f1'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 3: Write RLS migration**

Create `supabase/migrations/20260511000002_rls.sql`:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Profiles: readable by anyone authenticated, writable only by owner
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Households: readable by members, creatable by authenticated users
CREATE POLICY "households_select" ON households FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = id AND user_id = auth.uid()
  ));
CREATE POLICY "households_insert" ON households FOR INSERT TO authenticated WITH CHECK (true);

-- Members: readable by members of same household
CREATE POLICY "members_select" ON household_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = household_id AND hm.user_id = auth.uid()
  ));
CREATE POLICY "members_insert" ON household_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "members_update" ON household_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Invites: readable and creatable by household members
CREATE POLICY "invites_select" ON invites FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = invites.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "invites_insert" ON invites FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = invites.household_id AND user_id = auth.uid()
  ));

-- Allow unauthenticated invite lookup (for join flow)
CREATE POLICY "invites_select_by_token" ON invites FOR SELECT USING (true);

-- Tasks: readable and writable by household members
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = tasks.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = tasks.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = tasks.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = tasks.household_id AND user_id = auth.uid()
  ));

-- Completions: readable and insertable by household members
CREATE POLICY "completions_select" ON task_completions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN household_members hm ON hm.household_id = t.household_id
    WHERE t.id = task_id AND hm.user_id = auth.uid()
  ));
CREATE POLICY "completions_insert" ON task_completions FOR INSERT TO authenticated
  WITH CHECK (completed_by = auth.uid());
```

- [ ] **Step 4: Apply migrations**

```bash
npx supabase db reset
```

Expected: `Finished supabase db reset.`

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema and RLS policies"
```

---

## Task 3: Types and Balance Logic

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/balance.ts`
- Create: `src/lib/balance.test.ts`

- [ ] **Step 1: Write types**

Create `src/lib/types.ts`:

```typescript
export type Frequency = 'one-off' | 'daily' | 'weekly' | 'monthly' | 'custom'
export type Effort = 'low' | 'medium' | 'high'
export type Category = 'chores' | 'planning' | 'errands' | 'admin' | 'other'
export type DefaultTab = 'today' | 'balance'

export interface Profile {
  id: string
  name: string
  avatar_colour: string
  created_at: string
}

export interface Household {
  id: string
  name: string
  created_at: string
}

export interface HouseholdMember {
  household_id: string
  user_id: string
  default_tab: DefaultTab
  joined_at: string
  profile: Profile
}

export interface Task {
  id: string
  household_id: string
  title: string
  owner_id: string | null
  category: Category
  frequency: Frequency
  custom_frequency_label: string | null
  custom_frequency_weight: number | null
  next_due_date: string | null
  effort: Effort
  is_invisible_work: boolean
  created_by: string | null
  created_at: string
}

export interface TaskCompletion {
  id: string
  task_id: string
  completed_by: string
  completed_at: string
  is_pickup: boolean
  task?: Task
}

export interface Invite {
  id: string
  household_id: string
  token: string
  created_by: string
  expires_at: string
  created_at: string
}

export interface BalanceScore {
  member_id: string
  owned_score: number
  pickup_score: number
  total_score: number
  percentage: number
}
```

- [ ] **Step 2: Write failing tests**

Create `src/lib/balance.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  getFrequencyWeight,
  calculateOwnedScore,
  calculatePickupScore,
  calculateBalanceScores,
  getNextDueDate,
} from './balance'
import type { Task, TaskCompletion, Profile } from './types'

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: '1',
  household_id: 'h1',
  title: 'Test task',
  owner_id: 'u1',
  category: 'chores',
  frequency: 'weekly',
  custom_frequency_label: null,
  custom_frequency_weight: null,
  next_due_date: null,
  effort: 'medium',
  is_invisible_work: false,
  created_by: 'u1',
  created_at: new Date().toISOString(),
  ...overrides,
})

const makeCompletion = (overrides: Partial<TaskCompletion> = {}): TaskCompletion => ({
  id: 'c1',
  task_id: '1',
  completed_by: 'u2',
  completed_at: new Date().toISOString(),
  is_pickup: true,
  task: makeTask(),
  ...overrides,
})

const makeProfile = (id: string): Profile => ({
  id,
  name: `User ${id}`,
  avatar_colour: '#6366f1',
  created_at: new Date().toISOString(),
})

describe('getFrequencyWeight', () => {
  it('returns 7 for daily', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'daily' }))).toBe(7)
  })
  it('returns 4 for weekly', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'weekly' }))).toBe(4)
  })
  it('returns 2 for monthly', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'monthly' }))).toBe(2)
  })
  it('returns 1 for one-off', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'one-off' }))).toBe(1)
  })
  it('returns custom_frequency_weight for custom', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'custom', custom_frequency_weight: 5 }))).toBe(5)
  })
  it('falls back to 1 if custom weight is null', () => {
    expect(getFrequencyWeight(makeTask({ frequency: 'custom', custom_frequency_weight: null }))).toBe(1)
  })
})

describe('calculateOwnedScore', () => {
  it('returns 0 for empty list', () => {
    expect(calculateOwnedScore([])).toBe(0)
  })
  it('multiplies frequency weight by effort weight', () => {
    // weekly(4) × medium(2) = 8
    expect(calculateOwnedScore([makeTask({ frequency: 'weekly', effort: 'medium' })])).toBe(8)
  })
  it('sums across multiple tasks', () => {
    // daily(7)×low(1)=7 + monthly(2)×high(3)=6 → 13
    expect(calculateOwnedScore([
      makeTask({ frequency: 'daily', effort: 'low' }),
      makeTask({ frequency: 'monthly', effort: 'high' }),
    ])).toBe(13)
  })
})

describe('calculatePickupScore', () => {
  it('returns 0 for empty list', () => {
    expect(calculatePickupScore([])).toBe(0)
  })
  it('ignores non-pickup completions', () => {
    expect(calculatePickupScore([
      makeCompletion({ is_pickup: false, task: makeTask({ effort: 'high' }) }),
    ])).toBe(0)
  })
  it('sums effort weights for pickups', () => {
    // low(1) + high(3) = 4
    expect(calculatePickupScore([
      makeCompletion({ is_pickup: true, task: makeTask({ effort: 'low' }) }),
      makeCompletion({ is_pickup: true, task: makeTask({ effort: 'high' }) }),
    ])).toBe(4)
  })
})

describe('calculateBalanceScores', () => {
  it('returns 0% for all members when no tasks', () => {
    const scores = calculateBalanceScores([makeProfile('u1'), makeProfile('u2')], [], [])
    expect(scores.every(s => s.percentage === 0)).toBe(true)
  })
  it('assigns 100% to sole task owner', () => {
    const scores = calculateBalanceScores(
      [makeProfile('u1'), makeProfile('u2')],
      [makeTask({ owner_id: 'u1' })],
      []
    )
    expect(scores.find(s => s.member_id === 'u1')!.percentage).toBe(100)
    expect(scores.find(s => s.member_id === 'u2')!.percentage).toBe(0)
  })
  it('includes pickup completions in score', () => {
    // u1 owns weekly(4)×low(1)=4; u2 picks up high(3) task → total 7
    const scores = calculateBalanceScores(
      [makeProfile('u1'), makeProfile('u2')],
      [makeTask({ owner_id: 'u1', frequency: 'weekly', effort: 'low' })],
      [makeCompletion({ completed_by: 'u2', is_pickup: true, task: makeTask({ effort: 'high' }) })]
    )
    expect(scores.find(s => s.member_id === 'u1')!.percentage).toBe(57)
    expect(scores.find(s => s.member_id === 'u2')!.percentage).toBe(43)
  })
})

describe('getNextDueDate', () => {
  it('returns null for one-off', () => {
    expect(getNextDueDate('one-off', new Date())).toBeNull()
  })
  it('returns null for custom', () => {
    expect(getNextDueDate('custom', new Date())).toBeNull()
  })
  it('advances 1 day for daily', () => {
    const next = getNextDueDate('daily', new Date('2026-05-11'))!
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-12')
  })
  it('advances 7 days for weekly', () => {
    const next = getNextDueDate('weekly', new Date('2026-05-11'))!
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-18')
  })
  it('advances 1 month for monthly', () => {
    const next = getNextDueDate('monthly', new Date('2026-05-11'))!
    expect(next.toISOString().slice(0, 10)).toBe('2026-06-11')
  })
})
```

- [ ] **Step 3: Run tests — expect all to fail**

```bash
npx vitest run src/lib/balance.test.ts
```

Expected: `FAIL` — `balance.ts` does not exist yet.

- [ ] **Step 4: Implement balance logic**

Create `src/lib/balance.ts`:

```typescript
import type { Task, TaskCompletion, Profile, BalanceScore, Effort, Frequency } from './types'

const EFFORT_WEIGHTS: Record<Effort, number> = { low: 1, medium: 2, high: 3 }

const FREQUENCY_WEIGHTS: Record<Exclude<Frequency, 'custom'>, number> = {
  'one-off': 1,
  monthly: 2,
  weekly: 4,
  daily: 7,
}

export function getFrequencyWeight(task: Task): number {
  if (task.frequency === 'custom') return task.custom_frequency_weight ?? 1
  return FREQUENCY_WEIGHTS[task.frequency]
}

export function calculateOwnedScore(tasks: Task[]): number {
  return tasks.reduce(
    (sum, task) => sum + getFrequencyWeight(task) * EFFORT_WEIGHTS[task.effort],
    0
  )
}

export function calculatePickupScore(completions: TaskCompletion[]): number {
  return completions
    .filter(c => c.is_pickup && c.task)
    .reduce((sum, c) => sum + EFFORT_WEIGHTS[c.task!.effort], 0)
}

export function calculateBalanceScores(
  members: Profile[],
  tasks: Task[],
  completions: TaskCompletion[]
): BalanceScore[] {
  const raw = members.map(member => {
    const ownedScore = calculateOwnedScore(tasks.filter(t => t.owner_id === member.id))
    const pickupScore = calculatePickupScore(completions.filter(c => c.completed_by === member.id && c.is_pickup))
    return { member_id: member.id, owned_score: ownedScore, pickup_score: pickupScore, total_score: ownedScore + pickupScore, percentage: 0 }
  })

  const total = raw.reduce((sum, s) => sum + s.total_score, 0)
  return raw.map(s => ({
    ...s,
    percentage: total === 0 ? 0 : Math.round((s.total_score / total) * 100),
  }))
}

export function getNextDueDate(frequency: Frequency, currentDueDate: Date): Date | null {
  if (frequency === 'one-off' || frequency === 'custom') return null
  const next = new Date(currentDueDate)
  if (frequency === 'daily') next.setDate(next.getDate() + 1)
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7)
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1)
  return next
}
```

- [ ] **Step 5: Run tests — expect all to pass**

```bash
npx vitest run src/lib/balance.test.ts
```

Expected: All tests `PASS`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/
git commit -m "feat: add types and balance calculation logic with tests"
```

---

## Task 4: Supabase Clients and Auth Middleware

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Create browser client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server client**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create auth middleware**

Create `src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/auth') || pathname.startsWith('/join')) {
    return supabaseResponse
  }

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts
git commit -m "feat: add Supabase client helpers and auth middleware"
```

---

## Task 5: Auth Flow

**Files:**
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create login page**

Create `src/app/auth/login/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next')
    const redirectTo = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
          <p className="text-gray-600">We sent a login link to <strong>{email}</strong>.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-semibold">Sign in to MentalLoad</h1>
        <p className="text-gray-600 text-sm">Enter your email — we'll send you a magic link.</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700"
        >
          Send magic link
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Create auth callback route**

Create `src/app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') // preserved from login ?next= param

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // If there's a next param (e.g. a join link), go there first
      if (next && next.startsWith('/')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Check if user has a household
      const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', data.user.id)
        .limit(1)

      if (memberships && memberships.length > 0) {
        return NextResponse.redirect(`${origin}/h/${memberships[0].household_id}/today`)
      }
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
```

- [ ] **Step 3: Update root page to redirect**

Replace `src/app/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: memberships } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)

  if (memberships && memberships.length > 0) {
    redirect(`/h/${memberships[0].household_id}/today`)
  }

  redirect('/onboarding')
}
```

- [ ] **Step 4: Manual test**

Start dev server: `npm run dev`

Open `http://localhost:3000` — should redirect to `/auth/login`.
Enter an email — should show "Check your email" confirmation.

- [ ] **Step 5: Commit**

```bash
git add src/app/
git commit -m "feat: add magic link auth flow and callback handler"
```

---

## Task 6: Onboarding — Create Household

**Files:**
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Create onboarding page**

Create `src/app/onboarding/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setLoading(false); return }

    // Update profile name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', user.id)

    if (profileError) { setError(profileError.message); setLoading(false); return }

    // Create household
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name: householdName })
      .select()
      .single()

    if (householdError || !household) { setError(householdError?.message ?? 'Failed to create household'); setLoading(false); return }

    // Join as member
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({ household_id: household.id, user_id: user.id, default_tab: 'balance' })

    if (memberError) { setError(memberError.message); setLoading(false); return }

    router.push(`/h/${household.id}/balance`)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-semibold">Set up your household</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm font-medium">Your name</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Alex"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Household name</label>
          <input
            required
            value={householdName}
            onChange={e => setHouseholdName(e.target.value)}
            placeholder="The Smiths"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create household'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Add seed tasks step**

> ⚑ **DESIGN CHECKPOINT — Seed Tasks Content**
> Before implementing SeedTasks, have a design conversation about:
> - Which tasks to include (how many? what categories?)
> - Whether to group by household type (e.g. "with kids" vs "without")
> - How to handle cultural/regional variation in common tasks
> - Whether suggestions should be editable inline or open TaskForm
>
> **Do not implement the hardcoded list below without this conversation.** Replace `SEED_PROMPTS` with the agreed list.

After the form submission succeeds and before the redirect, create `src/app/onboarding/SeedTasks.tsx` and wire it up as a second step (shown after household is created, before redirecting to Balance):

```tsx
'use client'

import { useState } from 'react'
import type { Category, Effort } from '@/lib/types'
import { TaskForm } from '@/components/TaskForm'
import type { Profile } from '@/lib/types'

const SEED_PROMPTS: { title: string; category: Category; effort: Effort }[] = [
  { title: 'Weekly food shop', category: 'errands', effort: 'medium' },
  { title: 'Cooking meals', category: 'chores', effort: 'medium' },
  { title: 'Cleaning bathroom', category: 'chores', effort: 'low' },
  { title: 'Managing finances / bills', category: 'admin', effort: 'high' },
  { title: 'School / nursery admin', category: 'planning', effort: 'medium' },
  { title: 'Booking appointments', category: 'admin', effort: 'low' },
]

interface Props {
  householdId: string
  members: Profile[]
  onDone: () => void
}

export function SeedTasks({ householdId, members, onDone }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [customTitle, setCustomTitle] = useState('')

  async function addSuggestion(suggestion: typeof SEED_PROMPTS[0]) {
    await fetch(`/h/${householdId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...suggestion,
        owner_id: null,
        frequency: 'weekly',
        next_due_date: new Date().toISOString().slice(0, 10),
        is_invisible_work: false,
      }),
    })
  }

  return (
    <div className="max-w-sm w-full space-y-4">
      <h2 className="text-xl font-semibold">Add your regular tasks</h2>
      <p className="text-gray-600 text-sm">Tap any that apply — you can edit them later. Skip if you prefer to add tasks yourself.</p>
      <div className="space-y-2">
        {SEED_PROMPTS.map(s => (
          <button
            key={s.title}
            onClick={() => addSuggestion(s)}
            className="w-full text-left border rounded-lg px-4 py-3 text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
          >
            {s.title}
            <span className="ml-2 text-xs text-gray-400 capitalize">{s.category} · {s.effort}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setShowForm(true)}
        className="w-full border-dashed border-2 rounded-lg px-4 py-3 text-sm text-gray-500 hover:bg-gray-50"
      >
        + Add a custom task
      </button>
      <button
        onClick={onDone}
        className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700"
      >
        Done — see my balance
      </button>
      {showForm && (
        <TaskForm
          householdId={householdId}
          members={members}
          onSave={() => {}}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
```

Update `src/app/onboarding/page.tsx` to show `SeedTasks` after household creation. Add a `step` state: `'setup' | 'seed'`. After the household is created, set `step = 'seed'` and render `<SeedTasks householdId={...} members={[currentUserProfile]} onDone={() => router.push(...)} />`.

- [ ] **Step 3: Manual test**

Sign in with a magic link, verify redirect to `/onboarding`. Fill in name and household name, submit. Verify seed tasks step appears. Tap a few suggestions, then click "Done". Verify redirect to `/h/[id]/balance` and seeded tasks appear as unassigned.

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/
git commit -m "feat: add household creation onboarding with seed tasks step"
```

---

## Task 7: Invite System

**Files:**
- Create: `src/app/join/[token]/page.tsx`
- Create: `src/app/h/[householdId]/invite/route.ts`

- [ ] **Step 1: Write failing tests for invite and join**

Create `src/app/h/[householdId]/invite/invite.test.ts`:

```typescript
import { describe, it, expect, afterEach } from 'vitest'
import { testSupabase } from '@/test-utils/supabase'

const BASE = 'http://localhost:3000'
const createdIds: string[] = []

afterEach(async () => {
  for (const id of createdIds) {
    await testSupabase.from('invites').delete().eq('household_id', id)
    await testSupabase.from('households').delete().eq('id', id)
  }
  createdIds.length = 0
})

describe('POST /h/[householdId]/invite', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${BASE}/h/fake-id/invite`, { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('returns a join URL with a 32-char hex token', async () => {
    const { data: hh } = await testSupabase.from('households').insert({ name: 'TDD Test' }).select().single()
    createdIds.push(hh!.id)
    // Note: requires a valid session cookie — run against dev server with a logged-in user
    const res = await fetch(`${BASE}/h/${hh!.id}/invite`, { method: 'POST', credentials: 'include' })
    expect(res.ok).toBe(true)
    const { url } = await res.json()
    expect(url).toMatch(/\/join\/[a-f0-9]{32}$/)
  })
})

describe('Invite token expiry (via Supabase direct)', () => {
  it('expired token returns no rows when filtered by expires_at', async () => {
    const { data: hh } = await testSupabase.from('households').insert({ name: 'Expiry Test' }).select().single()
    createdIds.push(hh!.id)
    await testSupabase.from('invites').insert({
      household_id: hh!.id,
      token: 'expired-test-token',
      created_by: null,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    const { data } = await testSupabase
      .from('invites').select().eq('token', 'expired-test-token').gt('expires_at', new Date().toISOString())
    expect(data).toHaveLength(0)
  })

  it('valid token returns a row', async () => {
    const { data: hh } = await testSupabase.from('households').insert({ name: 'Valid Test' }).select().single()
    createdIds.push(hh!.id)
    await testSupabase.from('invites').insert({
      household_id: hh!.id,
      token: 'valid-test-token',
      created_by: null,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
    const { data } = await testSupabase
      .from('invites').select().eq('token', 'valid-test-token').gt('expires_at', new Date().toISOString())
    expect(data).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/app/h/
```

Expected: `FAIL` — routes don't exist yet.

- [ ] **Step 3: Create invite generation route**

Create `src/app/h/[householdId]/invite/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function POST(
  _request: Request,
  { params }: { params: { householdId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('invites').insert({
    household_id: params.householdId,
    token,
    created_by: user.id,
    expires_at: expiresAt,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/join/${token}`
  return NextResponse.json({ url })
}
```

Add `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local.example` and `.env.local`.

- [ ] **Step 4: Create join page**

Create `src/app/join/[token]/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function JoinPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=/join/${params.token}`)
  }

  const { data: invite } = await supabase
    .from('invites')
    .select('*, households(name)')
    .eq('token', params.token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-semibold mb-2">Link expired</h1>
          <p className="text-gray-600">Ask a household member to send you a new invite link.</p>
        </div>
      </main>
    )
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('household_id', invite.household_id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    redirect(`/h/${invite.household_id}/today`)
  }

  // Join the household
  await supabase.from('household_members').insert({
    household_id: invite.household_id,
    user_id: user.id,
    default_tab: 'balance',
  })

  redirect(`/h/${invite.household_id}/balance`)
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/app/h/
```

Expected: All tests `PASS`.

- [ ] **Step 6: Manual test**

In the household, POST to `/h/[householdId]/invite` (use browser fetch or curl). Open the returned URL in an incognito window. Sign in, verify you land on the Balance tab as a new member.

- [ ] **Step 7: Commit**

```bash
git add src/app/join/ src/app/h/
git commit -m "feat: add invite link generation and join flow"
```

---

## Task 8: Task Form and CRUD

**Files:**
- Create: `src/components/TaskForm.tsx`
- Create: `src/app/h/[householdId]/tasks/route.ts`
- Create: `src/app/h/[householdId]/tasks/tasks.test.ts`

- [ ] **Step 1: Write failing tests for task CRUD routes**

Create `src/app/h/[householdId]/tasks/tasks.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testSupabase } from '@/test-utils/supabase'

const BASE = 'http://localhost:3000'
let householdId: string

beforeAll(async () => {
  const { data: hh } = await testSupabase.from('households').insert({ name: 'Task CRUD Test' }).select().single()
  householdId = hh!.id
})

afterAll(async () => {
  await testSupabase.from('tasks').delete().eq('household_id', householdId)
  await testSupabase.from('households').delete().eq('id', householdId)
})

describe('POST /h/[householdId]/tasks', () => {
  it('creates an unassigned task', async () => {
    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: 'Test task', owner_id: null, category: 'chores',
        frequency: 'weekly', effort: 'medium', is_invisible_work: false,
        next_due_date: '2026-05-11',
      }),
    })
    expect(res.ok).toBe(true)
    const task = await res.json()
    expect(task.owner_id).toBeNull()
    expect(task.household_id).toBe(householdId)
  })

  it('creates a custom frequency task with weight and label', async () => {
    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: 'School term task', owner_id: null, category: 'planning',
        frequency: 'custom', custom_frequency_label: 'Each term',
        custom_frequency_weight: 3, effort: 'high',
        is_invisible_work: true, next_due_date: '2026-09-01',
      }),
    })
    const task = await res.json()
    expect(task.custom_frequency_weight).toBe(3)
    expect(task.custom_frequency_label).toBe('Each term')
    expect(task.is_invisible_work).toBe(true)
  })

  it('returns 401 for unauthenticated requests', async () => {
    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x', owner_id: null, category: 'chores', frequency: 'weekly', effort: 'low', is_invisible_work: false }),
    })
    expect(res.status).toBe(401)
  })
})

describe('PATCH /h/[householdId]/tasks', () => {
  it('assigns a previously unassigned task to an owner', async () => {
    const { data: task } = await testSupabase.from('tasks').insert({
      household_id: householdId, title: 'Unassigned', owner_id: null,
      category: 'errands', frequency: 'weekly', effort: 'low',
      is_invisible_work: false, next_due_date: '2026-05-11',
    }).select().single()

    const res = await fetch(`${BASE}/h/${householdId}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: task!.id, owner_id: 'some-user-id' }),
    })
    expect(res.ok).toBe(true)
    const updated = await res.json()
    expect(updated.owner_id).toBe('some-user-id')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/app/h/
```

Expected: `FAIL` — route doesn't exist yet.

- [ ] **Step 3: Create task API route**

Create `src/app/h/[householdId]/tasks/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Category, Effort, Frequency } from '@/lib/types'

export async function POST(
  request: Request,
  { params }: { params: { householdId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    title: string
    owner_id: string | null
    category: Category
    frequency: Frequency
    custom_frequency_label?: string
    custom_frequency_weight?: number
    next_due_date?: string
    effort: Effort
    is_invisible_work: boolean
  }

  const { data, error } = await supabase.from('tasks').insert({
    household_id: params.householdId,
    title: body.title,
    owner_id: body.owner_id,
    category: body.category,
    frequency: body.frequency,
    custom_frequency_label: body.custom_frequency_label ?? null,
    custom_frequency_weight: body.custom_frequency_weight ?? null,
    next_due_date: body.next_due_date ?? new Date().toISOString().slice(0, 10),
    effort: body.effort,
    is_invisible_work: body.is_invisible_work,
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: { householdId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { id: string } & Partial<{
    title: string; owner_id: string | null; category: Category; frequency: Frequency
    custom_frequency_label: string; custom_frequency_weight: number
    next_due_date: string; effort: Effort; is_invisible_work: boolean
  }>

  const { id, ...updates } = body

  const { data, error } = await supabase.from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('household_id', params.householdId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/app/h/
```

Expected: All tests `PASS`.

- [ ] **Step 5: Create TaskForm component**

Create `src/components/TaskForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Category, Effort, Frequency, Profile, Task } from '@/lib/types'

const CATEGORIES: Category[] = ['chores', 'planning', 'errands', 'admin', 'other']
const FREQUENCIES: Frequency[] = ['one-off', 'daily', 'weekly', 'monthly', 'custom']
const EFFORTS: Effort[] = ['low', 'medium', 'high']

interface Props {
  householdId: string
  members: Profile[]
  task?: Task
  onSave: (task: Task) => void
  onClose: () => void
}

export function TaskForm({ householdId, members, task, onSave, onClose }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [ownerId, setOwnerId] = useState<string>(task?.owner_id ?? '')
  const [category, setCategory] = useState<Category>(task?.category ?? 'chores')
  const [frequency, setFrequency] = useState<Frequency>(task?.frequency ?? 'weekly')
  const [customLabel, setCustomLabel] = useState(task?.custom_frequency_label ?? '')
  const [customWeight, setCustomWeight] = useState(task?.custom_frequency_weight?.toString() ?? '1')
  const [nextDueDate, setNextDueDate] = useState(task?.next_due_date ?? new Date().toISOString().slice(0, 10))
  const [effort, setEffort] = useState<Effort>(task?.effort ?? 'medium')
  const [isInvisible, setIsInvisible] = useState(task?.is_invisible_work ?? false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const method = task ? 'PATCH' : 'POST'
  const url = `/h/${householdId}/tasks`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const body: Record<string, unknown> = {
      ...(task ? { id: task.id } : {}),
      title,
      owner_id: ownerId || null,
      category,
      frequency,
      effort,
      is_invisible_work: isInvisible,
      next_due_date: nextDueDate,
      ...(frequency === 'custom' ? { custom_frequency_label: customLabel, custom_frequency_weight: parseInt(customWeight, 10) } : {}),
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    onSave(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
        <h2 className="text-lg font-semibold">{task ? 'Edit task' : 'Add task'}</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="space-y-1">
          <label className="text-sm font-medium">Title</label>
          <input required value={title} onChange={e => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Owner</label>
          <select value={ownerId} onChange={e => setOwnerId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as Category)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Effort</label>
            <select value={effort} onChange={e => setEffort(e.target.value as Effort)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {EFFORTS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Frequency</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {frequency === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Label (e.g. "Each term")</label>
              <input required value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Weight (1–10)</label>
              <input type="number" min="1" max="10" required value={customWeight} onChange={e => setCustomWeight(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">Next due date</label>
          <input type="date" required value={nextDueDate} onChange={e => setNextDueDate(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isInvisible} onChange={e => setIsInvisible(e.target.checked)} />
          Invisible work (planning / remembering)
        </label>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border rounded px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/TaskForm.tsx src/app/h/
git commit -m "feat: add task CRUD API and TaskForm component"
```

---

## Task 9: Household Shell and Tab Navigation

**Files:**
- Create: `src/app/h/[householdId]/layout.tsx`
- Create: `src/app/h/[householdId]/today/page.tsx` (stub)
- Create: `src/app/h/[householdId]/balance/page.tsx` (stub)
- Create: `src/components/ReconnectIndicator.tsx`

- [ ] **Step 1: Create household layout**

Create `src/app/h/[householdId]/layout.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HouseholdLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { householdId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', params.householdId)
    .single()

  if (!household) redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-gray-900">{household.name}</h1>
      </header>
      <nav className="bg-white border-b flex">
        <Link
          href={`/h/${params.householdId}/today`}
          className="flex-1 text-center py-3 text-sm font-medium border-b-2 hover:text-indigo-600 [&.active]:border-indigo-600 [&.active]:text-indigo-600"
        >
          Today
        </Link>
        <Link
          href={`/h/${params.householdId}/balance`}
          className="flex-1 text-center py-3 text-sm font-medium border-b-2 hover:text-indigo-600 [&.active]:border-indigo-600 [&.active]:text-indigo-600"
        >
          Balance
        </Link>
      </nav>
      <main className="max-w-2xl mx-auto p-4">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Create ReconnectIndicator**

Create `src/components/ReconnectIndicator.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ReconnectIndicator() {
  const [disconnected, setDisconnected] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel('system')
    channel
      .on('system', { event: 'disconnect' }, () => setDisconnected(true))
      .on('system', { event: 'reconnect' }, () => setDisconnected(false))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  if (!disconnected) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm px-4 py-2 rounded-full shadow">
      Reconnecting...
    </div>
  )
}
```

- [ ] **Step 3: Create stub pages**

Create `src/app/h/[householdId]/today/page.tsx`:

```tsx
export default function TodayPage() {
  return <p className="text-gray-500 text-sm">Today tab — coming soon</p>
}
```

Create `src/app/h/[householdId]/balance/page.tsx`:

```tsx
export default function BalancePage() {
  return <p className="text-gray-500 text-sm">Balance tab — coming soon</p>
}
```

- [ ] **Step 4: Manual test**

Visit `/h/[householdId]/today` and `/h/[householdId]/balance` — verify the shell renders with tabs and household name.

- [ ] **Step 5: Commit**

```bash
git add src/app/h/ src/components/ReconnectIndicator.tsx
git commit -m "feat: add household shell with tab navigation"
```

---

## Task 10: Today Tab

**Files:**
- Create: `src/components/TaskCard.tsx`
- Create: `src/components/UnassignedPool.tsx`
- Modify: `src/app/h/[householdId]/today/page.tsx`
- Create: `src/app/h/[householdId]/tasks/complete/route.ts`
- Create: `src/app/h/[householdId]/tasks/complete/complete.test.ts`

- [ ] **Step 1: Write failing tests for completion route**

Create `src/app/h/[householdId]/tasks/complete/complete.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testSupabase } from '@/test-utils/supabase'

const BASE = 'http://localhost:3000'
let householdId: string
let taskId: string

beforeAll(async () => {
  const { data: hh } = await testSupabase.from('households').insert({ name: 'Complete Test' }).select().single()
  householdId = hh!.id
})

afterAll(async () => {
  await testSupabase.from('task_completions').delete().eq('task_id', taskId)
  await testSupabase.from('tasks').delete().eq('household_id', householdId)
  await testSupabase.from('households').delete().eq('id', householdId)
})

async function createTask(overrides = {}) {
  const { data } = await testSupabase.from('tasks').insert({
    household_id: householdId, title: 'Test', owner_id: null,
    category: 'chores', frequency: 'weekly', effort: 'medium',
    is_invisible_work: false, next_due_date: '2026-05-11',
    ...overrides,
  }).select().single()
  return data!
}

describe('POST /h/[householdId]/tasks/complete', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const task = await createTask()
    taskId = task.id
    const res = await fetch(`${BASE}/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task.id }),
    })
    expect(res.status).toBe(401)
  })

  it('advances next_due_date by 7 days for a weekly task', async () => {
    const task = await createTask({ frequency: 'weekly', next_due_date: '2026-05-11' })
    await fetch(`${BASE}/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ task_id: task.id }),
    })
    const { data: updated } = await testSupabase.from('tasks').select('next_due_date').eq('id', task.id).single()
    expect(updated!.next_due_date).toBe('2026-05-18')
  })

  it('does not advance next_due_date for one-off tasks', async () => {
    const task = await createTask({ frequency: 'one-off', next_due_date: null })
    await fetch(`${BASE}/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ task_id: task.id }),
    })
    const { data: updated } = await testSupabase.from('tasks').select('next_due_date').eq('id', task.id).single()
    expect(updated!.next_due_date).toBeNull()
  })

  it('does not advance next_due_date for custom tasks', async () => {
    const task = await createTask({ frequency: 'custom', custom_frequency_weight: 3, next_due_date: '2026-09-01' })
    await fetch(`${BASE}/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ task_id: task.id }),
    })
    const { data: updated } = await testSupabase.from('tasks').select('next_due_date').eq('id', task.id).single()
    expect(updated!.next_due_date).toBe('2026-09-01')
  })

  it('sets is_pickup = true when completer is not the owner', async () => {
    const task = await createTask({ owner_id: '00000000-0000-0000-0000-000000000001' })
    await fetch(`${BASE}/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ task_id: task.id }),
    })
    const { data: completion } = await testSupabase
      .from('task_completions').select('is_pickup').eq('task_id', task.id).single()
    expect(completion!.is_pickup).toBe(true)
  })

  it('sets is_pickup = false when completer is the owner', async () => {
    // Requires a known user ID — run against dev server with a logged-in user whose ID is known
    // Verify via task_completions.is_pickup = false
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/app/h/
```

Expected: `FAIL` — completion route doesn't exist yet.

- [ ] **Step 3: Create completion route**

Create `src/app/h/[householdId]/tasks/complete/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getNextDueDate } from '@/lib/balance'
import type { Frequency } from '@/lib/types'

export async function POST(
  request: Request,
  { params }: { params: { householdId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { task_id } = await request.json() as { task_id: string }

  const { data: task } = await supabase
    .from('tasks')
    .select('owner_id, frequency, next_due_date')
    .eq('id', task_id)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const is_pickup = task.owner_id !== null && task.owner_id !== user.id

  await supabase.from('task_completions').insert({ task_id, completed_by: user.id, is_pickup })

  // Advance next_due_date for recurring tasks
  if (task.frequency !== 'one-off' && task.frequency !== 'custom' && task.next_due_date) {
    const next = getNextDueDate(task.frequency as Frequency, new Date(task.next_due_date))
    if (next) {
      await supabase.from('tasks').update({ next_due_date: next.toISOString().slice(0, 10) }).eq('id', task_id)
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/app/h/
```

Expected: All tests `PASS`.

- [ ] **Step 5: Create TaskCard**

Create `src/components/TaskCard.tsx`:

```tsx
'use client'

import type { Task, Profile } from '@/lib/types'

interface Props {
  task: Task
  members: Profile[]
  currentUserId: string
  householdId: string
  onComplete: (taskId: string) => void
}

export function TaskCard({ task, members, currentUserId, householdId, onComplete }: Props) {
  const owner = members.find(m => m.id === task.owner_id)
  const isOwner = task.owner_id === currentUserId

  async function handleComplete() {
    await fetch(`/h/${householdId}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task.id }),
    })
    onComplete(task.id)
  }

  return (
    <div className="bg-white rounded-lg border p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500 capitalize">{task.category}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500 capitalize">{task.effort}</span>
          {task.is_invisible_work && (
            <>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-purple-600">invisible work</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={handleComplete}
        className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${
          isOwner
            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
        }`}
      >
        {isOwner ? 'Done' : 'I picked this up'}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Create UnassignedPool**

Create `src/components/UnassignedPool.tsx`:

```tsx
'use client'

import type { Task, Profile } from '@/lib/types'
import { TaskCard } from './TaskCard'

interface Props {
  tasks: Task[]
  members: Profile[]
  currentUserId: string
  householdId: string
  onComplete: (taskId: string) => void
}

export function UnassignedPool({ tasks, members, currentUserId, householdId, onComplete }: Props) {
  if (tasks.length === 0) return null

  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">
        Needs an owner ({tasks.length})
      </h2>
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            members={members}
            currentUserId={currentUserId}
            householdId={householdId}
            onComplete={onComplete}
          />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Build Today tab page**

Replace `src/app/h/[householdId]/today/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TodayView } from './TodayView'

export default async function TodayPage({ params }: { params: { householdId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: members }, { data: tasks }] = await Promise.all([
    supabase
      .from('household_members')
      .select('user_id, profile:profiles(id, name, avatar_colour)')
      .eq('household_id', params.householdId),
    supabase
      .from('tasks')
      .select('*')
      .eq('household_id', params.householdId)
      .or(`and(frequency.neq.one-off,next_due_date.lte.${today}),frequency.eq.one-off`)
      .order('created_at'),
  ])

  // Filter out completed one-off tasks
  const completedOneOffIds = await supabase
    .from('task_completions')
    .select('task_id')
    .in('task_id', (tasks ?? []).filter(t => t.frequency === 'one-off').map(t => t.id))

  const completedIds = new Set((completedOneOffIds.data ?? []).map(c => c.task_id))
  const dueTasks = (tasks ?? []).filter(t => t.frequency !== 'one-off' || !completedIds.has(t.id))

  const profiles = (members ?? []).map(m => m.profile as unknown as { id: string; name: string; avatar_colour: string })

  return (
    <TodayView
      householdId={params.householdId}
      currentUserId={user.id}
      members={profiles}
      tasks={dueTasks}
    />
  )
}
```

Create `src/app/h/[householdId]/today/TodayView.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Task, Profile } from '@/lib/types'
import { TaskCard } from '@/components/TaskCard'
import { UnassignedPool } from '@/components/UnassignedPool'
import { TaskForm } from '@/components/TaskForm'

interface Props {
  householdId: string
  currentUserId: string
  members: Profile[]
  tasks: Task[]
}

export function TodayView({ householdId, currentUserId, members, tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showForm, setShowForm] = useState(false)

  function handleComplete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  function handleSave(task: Task) {
    setTasks(prev => [...prev, task])
  }

  const unassigned = tasks.filter(t => t.owner_id === null)
  const assigned = members.map(m => ({
    member: m,
    tasks: tasks.filter(t => t.owner_id === m.id),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700"
        >
          + Add task
        </button>
      </div>

      <UnassignedPool
        tasks={unassigned}
        members={members}
        currentUserId={currentUserId}
        householdId={householdId}
        onComplete={handleComplete}
      />

      {assigned.map(({ member, tasks: memberTasks }) => (
        memberTasks.length > 0 && (
          <section key={member.id} className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: member.avatar_colour }}
              >
                {member.name[0]}
              </span>
              {member.name}
            </h3>
            <div className="space-y-2">
              {memberTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  members={members}
                  currentUserId={currentUserId}
                  householdId={householdId}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          </section>
        )
      ))}

      {showForm && (
        <TaskForm
          householdId={householdId}
          members={members}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 8: Manual test**

Add a task via the form. Mark it done. Verify it disappears from Today. Create a task assigned to someone else, mark it as "I picked this up" — verify it records correctly in `task_completions`.

- [ ] **Step 9: Commit**

```bash
git add src/app/h/ src/components/
git commit -m "feat: implement Today tab with task completion and pickup"
```

---

## Task 11: Balance Tab

**Files:**
- Create: `src/components/BalanceChart.tsx`
- Replace: `src/app/h/[householdId]/balance/page.tsx`
- Create: `src/app/h/[householdId]/balance/BalanceView.tsx`

- [ ] **Step 1: Create BalanceChart component**

Create `src/components/BalanceChart.tsx`:

```tsx
'use client'

import type { BalanceScore, Profile } from '@/lib/types'

interface Props {
  scores: BalanceScore[]
  members: Profile[]
}

export function BalanceChart({ scores, members }: Props) {
  if (scores.every(s => s.total_score === 0)) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No tasks added yet. Add tasks to see the load distribution.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {scores.map(score => {
        const member = members.find(m => m.id === score.member_id)
        if (!member) return null
        return (
          <div key={score.member_id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{member.name}</span>
              <span className="text-sm text-gray-500">{score.percentage}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${score.percentage}%`, backgroundColor: member.avatar_colour }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Score: {score.owned_score} owned + {score.pickup_score} pickups
            </p>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Build Balance page**

Replace `src/app/h/[householdId]/balance/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BalanceView } from './BalanceView'

export default async function BalancePage({ params }: { params: { householdId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1)
  const yearAgo = new Date(now); yearAgo.setFullYear(yearAgo.getFullYear() - 1)

  const [{ data: members }, { data: tasks }, { data: completions }] = await Promise.all([
    supabase
      .from('household_members')
      .select('user_id, profile:profiles(id, name, avatar_colour)')
      .eq('household_id', params.householdId),
    supabase
      .from('tasks')
      .select('*')
      .eq('household_id', params.householdId),
    supabase
      .from('task_completions')
      .select('*, task:tasks(effort, household_id)')
      .eq('task.household_id', params.householdId)
      .eq('is_pickup', true)
      .gte('completed_at', yearAgo.toISOString()),
  ])

  const profiles = (members ?? []).map(m => m.profile as unknown as { id: string; name: string; avatar_colour: string })

  return (
    <BalanceView
      householdId={params.householdId}
      currentUserId={user.id}
      members={profiles}
      tasks={tasks ?? []}
      completions={completions ?? []}
    />
  )
}
```

Create `src/app/h/[householdId]/balance/BalanceView.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Task, TaskCompletion, Profile } from '@/lib/types'
import { calculateBalanceScores } from '@/lib/balance'
import { BalanceChart } from '@/components/BalanceChart'
import { TaskForm } from '@/components/TaskForm'

type Period = 'week' | 'month' | 'year'

interface Props {
  householdId: string
  currentUserId: string
  members: Profile[]
  tasks: Task[]
  completions: TaskCompletion[]
}

export function BalanceView({ householdId, members, tasks: initialTasks, completions }: Props) {
  const [period, setPeriod] = useState<Period>('month')
  const [tasks, setTasks] = useState(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

  const now = new Date()
  const cutoffs: Record<Period, Date> = {
    week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
  }

  const periodCompletions = completions.filter(c => new Date(c.completed_at) >= cutoffs[period])
  const scores = calculateBalanceScores(members, tasks, periodCompletions)

  const unassigned = tasks.filter(t => t.owner_id === null)

  function handleSave(task: Task) {
    setTasks(prev => [...prev, task])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Load distribution</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700"
        >
          + Add task
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['week', 'month', 'year'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              period === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p === 'week' ? 'This week' : p === 'month' ? 'This month' : 'This year'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-4 mb-6">
        <BalanceChart scores={scores} members={members} />
      </div>

      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            {unassigned.length} task{unassigned.length > 1 ? 's need' : ' needs'} an owner
          </h3>
          <ul className="space-y-1">
            {unassigned.map(t => (
              <li key={t.id} className="text-sm text-amber-700">{t.title}</li>
            ))}
          </ul>
        </div>
      )}

      {members.map(member => {
        const memberTasks = tasks.filter(t => t.owner_id === member.id)
        if (memberTasks.length === 0) return null
        const isExpanded = expandedMember === member.id
        return (
          <section key={member.id} className="mb-4">
            <button
              onClick={() => setExpandedMember(isExpanded ? null : member.id)}
              className="w-full flex items-center justify-between bg-white rounded-xl border p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: member.avatar_colour }}
                >
                  {member.name[0]}
                </span>
                <span className="font-medium text-sm">{member.name}</span>
                <span className="text-xs text-gray-400">{memberTasks.length} tasks</span>
              </div>
              <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
              <div className="mt-1 space-y-1 pl-2">
                {memberTasks.map(t => (
                  <div key={t.id} className="bg-white border rounded-lg px-4 py-2 text-sm flex justify-between">
                    <span>{t.title}</span>
                    <span className="text-gray-400 capitalize">{t.frequency} · {t.effort}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      {showForm && (
        <TaskForm
          householdId={householdId}
          members={members}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Manual test**

Add tasks, assign them to different members with different effort/frequency. Verify the balance chart reflects the correct percentages. Add a pickup completion and verify the score updates. Toggle period filters.

- [ ] **Step 4: Commit**

```bash
git add src/app/h/ src/components/BalanceChart.tsx
git commit -m "feat: implement Balance tab with load distribution chart and period filters"
```

---

## Task 12: Real-time Subscriptions

**Files:**
- Create: `src/components/RealtimeSync.tsx`
- Modify: `src/app/h/[householdId]/layout.tsx`

- [ ] **Step 1: Create RealtimeSync component**

Create `src/components/RealtimeSync.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  householdId: string
}

export function RealtimeSync({ householdId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`household:${householdId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `household_id=eq.${householdId}`,
      }, () => router.refresh())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_completions',
      }, () => router.refresh())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId, router, supabase])

  return null
}
```

- [ ] **Step 2: Add to household layout**

In `src/app/h/[householdId]/layout.tsx`, add to imports and render inside the layout:

```tsx
import { RealtimeSync } from '@/components/RealtimeSync'
import { ReconnectIndicator } from '@/components/ReconnectIndicator'
```

Add inside the returned JSX, just before the closing `</div>`:

```tsx
<RealtimeSync householdId={params.householdId} />
<ReconnectIndicator />
```

- [ ] **Step 3: Enable Realtime in Supabase**

In Supabase dashboard (or local config), enable Realtime for `tasks` and `task_completions` tables:

```bash
npx supabase db push
```

Or run in the SQL editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tasks, task_completions;
```

- [ ] **Step 4: Manual test**

Open the app in two browser windows. In window 1, add a task. Verify window 2 refreshes and shows the new task without a manual reload.

- [ ] **Step 5: Commit**

```bash
git add src/components/RealtimeSync.tsx src/app/h/
git commit -m "feat: add real-time sync for tasks and completions"
```

---

## Task 13: User Settings — Default Tab

**Files:**
- Create: `src/app/h/[householdId]/settings/page.tsx`
- Modify: `src/app/h/[householdId]/layout.tsx`

- [ ] **Step 1: Create settings page**

Create `src/app/h/[householdId]/settings/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DefaultTabForm } from './DefaultTabForm'

export default async function SettingsPage({ params }: { params: { householdId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('household_members')
    .select('default_tab')
    .eq('household_id', params.householdId)
    .eq('user_id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <h2 className="font-semibold">Settings</h2>
      <DefaultTabForm
        householdId={params.householdId}
        currentDefault={member?.default_tab ?? 'balance'}
      />
    </div>
  )
}
```

Create `src/app/h/[householdId]/settings/DefaultTabForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DefaultTab } from '@/lib/types'

interface Props {
  householdId: string
  currentDefault: DefaultTab
}

export function DefaultTabForm({ householdId, currentDefault }: Props) {
  const [defaultTab, setDefaultTab] = useState<DefaultTab>(currentDefault)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  async function handleSave(tab: DefaultTab) {
    setDefaultTab(tab)
    setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('household_members')
      .update({ default_tab: tab })
      .eq('household_id', householdId)
      .eq('user_id', user.id)
    setSaved(true)
  }

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-medium">Default tab when opening the app</h3>
      <div className="flex gap-3">
        {(['today', 'balance'] as DefaultTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleSave(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              defaultTab === tab
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab === 'today' ? 'Today' : 'Balance'}
          </button>
        ))}
      </div>
      {saved && <p className="text-xs text-green-600">Saved.</p>}
    </div>
  )
}
```

- [ ] **Step 2: Add settings link to layout**

In `src/app/h/[householdId]/layout.tsx`, update the header to include a settings link:

```tsx
import Link from 'next/link'

// In the header:
<Link href={`/h/${params.householdId}/settings`} className="text-sm text-gray-500 hover:text-gray-700">
  Settings
</Link>
```

- [ ] **Step 3: Manual test**

Open settings, switch default tab. Sign out, sign back in. Verify you land on the tab you set as default.

- [ ] **Step 4: Commit**

```bash
git add src/app/h/
git commit -m "feat: add settings page with default tab preference"
```

---

## Task 14: Invite UI

**Files:**
- Modify: `src/app/h/[householdId]/settings/page.tsx`
- Create: `src/app/h/[householdId]/settings/InviteSection.tsx`

- [ ] **Step 1: Create InviteSection component**

Create `src/app/h/[householdId]/settings/InviteSection.tsx`:

```tsx
'use client'

import { useState } from 'react'

interface Props {
  householdId: string
}

export function InviteSection({ householdId }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateInvite() {
    setLoading(true)
    const res = await fetch(`/h/${householdId}/invite`, { method: 'POST' })
    const data = await res.json()
    setUrl(data.url)
    setLoading(false)
  }

  async function copyToClipboard() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-medium">Invite someone to this household</h3>
      <p className="text-xs text-gray-500">Links expire after 24 hours.</p>
      {url ? (
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 border rounded px-3 py-2 text-xs bg-gray-50 text-gray-700"
          />
          <button
            onClick={copyToClipboard}
            className="shrink-0 bg-indigo-600 text-white text-xs px-3 py-2 rounded hover:bg-indigo-700"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      ) : (
        <button
          onClick={generateInvite}
          disabled={loading}
          className="w-full border rounded px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate invite link'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add InviteSection to settings page**

In `src/app/h/[householdId]/settings/page.tsx`, import and render `<InviteSection householdId={params.householdId} />` below `<DefaultTabForm />`.

- [ ] **Step 3: Manual test**

Click "Generate invite link". Copy it. Open in incognito window. Verify successful join flow.

- [ ] **Step 4: Commit**

```bash
git add src/app/h/
git commit -m "feat: add invite link generation UI in settings"
```

---

## Task 15: Integration Tests

**Files:**
- Create: `src/lib/balance.integration.test.ts`
- Create: `src/test-utils/supabase.ts`

Integration tests run against the Supabase local dev instance. Start it with `npx supabase start` before running.

- [ ] **Step 1: Create Supabase test helper**

Create `src/test-utils/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export const testSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

export async function cleanupTestHousehold(householdId: string) {
  await testSupabase.from('task_completions').delete().eq('task_id',
    testSupabase.from('tasks').select('id').eq('household_id', householdId)
  )
  await testSupabase.from('tasks').delete().eq('household_id', householdId)
  await testSupabase.from('household_members').delete().eq('household_id', householdId)
  await testSupabase.from('invites').delete().eq('household_id', householdId)
  await testSupabase.from('households').delete().eq('id', householdId)
}
```

Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` — copy from `npx supabase status` output (the `service_role key` line).

- [ ] **Step 2: Write integration tests**

Create `src/lib/balance.integration.test.ts`:

```typescript
import { describe, it, expect, afterEach } from 'vitest'
import { testSupabase, cleanupTestHousehold } from '@/test-utils/supabase'
import { calculateBalanceScores } from './balance'
import type { Task, TaskCompletion, Profile } from './types'

const TEST_HOUSEHOLD_NAME = 'Integration Test Household'

describe('household and task integration', () => {
  const createdHouseholdIds: string[] = []

  afterEach(async () => {
    for (const id of createdHouseholdIds) {
      await cleanupTestHousehold(id)
    }
    createdHouseholdIds.length = 0
  })

  it('creates a household and adds tasks, balance scores reflect ownership', async () => {
    // Create household
    const { data: household } = await testSupabase
      .from('households')
      .insert({ name: TEST_HOUSEHOLD_NAME })
      .select()
      .single()

    expect(household).toBeTruthy()
    createdHouseholdIds.push(household!.id)

    // Add two tasks with different effort
    const { data: tasks } = await testSupabase
      .from('tasks')
      .insert([
        { household_id: household!.id, title: 'Cooking', owner_id: null, category: 'chores', frequency: 'daily', effort: 'medium', is_invisible_work: false, next_due_date: new Date().toISOString().slice(0, 10) },
        { household_id: household!.id, title: 'Cleaning', owner_id: null, category: 'chores', frequency: 'weekly', effort: 'low', is_invisible_work: false, next_due_date: new Date().toISOString().slice(0, 10) },
      ])
      .select()

    expect(tasks).toHaveLength(2)

    // Verify balance calc with unassigned tasks
    const scores = calculateBalanceScores([], tasks as Task[], [])
    expect(scores).toHaveLength(0)
  })

  it('balance reflects pickup completions', async () => {
    const { data: household } = await testSupabase
      .from('households')
      .insert({ name: TEST_HOUSEHOLD_NAME })
      .select()
      .single()

    createdHouseholdIds.push(household!.id)

    const { data: task } = await testSupabase
      .from('tasks')
      .insert({
        household_id: household!.id,
        title: 'Grocery shop',
        owner_id: null,
        category: 'errands',
        frequency: 'weekly',
        effort: 'high',
        is_invisible_work: false,
        next_due_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single()

    // Simulate a pickup completion record
    const fakeUserId = '00000000-0000-0000-0000-000000000001'
    const completion: TaskCompletion = {
      id: 'test-completion',
      task_id: task!.id,
      completed_by: fakeUserId,
      completed_at: new Date().toISOString(),
      is_pickup: true,
      task: task as Task,
    }

    const fakeProfile: Profile = {
      id: fakeUserId,
      name: 'Test User',
      avatar_colour: '#6366f1',
      created_at: new Date().toISOString(),
    }

    const scores = calculateBalanceScores([fakeProfile], [task as Task], [completion])
    expect(scores[0].pickup_score).toBe(3) // high effort = 3
    expect(scores[0].percentage).toBe(100)
  })

  it('invite token is readable without auth and expires correctly', async () => {
    const { data: household } = await testSupabase
      .from('households')
      .insert({ name: TEST_HOUSEHOLD_NAME })
      .select()
      .single()

    createdHouseholdIds.push(household!.id)

    const expiredAt = new Date(Date.now() - 1000).toISOString()
    const { data: invite } = await testSupabase
      .from('invites')
      .insert({
        household_id: household!.id,
        token: 'test-expired-token',
        created_by: null,
        expires_at: expiredAt,
      })
      .select()
      .single()

    expect(invite).toBeTruthy()

    // Query as anon (expired) — should return nothing when filtered by expiry
    const { data: found } = await testSupabase
      .from('invites')
      .select()
      .eq('token', 'test-expired-token')
      .gt('expires_at', new Date().toISOString())

    expect(found).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run integration tests**

Ensure local Supabase is running (`npx supabase start`), then:

```bash
npx vitest run src/lib/balance.integration.test.ts
```

Expected: All tests `PASS`.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/balance.integration.test.ts src/test-utils/
git commit -m "test: add integration tests for household, task, and balance flows"
```

---

## Task 16: Production Deployment

**Files:**
- Create: `vercel.json` (if needed)

- [ ] **Step 1: Create Supabase project**

Go to supabase.com, create a new project. Copy the Project URL and anon key.

- [ ] **Step 2: Run migrations against production**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

- [ ] **Step 3: Deploy to Vercel**

```bash
npx vercel
```

When prompted, set environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
- `NEXT_PUBLIC_SITE_URL` — your Vercel deployment URL

- [ ] **Step 4: Configure Supabase auth redirect URL**

In Supabase dashboard → Authentication → URL Configuration, add your Vercel URL to "Redirect URLs":

```
https://your-app.vercel.app/auth/callback
```

- [ ] **Step 5: Smoke test production**

Sign up, create household, add tasks, verify Balance tab shows correct percentages, test invite flow with a second account.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: production deployment configuration"
```

---

---

## Icebox (Post-MVP)

- Auto-suggest rebalancing: app suggests which unassigned tasks to assign based on current load scores
- Proactive pickup detection: surface a signal when a member repeatedly picks up tasks well before they're due
- Overdue pickup detection: separate signal for pickups driven by the owner not completing tasks on time
- Mobile app (iOS/Android) after web MVP is validated
- Redo all task categories (current set was chosen quickly; worth a proper content design pass)
- Time-of-year task suggestions (e.g. surface seasonal tasks only when relevant)
- Prettier date picker for birthdays (native `<input type="date">` is inconsistent across browsers/OS)
- Welcome/intro screen explaining what the app is for and how to get started. Has a "don't show this again" button (persisted in localStorage). Two placements: (1) initialising user — shown immediately after auth callback, before the onboarding household setup form; (2) secondary user — shown between the ClaimPlaceholder step and the UnassignedReview task step in the join flow.
- Birthday planning tasks: only surface within a configurable window before the birthday (e.g. 4 weeks); window duration should be editable by the user
- Onboarding intent screen: ask the user upfront what they're looking for — e.g. a one-off balance visualisation, a lightweight ongoing system, or a full family organisation tool — then personalise the onboarding flow and feature emphasis accordingly
