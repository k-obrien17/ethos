---
phase: 23-monitoring
plan: 02
subsystem: infra
tags: [admin, monitoring, error-logs, uptime, betterstack, supabase]

requires:
  - phase: 23-monitoring-01
    provides: error_logs table, logger utilities, /api/health endpoint
provides:
  - Admin monitoring page at /admin/monitoring with filterable error log table
  - External uptime monitoring via BetterStack pinging /api/health
affects: [admin-dashboard, operational-monitoring]

tech-stack:
  added: []
  patterns: [url-param-driven-filtering, expandable-table-rows, external-uptime-monitoring]

key-files:
  created:
    - src/app/admin/monitoring/page.jsx
    - src/app/admin/monitoring/ErrorRow.jsx
  modified:
    - src/app/admin/layout.jsx

key-decisions:
  - "ErrorRow extracted as separate client component file for clean server/client boundary"
  - "BetterStack chosen for external uptime monitoring (free tier, 3-min check interval)"

patterns-established:
  - "Admin table pages: server component with URL searchParam filters, client component for interactive rows"
  - "External monitoring: BetterStack pings /api/health with email alerts on failure"

requirements-completed: [MNTR-03, MNTR-04]

duration: 3min
completed: 2026-03-19
---

# Phase 23 Plan 02: Admin Monitoring & Uptime Summary

**Admin monitoring page with filterable error log table (severity/route), expandable stack traces, and BetterStack uptime monitoring on /api/health**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T12:00:00Z
- **Completed:** 2026-03-19T12:12:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Admin monitoring page at /admin/monitoring with error log table showing timestamp, severity, route, method, message, and status code
- Severity and route dropdown filters using URL searchParams (server component pattern)
- Expandable error rows showing full stack trace, metadata JSON, and user ID
- Summary stats cards showing error/warn/info counts in last 24 hours
- Pagination support (50 errors per page)
- Admin nav updated with Monitoring link
- BetterStack configured to ping /api/health every 3 minutes with email alerts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin monitoring page with filterable error log table** - `3346f1e` (feat)
2. **Task 2: Set up external uptime monitoring for /api/health** - manual (BetterStack configuration, no code commit)

## Files Created/Modified
- `src/app/admin/monitoring/page.jsx` - Server component with error log table, filters, pagination, and summary stats
- `src/app/admin/monitoring/ErrorRow.jsx` - Client component for expandable error row with stack trace and metadata
- `src/app/admin/layout.jsx` - Added Monitoring nav link

## Decisions Made
- ErrorRow placed in separate file (not co-located in page.jsx) for cleaner server/client component separation
- BetterStack selected over UptimeRobot for uptime monitoring (recommended option in plan)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - BetterStack uptime monitoring already configured and active.

## Next Phase Readiness
- Full monitoring stack complete: error logging, health endpoint, admin dashboard, and external uptime monitoring
- This is the final plan in Phase 23 (Monitoring) and the final phase in the project
- All v6 Scale & Infrastructure milestones delivered

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 23-monitoring*
*Completed: 2026-03-19*
