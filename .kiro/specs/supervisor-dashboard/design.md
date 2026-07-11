# Design Document: Supervisor Dashboard

## Overview

The Supervisor Dashboard provides admin and owner users of BoraGerir Conversas with a dedicated panel to monitor agent performance in real time. It introduces:

1. An **Agent Filter** dropdown in the existing conversation list, allowing any user to filter by assigned agent.
2. A **Supervisor Dashboard page** (`/dashboard/supervisor`) accessible only to admin/owner roles, containing:
   - A Performance Panel with metrics (average daily conversations, average response time, resolution rate, total conversations) per agent with configurable time periods.
   - A Real-Time View showing agent online status, conversation assignments grouped by agent, and workload distribution via a bar chart.
3. A new **API route** (`/api/supervisor`) to compute and serve supervisor-specific metrics with server-side role validation.
4. **Supabase Realtime subscriptions** for live updates to agent status, conversation assignments, and workload.
5. A **Supervisor nav item** in the sidebar, conditionally rendered for admin/owner roles.

## Architecture

The feature follows the existing app architecture patterns:

```mermaid
graph TB
    subgraph "Client (Next.js App Router)"
        A[Sidebar] -->|conditional render| B[Supervisor Nav Item]
        C[ConversationList] -->|new dropdown| D[Agent Filter]
        E[SupervisorPage] --> F[PerformancePanel]
        E --> G[RealtimeView]
        G --> H[WorkloadChart]
    end

    subgraph "API Routes"
        I[/api/supervisor GET] -->|auth + role check| J[Metrics Computation]
    end

    subgraph "Data Layer (Supabase)"
        K[(agents)]
        L[(conversations)]
        M[(messages)]
        N[(company_members)]
    end

    subgraph "Realtime"
        O[Supabase Realtime] -->|postgres_changes| P[agents table]
        O -->|postgres_changes| Q[conversations table]
    end

    E -->|fetch| I
    J --> K
    J --> L
    J --> M
    J --> N
    G -->|subscribe| O
    D -->|client-side filter| L
```

**Key Design Decisions:**

1. **Server-side metrics computation** — Complex aggregations (response time, resolution rate) are calculated on the API route to avoid heavy client-side processing and to enforce access control.
2. **Client-side agent filtering** — The agent filter in the conversation list operates on already-fetched conversations client-side (matching the existing pattern in `use-conversations.ts`) with an optional server-side `agent_id` query param for future optimization.
3. **Zustand store extension** — The existing `conversation-store.ts` is extended with an `agentFilter` field to maintain the agent filter state.
4. **Supabase Realtime for live data** — Subscriptions to `agents` and `conversations` tables provide the real-time updates without polling.

## Components and Interfaces

### New Components

| Component | Path | Responsibility |
|-----------|------|----------------|
| `SupervisorPage` | `app/(dashboard)/dashboard/supervisor/page.tsx` | Page shell with role guard, time period selector, and layout |
| `PerformancePanel` | `components/supervisor/performance-panel.tsx` | Displays agent metrics table (avg daily convos, response time, resolution rate, total) |
| `RealtimeView` | `components/supervisor/realtime-view.tsx` | Live agent status, conversation grouping, workload chart |
| `WorkloadChart` | `components/supervisor/workload-chart.tsx` | Recharts bar chart for workload distribution |
| `AgentFilter` | `components/chat/agent-filter.tsx` | Dropdown select for filtering conversations by agent |

### Modified Components

| Component | Modification |
|-----------|-------------|
| `components/chat/conversation-list.tsx` | Add `AgentFilter` component and apply agent filter to displayed conversations |
| `components/shared/sidebar.tsx` | Add conditional "Supervisor" nav item for admin/owner roles |
| `store/conversation-store.ts` | Add `agentFilter` state field |

### New API Route

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/supervisor` | GET | admin/owner only | Returns agent performance metrics for specified time period |

### New Hook

| Hook | Path | Responsibility |
|------|------|----------------|
| `useSupervisorMetrics` | `hooks/use-supervisor-metrics.ts` | Fetches metrics from `/api/supervisor` with time period param |
| `useSupervisorRealtime` | `hooks/use-supervisor-realtime.ts` | Manages Supabase Realtime subscriptions for agents and conversations |

## Data Models

### SupervisorMetrics (API Response)

```typescript
interface AgentMetrics {
  agentId: string
  agentName: string
  avatarUrl: string | null
  isOnline: boolean
  totalConversations: number
  avgDailyConversations: number
  avgResponseTimeMinutes: number | null  // null when no outbound messages
  resolutionRate: number  // percentage 0-100
}

interface SupervisorMetricsResponse {
  agents: AgentMetrics[]
  period: 'today' | 'week' | 'month'
  periodStart: string  // ISO date
  periodEnd: string    // ISO date
  totalOnline: number
  totalOffline: number
}
```

### RealtimeAgentData (Client State)

```typescript
interface RealtimeAgent {
  id: string
  name: string
  avatarUrl: string | null
  isOnline: boolean
  activeConversations: RealtimeConversation[]
}

interface RealtimeConversation {
  id: string
  contactName: string
  status: ConversationStatus
  lastMessageAt: string | null
}

interface WorkloadDataPoint {
  agentName: string
  activeCount: number
  isOverloaded: boolean  // count > team average * 1.5
}
```

### Conversation Store Extension

```typescript
interface ConversationStore {
  // ... existing fields
  agentFilter: string | 'all'  // agent ID or 'all'
  setAgentFilter: (agentId: string | 'all') => void
}
```

### API Query Parameters

```
GET /api/supervisor?period=today|week|month
```

### Time Period Calculation Logic

| Period | Start | End |
|--------|-------|-----|
| `today` | Start of current day (00:00:00 local) | Now |
| `week` | Monday 00:00:00 of current week | Now |
| `month` | 1st day 00:00:00 of current month | Now |

### Metrics Formulas

- **Average Daily Conversations** = `totalConversations / daysInPeriod`
- **Average Response Time** = `sum(first_outbound_timestamp - preceding_inbound_timestamp) / count` for conversations with both inbound and outbound messages
- **Resolution Rate** = `(closedConversations / totalConversations) * 100`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Combined filter correctness

*For any* set of conversations and any combination of agent filter, status filter, and search query applied simultaneously, every conversation in the filtered result SHALL satisfy ALL active filter predicates (matching agent_id, matching status, and matching search term in contact name or phone).

**Validates: Requirements 1.2, 1.4**

### Property 2: Authorization enforcement

*For any* HTTP request to the `/api/supervisor` endpoint, the response status code SHALL be: 401 if unauthenticated, 403 if the authenticated user's role is not "admin" or "owner", and 200 with data only if the user has an "admin" or "owner" role.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 3: Average daily conversations formula

*For any* agent with a total conversation count `T` within a time period spanning `D` days (where D ≥ 1), the average daily conversations SHALL equal `T / D`, and when `T = 0` the displayed value SHALL be `0`.

**Validates: Requirements 3.2, 3.4**

### Property 4: Response time calculation

*For any* set of conversations assigned to an agent where each conversation has at least one inbound message followed by an outbound message, the average response time SHALL equal the mean of `(first_outbound_timestamp - preceding_inbound_timestamp)` across all qualifying conversations, excluding conversations with no inbound messages.

**Validates: Requirements 4.2, 4.5**

### Property 5: Resolution rate formula

*For any* agent with `closed` conversations and `total` conversations in a time period, the resolution rate SHALL equal `(closed / total) * 100` when `total > 0`, and `0` when `total = 0`.

**Validates: Requirements 5.2, 5.4**

### Property 6: Agent sorting by conversation count

*For any* list of agent metrics displayed in the Performance Panel, the agents SHALL be ordered such that each agent's total conversation count is greater than or equal to the next agent's total conversation count (descending order).

**Validates: Requirements 6.4**

### Property 7: Online/offline count invariant

*For any* set of agents displayed in the Realtime View, the sum of online agents plus offline agents SHALL equal the total number of agents, and the online count SHALL equal the number of agents where `is_online = true`.

**Validates: Requirements 7.3**

### Property 8: Conversation grouping by agent

*For any* set of active conversations (status "open" or "pending"), every conversation SHALL appear in exactly one group: either under its assigned agent (when `agent_id` is not null) or under the "Unassigned" group (when `agent_id` is null), and every conversation within an agent's group SHALL have that agent's ID as its `agent_id`.

**Validates: Requirements 8.1, 8.4**

### Property 9: Overload threshold highlighting

*For any* set of online agents with active conversation counts, an agent SHALL be highlighted as overloaded if and only if their active conversation count exceeds the team average by more than 50% (i.e., `count > average * 1.5`).

**Validates: Requirements 9.4**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Unauthenticated API request | Return 401 with `{ error: 'Não autorizado' }` |
| Non-admin API request | Return 403 with `{ error: 'Acesso negado' }` |
| Database query failure | Return 500 with `{ error: 'Erro interno' }`, log error server-side |
| No agents found | Display empty state in Performance Panel |
| Realtime subscription failure | Fall back to polling every 30 seconds, show warning toast |
| Agent with no conversations | Show "0" for count, "0%" for resolution, "--" for response time |
| Division by zero (0 days in period) | Use minimum of 1 day for period calculation |
| Client-side fetch failure | Show error state with retry button, use `sonner` or existing toast |

## Testing Strategy

### Unit Tests

- **Metrics calculation functions** — test `calculateAvgDailyConversations`, `calculateResponseTime`, `calculateResolutionRate` with specific examples and edge cases (zero conversations, zero days, no outbound messages).
- **Filter logic** — test combined filter (agent + status + search) with known data sets.
- **Grouping logic** — test conversation grouping with null agent_ids, mixed statuses.
- **Overload detection** — test threshold calculation with known averages.
- **Time period boundaries** — test `getStartOfWeek`, `getStartOfMonth`, `getStartOfDay` utilities.

### Property-Based Tests

Property-based testing is appropriate for this feature because the core logic involves pure data transformations (filtering, aggregation, sorting, grouping) that have universal properties holding across all valid inputs.

**Library:** [fast-check](https://github.com/dubzzz/fast-check) (TypeScript PBT library, already compatible with the project's test stack)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: supervisor-dashboard, Property {N}: {description}`

**Properties to implement:**
1. Combined filter correctness (Property 1)
2. Authorization enforcement (Property 2)
3. Average daily conversations formula (Property 3)
4. Response time calculation (Property 4)
5. Resolution rate formula (Property 5)
6. Agent sorting invariant (Property 6)
7. Online/offline count invariant (Property 7)
8. Conversation grouping correctness (Property 8)
9. Overload threshold highlighting (Property 9)

### Integration Tests

- API route authorization flow (401/403/200 based on auth state)
- Full metrics API response with seeded database data
- Supabase Realtime subscription receives and processes events
- Page-level rendering with mocked API responses

### E2E Tests (Optional/Manual)

- Admin navigates to supervisor page, sees all panels
- Agent cannot access supervisor page (redirected)
- Time period selector changes update displayed metrics
- Real-time status change reflected in UI within 3 seconds
