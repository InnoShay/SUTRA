-- ==============================================================================
-- SUTRA — Supabase Row Level Security (RLS) Defense-in-Depth Lockdown
-- ==============================================================================
-- Architecture Enforcement:
-- 1. FastAPI is the single product backend and sole authority for business logic,
--    campus scoping (X-Campus-Id), and role-based access control.
-- 2. FastAPI connects using the server-side PostgreSQL role (e.g., postgres / service_role)
--    which maintains schema migrations and transactional persistence.
-- 3. To strictly enforce that the browser CANNOT bypass FastAPI using the public
--    Supabase anon key to query or mutate tables directly via PostgREST,
--    Row Level Security (RLS) is ENABLED on all core tables.
-- 4. By default, with RLS enabled and no permissive policies granted to `anon`
--    or `authenticated`, PostgREST requests from the browser return empty/forbidden.
-- ==============================================================================

-- 1. Institutions & Memberships
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_memberships ENABLE ROW LEVEL SECURITY;

-- 2. Student Domain & Consent
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_signals ENABLE ROW LEVEL SECURITY;

-- 3. Ingestion & Sensitive Domain Separation (ADR-003)
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitive_financial_records ENABLE ROW LEVEL SECURITY;

-- 4. Case Management & Orchestration (ADR-001 / ADR-002)
ALTER TABLE signal_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE restricted_task_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;

-- 5. Interventions & Outcomes
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

-- 6. ML & Reliability Tables
ALTER TABLE ml_inference_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_records ENABLE ROW LEVEL SECURITY;

-- PostgREST Defense-in-Depth Lockdown:
-- Revoke default PUBLIC table access from anon and authenticated roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Service role bypass remains active for FastAPI backend service execution
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role, postgres;
