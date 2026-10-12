-- ==============================================================================
-- SUTRA — Supabase Backend Demonstration Data Seed
-- ==============================================================================
-- Seeds realistic synthetic demonstration fixtures into Supabase PostgreSQL:
-- - Campus & RBAC Memberships (including real registered users & demo personas)
-- - Policy Version & Intervention Catalog
-- - Synthetic Students (SYN-1007 to SYN-1012) & Authorizations
-- - Multi-Domain Observations (Academic, Attendance, Participation, Skills, Feedback)
-- - Segregated Financial Records (ADR-003)
-- - Evidence Packets & Deterministic Policy Signals
-- - Interventions, Cases, Tasks, Events, and Follow-Ups
-- - ML Inference Logs (with Platt-calibrated log-odds attributions)
-- ==============================================================================

BEGIN;

-- 1. Demonstration Institution
INSERT INTO public.institutions (id, name, status, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'SUTRA Synthetic Demonstration Campus', 'active', now())
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 2. Auth Users (Ensure all required users exist in auth.users)
INSERT INTO auth.users (id, instance_id, aud, role, email, is_sso_user, is_anonymous, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'faculty@sutra.edu', false, false, now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'counselor@sutra.edu', false, false, now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dean@sutra.edu', false, false, now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'leadership@sutra.edu', false, false, now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@sutra.edu', false, false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Institution Memberships
INSERT INTO public.institution_memberships (id, institution_id, user_id, role, is_active, created_at)
VALUES
  -- Yash Goel (Real developer user)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '80c46ffd-1490-4160-a0ae-8d62e5155f8d', 'institution_admin', true, now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '80c46ffd-1490-4160-a0ae-8d62e5155f8d', 'faculty', true, now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '80c46ffd-1490-4160-a0ae-8d62e5155f8d', 'hod', true, now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '80c46ffd-1490-4160-a0ae-8d62e5155f8d', 'mentor', true, now()),
  -- Haruto Okura (Real developer user)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '739f8c9b-5a63-4b66-90eb-b322117543c9', 'faculty', true, now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '739f8c9b-5a63-4b66-90eb-b322117543c9', 'counsellor', true, now()),
  -- Standard Demo Personas
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'faculty', true, now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'mentor', true, now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'counsellor', true, now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'hod', true, now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'leadership', true, now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'institution_admin', true, now())
ON CONFLICT DO NOTHING;

-- 4. Active Policy Version
INSERT INTO public.policy_versions (
  id, institution_id, policy_key, version, status, definition, checksum, evaluator_version, created_by, created_at, published_at, effective_from
)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'ug_attendance_academic_v1',
  1,
  'published',
  '{"name": "Undergraduate Academic & Attendance Early Warning Policy", "rules": [{"rule_key": "ug_attendance_drop", "threshold": 0.70}, {"rule_key": "ug_academic_drop", "missing_assignments_threshold": 3}]}'::jsonb,
  'sha256-ug-policy-v1-canonical',
  '1.0.0',
  '55555555-5555-5555-5555-555555555555',
  now() - interval '30 days',
  now() - interval '30 days',
  now() - interval '30 days'
)
ON CONFLICT (id) DO UPDATE
SET status = 'published', definition = EXCLUDED.definition;

-- 5. Interventions Catalog
INSERT INTO public.intervention_catalog (
  id, institution_id, intervention_key, domain, display_label, description, recipient_role, required_purpose_key, requires_human_approval, active, version, created_at
)
VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'mentor_check_in',
    'mentor',
    'Academic Mentor Check-In',
    'Standard 1-on-1 advisor consultation to assess study barriers and formulate recovery steps.',
    'mentor',
    'student_support',
    true,
    true,
    1,
    now()
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'academic_tutoring_offer',
    'academic',
    'Subject Tutoring Referral',
    'Structured peer and faculty subject tutorial matching for coursework catch-up.',
    'faculty',
    'student_support',
    true,
    true,
    1,
    now()
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'fee_emergency_counselling',
    'finance',
    'Emergency Financial Aid Consultation',
    'Confidential bursary and installment consultation (segregated domain per ADR-003).',
    'finance',
    'fee_support',
    true,
    true,
    1,
    now()
  ),
  (
    'c1000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'counselling_referral',
    'counselling',
    'Student Wellbeing Referral',
    'Confidential mental health, stress management, and wellbeing support service referral.',
    'counsellor',
    'student_wellbeing',
    true,
    true,
    1,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Students
INSERT INTO public.students (
  id, institution_id, external_ref, display_name, cohort_code, enrollment_status, created_at, updated_at
)
VALUES
  ('b0000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000001', 'SYN-1007', 'Asha (synthetic)', 'CS-Y2', 'active', now() - interval '60 days', now()),
  ('b0000000-0000-0000-0000-000000001008', '00000000-0000-0000-0000-000000000001', 'SYN-1008', 'Dev (synthetic)', 'CS-Y2', 'active', now() - interval '60 days', now()),
  ('b0000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000001', 'SYN-1009', 'Ira (synthetic)', 'CS-Y2', 'active', now() - interval '60 days', now()),
  ('b0000000-0000-0000-0000-000000001010', '00000000-0000-0000-0000-000000000001', 'SYN-1010', 'Noor (synthetic)', 'CS-Y2', 'active', now() - interval '60 days', now()),
  ('b0000000-0000-0000-0000-000000001011', '00000000-0000-0000-0000-000000000001', 'SYN-1011', 'Milan (synthetic)', 'CS-Y2', 'completed', now() - interval '120 days', now()),
  ('b0000000-0000-0000-0000-000000001012', '00000000-0000-0000-0000-000000000001', 'SYN-1012', 'Tara (synthetic)', 'CS-Y2', 'active', now() - interval '60 days', now())
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name, enrollment_status = EXCLUDED.enrollment_status, updated_at = now();

-- 7. Processing Authorizations
INSERT INTO public.processing_authorizations (
  id, institution_id, student_id, purpose_key, basis_type, status, effective_at, created_at
)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000001007', 'student_support', 'institution_policy', 'active', now() - interval '60 days', now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000001008', 'student_support', 'institution_policy', 'active', now() - interval '60 days', now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000001009', 'student_support', 'institution_policy', 'active', now() - interval '60 days', now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000001010', 'student_support', 'institution_policy', 'active', now() - interval '60 days', now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000001011', 'student_support', 'institution_policy', 'active', now() - interval '120 days', now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000001012', 'student_support', 'institution_policy', 'active', now() - interval '60 days', now())
ON CONFLICT DO NOTHING;

-- 8. Source Imports
INSERT INTO public.source_imports (
  id, institution_id, source_system, schema_version, file_digest, idempotency_key, status, received_at, completed_at, rows_received, rows_accepted, rows_duplicate, rows_rejected
)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'SIS_CANVAS_VLE',
  '1.0',
  'sha256-demo-seed-v1',
  'import-seed-20261012',
  'completed',
  now() - interval '10 days',
  now() - interval '10 days',
  25, 25, 0, 0
)
ON CONFLICT (id) DO NOTHING;

-- 9. Student Observations (Multi-Domain Telemetry)
INSERT INTO public.student_observations (
  id, institution_id, student_id, domain, metric_key, value, unit, event_at, available_at, ingested_at, source_system, source_record_ref, source_version, quality_state, import_id, created_at
)
VALUES
  -- Asha (SYN-1007) - At-Risk Profile
  (
    'd1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000001007',
    'attendance',
    'attendance_rate',
    '{"val": 0.58, "unit": "percentage"}'::jsonb,
    'percentage',
    now() - interval '10 days',
    now() - interval '10 days' + interval '2 hours',
    now() - interval '10 days',
    'SIS_ATTENDANCE',
    'REC-ATT-1007',
    1,
    'valid',
    'c0000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    'd1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000001007',
    'academic',
    'missing_assignments_count',
    '{"val": 3, "unit": "count"}'::jsonb,
    'count',
    now() - interval '7 days',
    now() - interval '7 days' + interval '1 hour',
    now() - interval '7 days',
    'LMS_ASSIGNMENTS',
    'REC-ASN-1007',
    1,
    'valid',
    'c0000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    'd1000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000001007',
    'academic',
    'latest_score',
    '{"val": 41, "unit": "score"}'::jsonb,
    'score',
    now() - interval '5 days',
    now() - interval '5 days' + interval '1 hour',
    now() - interval '5 days',
    'LMS_GRADES',
    'REC-GRD-1007',
    1,
    'valid',
    'c0000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    'd1000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000001007',
    'participation',
    'weekly_activity_count',
    '{"val": 2, "unit": "sessions"}'::jsonb,
    'sessions',
    now() - interval '4 days',
    now() - interval '4 days',
    now() - interval '4 days',
    'VLE_ANALYTICS',
    'REC-VLE-1007',
    1,
    'valid',
    'c0000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    'd1000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000001007',
    'skills',
    'skill_rubric_status',
    '{"val": "needs_review"}'::jsonb,
    'status',
    now() - interval '6 days',
    now() - interval '6 days',
    now() - interval '6 days',
    'SKILLHUB_RUBRICS',
    'REC-SKL-1007',
    1,
    'valid',
    'c0000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    'd1000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000001007',
    'faculty_feedback',
    'support_check_requested',
    '{"val": true}'::jsonb,
    'flag',
    now() - interval '2 days',
    now() - interval '2 days',
    now() - interval '2 days',
    'FACULTY_PORTAL',
    'REC-FBK-1007',
    1,
    'valid',
    'c0000000-0000-0000-0000-000000000001',
    now()
  ),
  -- Dev (SYN-1008) - High-Engagement Profile
  (
    'd1000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000001008',
    'attendance',
    'attendance_rate',
    '{"val": 0.94, "unit": "percentage"}'::jsonb,
    'percentage',
    now() - interval '5 days',
    now() - interval '5 days',
    now() - interval '5 days',
    'SIS_ATTENDANCE',
    'REC-ATT-1008',
    1,
    'valid',
    'c0000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    'd1000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000001008',
    'academic',
    'missing_assignments_count',
    '{"val": 0, "unit": "count"}'::jsonb,
    'count',
    now() - interval '3 days',
    now() - interval '3 days',
    now() - interval '3 days',
    'LMS_ASSIGNMENTS',
    'REC-ASN-1008',
    1,
    'valid',
    'c0000000-0000-0000-0000-000000000001',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 10. Financial Observations (ADR-003 Segregated Domain)
INSERT INTO public.finance_observations (
  id, institution_id, student_id, fee_support_status, event_at, available_at, ingested_at, source_system, source_record_ref, source_version, quality_state, import_id, created_at
)
VALUES (
  'd2000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000001007',
  'review_requested',
  now() - interval '4 days',
  now() - interval '4 days',
  now() - interval '4 days',
  'SIS_FINANCE',
  'REC-FEE-1007',
  1,
  'valid',
  'c0000000-0000-0000-0000-000000000001',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 11. Evidence Packet
INSERT INTO public.evidence_packets (
  id, institution_id, student_id, policy_version_id, schema_version, as_of_at, snapshot, digest, retention_class, expires_at, created_at
)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000001007',
  'a0000000-0000-0000-0000-000000000001',
  '1.0',
  now() - interval '2 days',
  '{"attendance_rate": 0.58, "missing_assignments_count": 3, "latest_score": 41, "weekly_activity_count": 2}'::jsonb,
  'sha256-evidence-syn1007-snapshot',
  'demo_short_lived',
  now() + interval '90 days',
  now() - interval '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- 12. Policy Signals
INSERT INTO public.signals (
  id, institution_id, student_id, policy_version_id, evidence_packet_id, rule_key, result, quality_state, explanation, evaluated_at, reviewed_decision, reviewed_by, reviewed_at, review_reason_code, created_at
)
VALUES (
  'e1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000001007',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'ug_attendance_drop',
  'attention_suggested',
  'sufficient',
  '{"attendance_rate": 0.58, "missing_assignments": 3, "threshold": 0.70, "recommendation": "Academic mentor check-in"}'::jsonb,
  now() - interval '2 days',
  'approve',
  '11111111-1111-1111-1111-111111111111',
  now() - interval '1 day',
  'ATTENDANCE_DEFICIT_VERIFIED',
  now() - interval '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- 13. Case
INSERT INTO public.cases (
  id, institution_id, student_id, originating_signal_id, selected_intervention_key, state, primary_owner_user_id, due_at, accepted_at, version, created_by, created_at, updated_at
)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000001007',
  'e1000000-0000-0000-0000-000000000001',
  'mentor_check_in',
  'support_in_progress',
  '11111111-1111-1111-1111-111111111111',
  now() + interval '3 days',
  now() - interval '2 hours',
  1,
  '11111111-1111-1111-1111-111111111111',
  now() - interval '1 day',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 14. Case Tasks
INSERT INTO public.case_tasks (
  id, institution_id, case_id, domain, generic_label, state, assignee_user_id, due_at, deadline_version, idempotency_key, created_at
)
VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'mentor',
    'Initial 1-on-1 Academic Mentorship Session',
    'in_progress',
    '11111111-1111-1111-1111-111111111111',
    now() + interval '2 days',
    1,
    'task-seed-mentor-001',
    now() - interval '1 day'
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'counselling',
    'Student Wellness Resource Check',
    'pending',
    '22222222-2222-2222-2222-222222222222',
    now() + interval '5 days',
    1,
    'task-seed-counsel-002',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- 15. Follow-Up
INSERT INTO public.follow_ups (
  id, institution_id, case_id, follow_up_type, contact_status, proof_kind, occurred_at, recorded_by, sanitized_note, proof_ref, idempotency_key, created_at
)
VALUES (
  'f2000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'contact_attempt',
  'student_reached',
  'appointment_record',
  now() - interval '1 hour',
  '11111111-1111-1111-1111-111111111111',
  'Student met in office; confirmed commuting challenges affecting morning sessions. Agreed to tutorial support.',
  'CAL-OFFICE-OCT12',
  'fu-seed-001',
  now() - interval '1 hour'
)
ON CONFLICT (id) DO NOTHING;

-- 16. Case Event
INSERT INTO public.case_events (
  id, institution_id, case_id, actor_user_id, actor_kind, event_type, from_state, to_state, reason_code, metadata, idempotency_key, created_at
)
VALUES (
  'f3000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'user',
  'SUPPORT_STARTED',
  'accepted',
  'support_in_progress',
  'FOLLOWUP_INITIATED',
  '{"initiated_by": "Prof. Ananya Sharma", "channel": "in_person_office"}'::jsonb,
  'evt-seed-001',
  now() - interval '1 hour'
)
ON CONFLICT (id) DO NOTHING;

-- 17. ML Inference Logs (Live Model Predictions with Platt-Calibrated Probabilities & Explanations)
INSERT INTO public.ml_inference_logs (
  id, institution_id, signal_id, student_id, external_student_ref, model_name, model_version, prediction_cutoff, risk_probability, threshold, classification, top_attributions, latency_ms, created_at
)
VALUES
  (
    'f4000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000001007',
    'SYN-1007',
    'logistic_regression_baseline',
    '1.0.0',
    'Day 30',
    0.68,
    0.46,
    'At_Risk',
    '[
      {"feature": "vle_active_days_d30", "value": 8.0, "attribution": 0.3265, "direction": "increases_risk"},
      {"feature": "vle_days_since_last_click", "value": 6.0, "attribution": 0.2802, "direction": "increases_risk"},
      {"feature": "imd_band", "value": "20-30%", "attribution": 0.2412, "direction": "increases_risk"},
      {"feature": "assessments_submitted_d30", "value": 1.0, "attribution": -0.1900, "direction": "decreases_risk"},
      {"feature": "gender", "value": "F", "attribution": -0.2644, "direction": "decreases_risk"}
    ]'::jsonb,
    3.8,
    now() - interval '2 days'
  ),
  (
    'f4000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    null,
    'b0000000-0000-0000-0000-000000001008',
    'SYN-1008',
    'logistic_regression_baseline',
    '1.0.0',
    'Day 30',
    0.24,
    0.46,
    'On_Track',
    '[
      {"feature": "vle_active_days_d30", "value": 24.0, "attribution": -0.6400, "direction": "decreases_risk"},
      {"feature": "assessments_submitted_d30", "value": 2.0, "attribution": -0.3800, "direction": "decreases_risk"},
      {"feature": "vle_days_since_last_click", "value": 0.0, "attribution": -0.2800, "direction": "decreases_risk"},
      {"feature": "studied_credits", "value": 60.0, "attribution": 0.0500, "direction": "increases_risk"}
    ]'::jsonb,
    3.2,
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
