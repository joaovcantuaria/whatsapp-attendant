# Requirements Document

## Introduction

The Supervisor Dashboard feature provides admin and owner users of BoraGerir Conversas with tools to monitor, filter, and evaluate agent performance in real time. It includes the ability to filter conversations by agent in the existing conversations list, a dedicated performance metrics panel with key indicators per agent, and a real-time supervisor view showing live agent activity and workload distribution.

## Glossary

- **Supervisor_Dashboard**: The dedicated page accessible at `/dashboard/supervisor` that aggregates agent performance metrics, real-time status, and workload distribution for admin and owner users.
- **Agent_Filter**: A UI control in the conversations list that allows filtering conversations by the assigned agent.
- **Performance_Panel**: A section within the Supervisor Dashboard displaying computed metrics (average daily conversations, average response time, resolution rate, total conversations) per agent over configurable time periods.
- **Realtime_View**: A section within the Supervisor Dashboard that displays live information about agent online status, current conversation assignments, and workload distribution using Supabase Realtime subscriptions.
- **Response_Time**: The duration in minutes between when an inbound message is received and when the assigned agent sends the first outbound reply in that conversation.
- **Resolution_Rate**: The percentage of conversations assigned to an agent that have been moved to "closed" status relative to the total conversations assigned to that agent within a given time period.
- **Workload_Distribution**: A visual representation showing how many active (open + pending) conversations each online agent currently has assigned.
- **Admin_User**: A user with role "owner" or "admin" in the `company_members` table.
- **Time_Period_Selector**: A UI control that allows selecting "today", "this week", or "this month" as the time range for metrics aggregation.
- **Agent**: A member of the company's team who handles customer conversations via WhatsApp.

## Requirements

### Requirement 1: Filter Conversations by Agent

**User Story:** As a supervisor, I want to filter the conversations list by a specific agent, so that I can monitor and review the conversations each agent is handling.

#### Acceptance Criteria

1. WHEN the conversations page is loaded, THE Agent_Filter SHALL display a dropdown listing all active agents in the company plus an "All agents" option.
2. WHEN an agent is selected in the Agent_Filter, THE Conversation_List SHALL display only conversations where `agent_id` matches the selected agent.
3. WHEN "All agents" is selected in the Agent_Filter, THE Conversation_List SHALL display conversations from all agents (default behavior).
4. WHILE the Agent_Filter is applied, THE Conversation_List SHALL maintain the existing status filter (pending/open/closed/all) and search query in combination with the agent filter.
5. WHILE the Agent_Filter is applied, THE Conversation_List SHALL update in real time when new conversations are assigned to or removed from the selected agent.
6. THE Agent_Filter SHALL be visible to all authenticated users regardless of role.

### Requirement 2: Access Control for Supervisor Dashboard

**User Story:** As a platform administrator, I want the supervisor dashboard to be accessible only to admin and owner users, so that sensitive performance data is protected from regular agents.

#### Acceptance Criteria

1. WHEN an Admin_User navigates to `/dashboard/supervisor`, THE Supervisor_Dashboard SHALL render the full performance panel and real-time view.
2. WHEN a user with role "agent" attempts to access `/dashboard/supervisor`, THE Supervisor_Dashboard SHALL redirect the user to the main `/dashboard` page.
3. THE Supervisor_Dashboard SHALL validate the user role on the server side before returning metrics data from the API endpoints.
4. IF an unauthenticated request is made to the supervisor API endpoints, THEN THE Supervisor_Dashboard SHALL return HTTP 401 status.
5. IF an authenticated request from a non-admin user is made to the supervisor API endpoints, THEN THE Supervisor_Dashboard SHALL return HTTP 403 status.

### Requirement 3: Average Daily Conversations per Agent

**User Story:** As a supervisor, I want to see the average number of daily conversations each agent handles, so that I can assess workload balance and agent capacity.

#### Acceptance Criteria

1. WHEN the Performance_Panel is loaded, THE Performance_Panel SHALL display the average daily conversation count for each active agent within the selected time period.
2. THE Performance_Panel SHALL calculate the average daily conversations by dividing the total conversations assigned to an agent by the number of days in the selected time period.
3. WHEN the Time_Period_Selector value changes, THE Performance_Panel SHALL recalculate the average daily conversations for the new time period.
4. IF an agent has zero conversations in the selected time period, THEN THE Performance_Panel SHALL display "0" as the average daily conversation count for that agent.

### Requirement 4: Average Response Time per Agent

**User Story:** As a supervisor, I want to see the average response time for each agent, so that I can identify agents who may need support or coaching on response speed.

#### Acceptance Criteria

1. WHEN the Performance_Panel is loaded, THE Performance_Panel SHALL display the average Response_Time in minutes for each active agent within the selected time period.
2. THE Performance_Panel SHALL calculate Response_Time as the difference between the timestamp of the first outbound message from the agent and the timestamp of the preceding inbound message in each conversation.
3. WHEN the Time_Period_Selector value changes, THE Performance_Panel SHALL recalculate the average response time for the new time period.
4. IF an agent has no outbound messages in the selected time period, THEN THE Performance_Panel SHALL display "--" as the average response time for that agent.
5. THE Performance_Panel SHALL exclude conversations with no inbound messages from the response time calculation.

### Requirement 5: Resolution Rate per Agent

**User Story:** As a supervisor, I want to see the resolution rate for each agent, so that I can evaluate how effectively agents resolve customer issues.

#### Acceptance Criteria

1. WHEN the Performance_Panel is loaded, THE Performance_Panel SHALL display the Resolution_Rate as a percentage for each active agent within the selected time period.
2. THE Performance_Panel SHALL calculate Resolution_Rate as: (number of conversations moved to "closed" status by the agent / total conversations assigned to the agent) × 100, within the selected time period.
3. WHEN the Time_Period_Selector value changes, THE Performance_Panel SHALL recalculate the resolution rate for the new time period.
4. IF an agent has zero total conversations in the selected time period, THEN THE Performance_Panel SHALL display "0%" as the resolution rate for that agent.

### Requirement 6: Total Conversations per Agent with Time Period

**User Story:** As a supervisor, I want to see the total number of conversations handled by each agent across configurable time periods, so that I can track agent productivity trends.

#### Acceptance Criteria

1. WHEN the Performance_Panel is loaded, THE Performance_Panel SHALL display the total count of conversations assigned to each active agent within the selected time period.
2. THE Time_Period_Selector SHALL provide options for "today", "this week" (Monday to current day), and "this month" (first day of month to current day).
3. WHEN the Time_Period_Selector value changes, THE Performance_Panel SHALL refresh the total conversation counts for all agents for the new time period.
4. THE Performance_Panel SHALL display agents sorted by total conversation count in descending order by default.

### Requirement 7: Real-Time Agent Status Visibility

**User Story:** As a supervisor, I want to see which agents are currently online and their status in real time, so that I can understand team availability at any moment.

#### Acceptance Criteria

1. WHEN the Realtime_View is loaded, THE Realtime_View SHALL display the online/offline status for each agent using the `is_online` field from the `agents` table.
2. WHEN an agent's `is_online` status changes in the database, THE Realtime_View SHALL update the displayed status within 3 seconds without requiring a page refresh.
3. THE Realtime_View SHALL display a count of total online agents and total offline agents.
4. THE Realtime_View SHALL visually distinguish online agents from offline agents using color indicators (green for online, gray for offline).

### Requirement 8: Real-Time Conversation Assignment Visibility

**User Story:** As a supervisor, I want to see which agent is handling which conversation in real time, so that I can intervene or reassign when necessary.

#### Acceptance Criteria

1. WHEN the Realtime_View is loaded, THE Realtime_View SHALL display the list of active conversations (status "open" or "pending") grouped by assigned agent.
2. WHEN a conversation is assigned to a different agent, THE Realtime_View SHALL update the grouping within 3 seconds without requiring a page refresh.
3. WHEN a new conversation is created, THE Realtime_View SHALL display the new conversation under the assigned agent (or under "Unassigned" if no agent is assigned) within 3 seconds.
4. THE Realtime_View SHALL display unassigned conversations (agent_id is null) in a separate "Unassigned" group.
5. FOR EACH conversation displayed, THE Realtime_View SHALL show the contact name, conversation status, and the time since the last message.

### Requirement 9: Workload Distribution Visualization

**User Story:** As a supervisor, I want to see a visual representation of workload distribution among agents, so that I can quickly identify overloaded or idle agents and rebalance assignments.

#### Acceptance Criteria

1. WHEN the Realtime_View is loaded, THE Workload_Distribution SHALL display a chart showing the number of active conversations (status "open" or "pending") assigned to each online agent.
2. WHEN conversation assignments change, THE Workload_Distribution SHALL update the chart within 3 seconds without requiring a page refresh.
3. THE Workload_Distribution SHALL use a bar chart rendered with Recharts to visualize the conversation count per agent.
4. THE Workload_Distribution SHALL visually highlight agents whose active conversation count exceeds the team average by more than 50% using a distinct color.

### Requirement 10: Supervisor Dashboard Navigation

**User Story:** As a supervisor, I want easy access to the supervisor dashboard from the main navigation, so that I can quickly check team performance without navigating complex menus.

#### Acceptance Criteria

1. WHILE the authenticated user has an Admin_User role, THE navigation sidebar SHALL display a "Supervisor" menu item linking to `/dashboard/supervisor`.
2. WHILE the authenticated user has a role of "agent", THE navigation sidebar SHALL hide the "Supervisor" menu item.
3. WHEN the Admin_User clicks the "Supervisor" menu item, THE application SHALL navigate to the Supervisor_Dashboard page.
