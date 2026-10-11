-- SUTRA structural starter migration: PostgreSQL / Supabase Auth
-- Synthetic-data prototype only. It enables RLS but deliberately does not add broad policies.
-- Phase 1 is NOT complete until grants and per-table policies/RPCs are added and negative-tested.
begin;
create extension if not exists pgcrypto;

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);
create table public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('faculty','hod','mentor','counsellor','placement','finance','leadership','institution_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (institution_id,user_id,role)
);
create index idx_memberships_user_active on public.institution_memberships(user_id,is_active,institution_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  external_ref text not null,
  display_name text not null,
  cohort_code text,
  enrollment_status text not null default 'active' check (enrollment_status in ('active','inactive','completed','unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id,external_ref),
  unique (institution_id,id)
);
create index idx_students_cohort on public.students(institution_id,cohort_code,enrollment_status);

create table public.processing_authorizations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null,
  purpose_key text not null,
  basis_type text not null check (basis_type in ('consent','institution_policy','statutory','other_approved','demo_only','not_applicable')),
  status text not null check (status in ('active','withdrawn','expired','not_applicable')),
  notice_or_policy_version text,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  changed_by uuid references auth.users(id) on delete set null,
  note_code text,
  created_at timestamptz not null default now(),
  foreign key (institution_id,student_id) references public.students(institution_id,id) on delete cascade
);
create index idx_authorizations_lookup on public.processing_authorizations(institution_id,student_id,purpose_key,effective_at desc);

create table public.source_imports (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  source_system text not null,
  schema_version text not null,
  file_digest text not null,
  idempotency_key text not null,
  status text not null default 'received' check (status in ('received','validating','completed','completed_with_errors','failed')),
  received_by uuid references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  completed_at timestamptz,
  rows_received integer not null default 0 check (rows_received >= 0),
  rows_accepted integer not null default 0 check (rows_accepted >= 0),
  rows_duplicate integer not null default 0 check (rows_duplicate >= 0),
  rows_rejected integer not null default 0 check (rows_rejected >= 0),
  row_errors jsonb not null default '[]'::jsonb,
  unique (institution_id,idempotency_key),
  unique (institution_id,id)
);

-- Non-finance domains only; fee detail is deliberately kept in a separate table.
create table public.student_observations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  student_id uuid not null,
  domain text not null check (domain in ('attendance','academic','participation','skills','faculty_feedback')),
  metric_key text not null,
  value jsonb not null,
  unit text,
  event_at timestamptz not null,
  available_at timestamptz,
  ingested_at timestamptz not null default now(),
  source_system text not null,
  source_record_ref text not null,
  source_version integer not null default 1 check (source_version > 0),
  quality_state text not null default 'valid' check (quality_state in ('valid','missing','stale','conflicting','late_available','invalid','unknown')),
  supersedes_observation_id uuid references public.student_observations(id) on delete set null,
  import_id uuid references public.source_imports(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (institution_id,student_id) references public.students(institution_id,id) on delete cascade,
  unique (institution_id,source_system,source_record_ref,source_version),
  unique (institution_id,id)
);
create index idx_obs_student_time on public.student_observations(institution_id,student_id,available_at,event_at);
create index idx_obs_domain_time on public.student_observations(institution_id,domain,available_at);

create table public.finance_observations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  student_id uuid not null,
  fee_support_status text not null check (fee_support_status in ('review_requested','support_in_progress','resolved','unknown')),
  event_at timestamptz not null,
  available_at timestamptz,
  ingested_at timestamptz not null default now(),
  source_system text not null,
  source_record_ref text not null,
  source_version integer not null default 1 check (source_version > 0),
  quality_state text not null default 'valid' check (quality_state in ('valid','stale','conflicting','late_available','invalid','unknown')),
  import_id uuid references public.source_imports(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (institution_id,student_id) references public.students(institution_id,id) on delete cascade,
  unique (institution_id,source_system,source_record_ref,source_version),
  unique (institution_id,id)
);
create index idx_finance_obs_student_time on public.finance_observations(institution_id,student_id,available_at);

create table public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  policy_key text not null,
  version integer not null check (version > 0),
  status text not null check (status in ('draft','published','retired')),
  definition jsonb not null,
  checksum text not null,
  evaluator_version text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  effective_from timestamptz,
  effective_to timestamptz,
  unique (institution_id,policy_key,version),
  unique (institution_id,id)
);

create table public.evidence_packets (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  student_id uuid not null,
  policy_version_id uuid not null,
  schema_version text not null,
  as_of_at timestamptz not null,
  snapshot jsonb not null,
  digest text not null,
  retention_class text not null default 'demo_short_lived',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (institution_id,student_id) references public.students(institution_id,id) on delete cascade,
  foreign key (institution_id,policy_version_id) references public.policy_versions(institution_id,id) on delete restrict,
  unique (institution_id,id)
);

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  student_id uuid not null,
  policy_version_id uuid not null,
  evidence_packet_id uuid not null,
  rule_key text not null,
  result text not null check (result in ('attention_suggested','no_rule_triggered','unknown')),
  quality_state text not null check (quality_state in ('sufficient','insufficient_evidence','stale_source','conflicting_source','missing_denominator')),
  explanation jsonb not null,
  evaluated_at timestamptz not null,
  reviewed_decision text check (reviewed_decision in ('approve','modify','dismiss','request_more_data')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_reason_code text,
  supersedes_signal_id uuid references public.signals(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (institution_id,student_id) references public.students(institution_id,id) on delete cascade,
  foreign key (institution_id,policy_version_id) references public.policy_versions(institution_id,id) on delete restrict,
  foreign key (institution_id,evidence_packet_id) references public.evidence_packets(institution_id,id) on delete restrict,
  unique (institution_id,id)
);
create index idx_signals_queue on public.signals(institution_id,result,evaluated_at desc);
create index idx_signals_student on public.signals(institution_id,student_id,evaluated_at desc);

create table public.intervention_catalog (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  intervention_key text not null,
  domain text not null check (domain in ('academic','mentor','finance','placement','counselling','parent_contact_review')),
  display_label text not null,
  description text not null,
  recipient_role text not null check (recipient_role in ('faculty','hod','mentor','counsellor','placement','finance')),
  required_purpose_key text not null,
  requires_human_approval boolean not null default true,
  active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  unique (institution_id,intervention_key,version)
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  student_id uuid not null,
  originating_signal_id uuid not null,
  selected_intervention_key text not null,
  state text not null check (state in ('suggested','under_review','action_planned','assigned','accepted','contact_attempted','support_in_progress','follow_up_due','outcome_reviewed','closed','dismissed','student_declined','service_unavailable','failed_contact','reopened')),
  primary_owner_user_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  accepted_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (institution_id,student_id) references public.students(institution_id,id) on delete cascade,
  foreign key (institution_id,originating_signal_id) references public.signals(institution_id,id) on delete restrict,
  unique (institution_id,id)
);
create index idx_cases_queue on public.cases(institution_id,state,due_at);
create index idx_cases_owner on public.cases(institution_id,primary_owner_user_id,state);

create table public.case_tasks (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  case_id uuid not null,
  domain text not null check (domain in ('academic','mentor','finance','placement','counselling','parent_contact_review')),
  generic_label text not null,
  state text not null default 'pending' check (state in ('pending','assigned','accepted','in_progress','blocked','completed','declined','cancelled','overdue')),
  assignee_user_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  deadline_version integer not null default 1,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  foreign key (institution_id,case_id) references public.cases(institution_id,id) on delete cascade,
  unique (institution_id,idempotency_key),
  unique (institution_id,id)
);
create index idx_tasks_due on public.case_tasks(institution_id,state,due_at);
create index idx_tasks_assignee on public.case_tasks(institution_id,assignee_user_id,state);

create table public.restricted_task_details (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  task_id uuid not null,
  restricted_domain text not null check (restricted_domain in ('finance','counselling','placement','parent_contact_review')),
  details jsonb not null,
  purpose_key text not null,
  retention_class text not null default 'restricted_short_lived',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (institution_id,task_id) references public.case_tasks(institution_id,id) on delete cascade,
  unique (institution_id,task_id)
);

create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  case_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_kind text not null default 'user' check (actor_kind in ('user','system_worker','seed_demo')),
  event_type text not null,
  from_state text,
  to_state text,
  reason_code text,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  foreign key (institution_id,case_id) references public.cases(institution_id,id) on delete cascade,
  unique (institution_id,idempotency_key)
);
create index idx_case_events_history on public.case_events(institution_id,case_id,created_at);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  case_id uuid not null,
  follow_up_type text not null check (follow_up_type in ('contact_attempt','student_response','support_delivered','follow_up_check','referral_update')),
  contact_status text check (contact_status in ('attempted','student_reached','unreachable','declined','not_applicable')),
  proof_kind text not null check (proof_kind in ('staff_attestation','student_confirmation','appointment_record','service_provider_confirmation','other_demo_evidence','none')),
  occurred_at timestamptz not null,
  recorded_by uuid references auth.users(id) on delete set null,
  sanitized_note text,
  proof_ref text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  foreign key (institution_id,case_id) references public.cases(institution_id,id) on delete cascade,
  unique (institution_id,idempotency_key)
);
create index idx_followups_case_time on public.follow_ups(institution_id,case_id,occurred_at);

create table public.case_outcomes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  case_id uuid not null,
  outcome_status text not null check (outcome_status in ('helped','not_helped','mixed','unknown')),
  follow_up_window_start timestamptz,
  follow_up_window_end timestamptz,
  rationale text not null,
  evidence_kind text not null default 'staff_review' check (evidence_kind in ('staff_review','student_feedback','academic_record','service_record','insufficient_evidence')),
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (institution_id,case_id) references public.cases(institution_id,id) on delete cascade
);
create index idx_outcomes_status_time on public.case_outcomes(institution_id,outcome_status,recorded_at);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  case_id uuid,
  task_id uuid,
  adapter_key text not null default 'in_app_demo',
  template_key text not null,
  destination_ref text,
  safe_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','dead_letter','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  foreign key (institution_id,case_id) references public.cases(institution_id,id) on delete cascade,
  foreign key (institution_id,task_id) references public.case_tasks(institution_id,id) on delete cascade,
  unique (institution_id,idempotency_key)
);
create index idx_outbox_pending on public.notification_outbox(status,next_attempt_at) where status in ('pending','failed');

-- Safe baseline: enabled RLS + no policies means client access is denied until explicit policy work.
-- Phase 1 MUST add least-privilege grants/policies or narrow SECURITY DEFINER RPCs, then test every role.
-- Do not interpret 
-- Do not interpret RLS-enabled as RLS-complete. Server secrets remain server-only.
alter table public.institutions enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.students enable row level security;
alter table public.processing_authorizations enable row level security;
alter table public.source_imports enable row level security;
alter table public.student_observations enable row level security;
alter table public.finance_observations enable row level security;
alter table public.policy_versions enable row level security;
alter table public.evidence_packets enable row level security;
alter table public.signals enable row level security;
alter table public.intervention_catalog enable row level security;
alter table public.cases enable row level security;
alter table public.case_tasks enable row level security;
alter table public.restricted_task_details enable row level security;
alter table public.case_events enable row level security;
alter table public.follow_ups enable row level security;
alter table public.case_outcomes enable row level security;
alter table public.notification_outbox enable row level security;
commit;
