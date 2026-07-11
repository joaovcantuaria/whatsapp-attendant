# Implementation Plan: Supervisor Dashboard

## Overview

Implement a supervisor/admin panel for monitoring agent performance in the BoraGerir Conversas WhatsApp platform. The implementation extends the existing conversation store with agent filtering, adds a new API route with server-side metrics computation, and creates a dedicated Supervisor Dashboard page with performance metrics, real-time agent monitoring, and workload visualization.

## Tasks

- [ ] 1. Extend conversation store and add Agent Filter to conversation list
  - [ ] 1.1 Extend `store/conversation-store.ts` with `agentFilter` state
    - Add `agentFilter: string | 'all'` field and `setAgentFilter` setter to the `ConversationStore` interface
    - Initialize `agentFilter` to `'all'`
    - _Requirements: 1.2, 1.3_

  - [ ] 1.2 Create `components/chat/agent-filter.tsx` component
    - Create a dropdown select component using `@radix-ui/react-select`
    - Fetch agents list using the existing `useAgents` hook from `hooks/use-agents.ts`
    - Display "Todos os agentes" as default option plus each active agent by name
    - On selection, call `setAgentFilter` from the conversation store
    - Ensure the component is visible to all authenticated users regardless of role
    - _Requirements: 1.1, 1.6_

  - [ ] 1.3 Integrate Agent Filter into `components/chat/conversation-list.tsx`
    - Import and render `AgentFilter` component in the header section (below search, above tabs)
    - Read `agentFilter` from the conversation store
    - Apply agent filter to `filteredConversations` logic: if `agentFilter !== 'all'`, filter where `conv.agent_id === agentFilter`
    - Ensure combined filtering works with existing status filter and search query
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.4 Write property test for combined filter correctness
    - **Property 1: Combined filter correctness**
    - Generate arbitrary arrays of conversation objects with random agent_ids, statuses, and contact names/phones
    - Apply all three filters (agent, status, search) and assert every result satisfies ALL predicates simultaneously
    - Use `fast-check` library
    - **Validates: Requirements 1.2, 1.4**

- [ ] 2. Create Supervisor API route with metrics computation
  - [ ] 2.1 Create `/api/supervisor/route.ts` with authentication and role guard
    - Create `app/api/supervisor/route.ts` with a GET handler
    - Validate session using `createServerSupabaseClient` (return 401 if unauthenticated)
    - Query `company_members` table to verify user has "admin" or "owner" role (return 403 if not)
    - Accept `period` query parameter (`today` | `week` | `month`, default `today`)
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ] 2.2 Implement metrics computation logic in the supervisor route
    - Create helper functions: `getPeriodStart(period)` returning ISO date for start of today/week/month
    - Query `agents` table for the company to get all active agents
    - Query `conversations` table filtered by `created_at >= periodStart` and grouped by `agent_id` for total counts
    - Query `messages` table to compute average response time per agent (first outbound timestamp minus preceding inbound timestamp)
    - Compute resolution rate per agent: `(closed / total) * 100`
    - Compute average daily conversations: `total / daysInPeriod` (minimum 1 day)
    - Return `SupervisorMetricsResponse` shape with agents sorted by total conversation count descending
    - _Requirements: 3.1, 3.2, 3.4, 4.1, 4.2, 4.4, 4.5, 5.1, 5.2, 5.4, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.3 Write property test for authorization enforcement
    - **Property 2: Authorization enforcement**
    - Generate arbitrary auth states (unauthenticated, agent role, admin role, owner role) and assert correct HTTP status codes (401, 403, 200)
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [ ]* 2.4 Write property tests for metrics formulas
    - **Property 3: Average daily conversations formula** — For any total T and days D ≥ 1, verify result equals T/D and T=0 yields 0
    - **Property 4: Response time calculation** — For arbitrary sets of inbound/outbound timestamp pairs, verify mean of differences
    - **Property 5: Resolution rate formula** — For any closed count and total count, verify (closed/total)*100 when total > 0, and 0 when total = 0
    - **Validates: Requirements 3.2, 3.4, 4.2, 4.5, 5.2, 5.4**

- [ ] 3. Checkpoint - Ensure API and store changes work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Create Supervisor Dashboard page and hooks
  - [ ] 4.1 Create `hooks/use-supervisor-metrics.ts` hook
    - Create a custom hook that fetches from `/api/supervisor?period={period}`
    - Accept `period` parameter (`'today' | 'week' | 'month'`)
    - Return `{ data: SupervisorMetricsResponse | null, isLoading: boolean, error: string | null, refetch: () => void }`
    - Use `useState` and `useEffect` pattern matching existing hooks (e.g., `use-conversations.ts`)
    - _Requirements: 3.1, 3.3, 6.3_

  - [ ] 4.2 Create `hooks/use-supervisor-realtime.ts` hook
    - Create a custom hook that subscribes to Supabase Realtime `postgres_changes` on `agents` (UPDATE on `is_online`) and `conversations` (INSERT, UPDATE on `agent_id`, `status`)
    - Maintain state: `RealtimeAgent[]` with each agent's `activeConversations`
    - Compute `WorkloadDataPoint[]` from active conversation counts
    - Implement fallback: if subscription fails, poll every 30 seconds and show a warning toast
    - Clean up subscriptions on unmount
    - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2_

  - [ ] 4.3 Create `app/(dashboard)/dashboard/supervisor/page.tsx` with role guard
    - Create the page component
    - Check user role from `useAuthStore` — if role is not "admin" or "owner", redirect to `/dashboard` using `useRouter`
    - Add a time period selector (tabs or select: "Hoje", "Esta Semana", "Este Mês")
    - Use `useSupervisorMetrics` hook with selected period
    - Render `PerformancePanel` and `RealtimeView` components in a grid layout
    - _Requirements: 2.1, 2.2, 6.2_

- [ ] 5. Create Supervisor UI components
  - [ ] 5.1 Create `components/supervisor/performance-panel.tsx`
    - Accept `AgentMetrics[]` and loading state as props
    - Render a table/card grid with each agent showing: avatar, name, online status indicator, total conversations, avg daily conversations, avg response time (or "--"), resolution rate percentage
    - Display agents sorted by total conversation count descending (data arrives pre-sorted from API)
    - Show empty state when no agents exist
    - Show loading skeletons while data is fetching
    - _Requirements: 3.1, 4.1, 4.4, 5.1, 5.4, 6.1, 6.4_

  - [ ]* 5.2 Write property test for agent sorting invariant
    - **Property 6: Agent sorting by conversation count**
    - Generate arbitrary lists of agent metrics and verify they are displayed in descending order of `totalConversations`
    - **Validates: Requirements 6.4**

  - [ ] 5.3 Create `components/supervisor/realtime-view.tsx`
    - Accept `RealtimeAgent[]` data, online/offline counts as props
    - Display online/offline agent count badges at the top
    - Group active conversations by agent, showing each agent's name, avatar, online indicator, and their conversation list (contact name, status badge, time since last message using `date-fns`)
    - Show "Não atribuídas" group for conversations with null `agent_id`
    - _Requirements: 7.1, 7.3, 7.4, 8.1, 8.4, 8.5_

  - [ ]* 5.4 Write property tests for realtime view logic
    - **Property 7: Online/offline count invariant** — For any set of agents, verify online + offline = total and online count equals agents where `is_online = true`
    - **Property 8: Conversation grouping by agent** — For any set of active conversations, verify each appears in exactly one group (assigned agent or "Unassigned")
    - **Validates: Requirements 7.3, 8.1, 8.4**

  - [ ] 5.5 Create `components/supervisor/workload-chart.tsx`
    - Accept `WorkloadDataPoint[]` as props
    - Render a Recharts `BarChart` with `Bar` component showing `activeCount` per agent
    - Apply distinct fill color (e.g., red/orange) to bars where `isOverloaded === true`
    - Add chart legend explaining the overload threshold (> 1.5× average)
    - Handle empty state gracefully
    - _Requirements: 9.1, 9.3, 9.4_

  - [ ]* 5.6 Write property test for overload threshold
    - **Property 9: Overload threshold highlighting**
    - Generate arbitrary arrays of agent conversation counts and verify that an agent is marked overloaded iff `count > average * 1.5`
    - **Validates: Requirements 9.4**

- [ ] 6. Add Supervisor navigation item to sidebar
  - [ ] 6.1 Modify `components/shared/sidebar.tsx` to conditionally show Supervisor nav item
    - Import `Shield` or `BarChart3` icon from `lucide-react` for the Supervisor item
    - Read `agent?.role` from `useAuthStore`
    - Conditionally render a "Supervisor" nav item (href: `/dashboard/supervisor`) only when role is "admin"
    - Note: The `Agent` type has `role: AgentRole` which is `'admin' | 'agent'`; the owner check should also verify `company_members` role via the `useCompany` hook or the auth store
    - Place the Supervisor item after "Chat Interno" in the navigation order
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 7. Final checkpoint - Ensure all components are wired together
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript with Next.js 14 App Router, Zustand for state, Supabase for backend, and Recharts for charts
- Existing patterns (`use-conversations.ts`, `conversation-store.ts`, `sidebar.tsx`) should be followed closely
- `fast-check` will need to be installed as a dev dependency along with a test runner (e.g., vitest) if not already present

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "4.1"] },
    { "id": 2, "tasks": ["1.3", "2.3", "2.4", "4.2"] },
    { "id": 3, "tasks": ["1.4", "4.3"] },
    { "id": 4, "tasks": ["5.1", "5.3", "5.5", "6.1"] },
    { "id": 5, "tasks": ["5.2", "5.4", "5.6"] }
  ]
}
```
