import {
  InterventionItem,
  MLModelInfo,
  SignalDTO,
  CaseDetailDTO,
  ObservationDTO,
  CounselorProfileDTO,
  AuthorityContactItem,
  EscalationRecordDTO,
  CounselorCallRequestDTO,
  CounselorCalendarEvent,
} from "./types";
import { DEMO_CAMPUS_ID } from "./demo-auth";

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  image: string;
  studentsCount: string;
  progress: number;
  status: "Published" | "Drafts" | "Archived";
  lessonsCount: number;
  duration: string;
  rating: number;
  instructor: string;
  isUpcomingLive?: boolean;
  liveTime?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  course: string;
  progress: number;
  status: "Active" | "At Risk" | "Completed" | "Inactive";
  avatar: string;
  isOnline: boolean;
  enrolledDate: string;
  lastActive: string;
  grade: string;
  attendance: string;
  completedLessons: number;
  totalLessons: number;
  bio?: string;
  cohort_code?: string;
  external_ref?: string;
}

export interface CommunityDiscussion {
  id: string;
  title: string;
  author: string;
  authorRole: string;
  authorAvatar: string;
  repliesCount: number;
  viewsCount: string;
  participantsCount: number;
  timeAgo: string;
  tags: string[];
  isFeatured?: boolean;
  summary?: string;
}

export interface RecentActivityItem {
  id: string;
  courseTitle: string;
  actionText: string;
  timeAgo: string;
  type: "enrollment" | "update";
}

export const CURRENT_USER = {
  name: "Ananya",
  fullName: "Prof. Ananya Sharma",
  role: "Course Instructor & Faculty Mentor",
  email: "faculty@sutra.edu",
  avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  unreadMessages: 0,
  unreadNotifications: 2,
};

export const INITIAL_COURSES: Course[] = [
  {
    id: "course-1",
    title: "Data Structures & Algorithms (CS201)",
    subtitle: "Core algorithmic complexity, tree balancing, and graph traversal",
    category: "Core Computer Science",
    image: "/assets/course-figma.jpg",
    studentsCount: "64",
    progress: 58.4,
    status: "Published",
    lessonsCount: 24,
    duration: "48h 00m",
    rating: 4.85,
    instructor: "Prof. Arvind Verma",
  },
  {
    id: "course-2",
    title: "Computer Organization & Architecture (CS202)",
    subtitle: "Instruction set architectures, pipeline hazards, and memory hierarchies",
    category: "Systems",
    image: "/assets/course-uiux.jpg",
    studentsCount: "64",
    progress: 42.0,
    status: "Published",
    lessonsCount: 36,
    duration: "52h 30m",
    rating: 4.9,
    instructor: "Prof. Ananya Sharma",
    isUpcomingLive: true,
    liveTime: "Today, 10:00 AM",
  },
  {
    id: "course-3",
    title: "Discrete Mathematics & Linear Algebra (MA201)",
    subtitle: "Propositional logic, combinatorics, graph theory, and matrix transforms",
    category: "Mathematics",
    image: "/assets/course-typography.jpg",
    studentsCount: "64",
    progress: 68.2,
    status: "Published",
    lessonsCount: 30,
    duration: "45h 00m",
    rating: 4.78,
    instructor: "Dr. Rajeshwar Rao",
  },
  {
    id: "course-4",
    title: "Database Management Systems (CS204)",
    subtitle: "Relational models, normal forms, transaction isolation, and query indexing",
    category: "Core Computer Science",
    image: "/assets/course-webdesign.jpg",
    studentsCount: "64",
    progress: 82.5,
    status: "Published",
    lessonsCount: 28,
    duration: "40h 00m",
    rating: 4.92,
    instructor: "Prof. Arvind Verma",
  },
  {
    id: "course-5",
    title: "Software Engineering & System Design (CS205)",
    subtitle: "Design patterns, CI/CD pipelines, modular architecture, and code quality",
    category: "Engineering Practices",
    image: "/assets/course-uiux.jpg",
    studentsCount: "64",
    progress: 25.0,
    status: "Drafts",
    lessonsCount: 20,
    duration: "30h 00m",
    rating: 4.88,
    instructor: "Prof. Ananya Sharma",
  },
  {
    id: "course-6",
    title: "Operating Systems & Distributed Systems (CS206)",
    subtitle: "Process scheduling, virtual memory, synchronization primitives, and RPCs",
    category: "Systems",
    image: "/assets/course-figma.jpg",
    studentsCount: "64",
    progress: 100,
    status: "Archived",
    lessonsCount: 32,
    duration: "48h 00m",
    rating: 4.95,
    instructor: "Prof. S. K. Kulkarni",
  },
];

/**
 * Canonical SUTRA Synthetic Demonstration Student Roster.
 * Strict 1-to-1 correlation with docs/fixtures/demo_seed.json and scripts/seed_demo_data.py.
 * Legacy template student records are permanently eliminated from active application paths.
 */
export const INITIAL_STUDENTS: Student[] = [
  {
    id: "SYN-1007",
    name: "Asha (synthetic)",
    email: "syn-1007@sutra.edu",
    course: "Cohort CS-Y2 (Computer Science)",
    progress: 42.0,
    status: "At Risk",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    isOnline: true,
    enrolledDate: "August 15, 2026",
    lastActive: "Today, 10:15 AM",
    grade: "C-",
    attendance: "58%",
    completedLessons: 6,
    totalLessons: 18,
    bio: "Synthetic demonstration profile. Triggered Day-30 academic & attendance risk signal.",
  },
  {
    id: "SYN-1008",
    name: "Dev (synthetic)",
    email: "syn-1008@sutra.edu",
    course: "Cohort CS-Y2 (Computer Science)",
    progress: 78.5,
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    isOnline: true,
    enrolledDate: "August 15, 2026",
    lastActive: "Today, 09:30 AM",
    grade: "B+",
    attendance: "88%",
    completedLessons: 14,
    totalLessons: 18,
    bio: "Synthetic demonstration profile. Consistent attendance and submission record.",
  },
  {
    id: "SYN-1009",
    name: "Ira (synthetic)",
    email: "syn-1009@sutra.edu",
    course: "Cohort CS-Y2 (Computer Science)",
    progress: 52.0,
    status: "At Risk",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    isOnline: true,
    enrolledDate: "August 15, 2026",
    lastActive: "Just now",
    grade: "C+",
    attendance: "64%",
    completedLessons: 9,
    totalLessons: 18,
    bio: "Synthetic demonstration profile. Triggered assignment backlog alert; escalated for HOD review.",
  },
  {
    id: "SYN-1010",
    name: "Noor (synthetic)",
    email: "syn-1010@sutra.edu",
    course: "Cohort CS-Y2 (Computer Science)",
    progress: 84.0,
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    isOnline: false,
    enrolledDate: "August 15, 2026",
    lastActive: "Yesterday",
    grade: "A-",
    attendance: "91%",
    completedLessons: 15,
    totalLessons: 18,
    bio: "Synthetic demonstration profile. Active participation in collaborative labs; completed tutoring.",
  },
  {
    id: "SYN-1011",
    name: "Milan (synthetic)",
    email: "syn-1011@sutra.edu",
    course: "Cohort CS-Y2 (Computer Science)",
    progress: 58.0,
    status: "At Risk",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    isOnline: false,
    enrolledDate: "August 15, 2026",
    lastActive: "2 days ago",
    grade: "B-",
    attendance: "62%",
    completedLessons: 10,
    totalLessons: 18,
    bio: "Synthetic demonstration profile. Undergoing confidential student wellbeing consultation.",
  },
  {
    id: "SYN-1012",
    name: "Tara (synthetic)",
    email: "syn-1012@sutra.edu",
    course: "Cohort CS-Y2 (Computer Science)",
    progress: 95.0,
    status: "Completed",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    isOnline: true,
    enrolledDate: "August 15, 2026",
    lastActive: "Today, 11:00 AM",
    grade: "A+",
    attendance: "98%",
    completedLessons: 18,
    totalLessons: 18,
    bio: "Synthetic demonstration profile. Completed foundational assessment milestones.",
  },
];

export const INITIAL_DISCUSSIONS: CommunityDiscussion[] = [
  {
    id: "disc-featured",
    title: "Cross-Disciplinary Protocol: Day-30 Attendance Drop Interventions",
    author: "Dr. Rajeshwar Rao",
    authorRole: "Dean of Academic Affairs & HOD",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    repliesCount: 16,
    viewsCount: "340",
    participantsCount: 8,
    timeAgo: "Pinned",
    tags: ["Policy", "Retention", "Intervention"],
    isFeatured: true,
    summary:
      "Guidelines for coordinating between faculty mentors and counseling specialists when Day-30 multi-domain evaluations indicate concurrent attendance and academic risk.",
  },
  {
    id: "disc-1",
    title: "Standardizing Outbox SLA Timelines for Student Wellbeing Cases",
    author: "Dr. Meera Nambiar",
    authorRole: "Senior Student Counselor",
    authorAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    repliesCount: 9,
    viewsCount: "185",
    participantsCount: 6,
    timeAgo: "2h ago",
    tags: ["Counseling", "SLA", "Wellbeing"],
  },
  {
    id: "disc-2",
    title: "Lab Practical Attendance Tracking & Commuter Transit Challenges",
    author: "Prof. Ananya Sharma",
    authorRole: "Course Instructor & Faculty Mentor",
    authorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    repliesCount: 12,
    viewsCount: "220",
    participantsCount: 7,
    timeAgo: "Yesterday",
    tags: ["Academic", "Attendance", "Mentorship"],
  },
  {
    id: "disc-3",
    title: "Remedial Tutoring Coordination for Discrete Mathematics (MA201)",
    author: "Prof. Arvind Verma",
    authorRole: "Course Instructor",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    repliesCount: 7,
    viewsCount: "140",
    participantsCount: 5,
    timeAgo: "Today",
    tags: ["Tutoring", "Mathematics", "Academic Support"],
  },
];

export const RECENT_ACTIVITIES: RecentActivityItem[] = [
  {
    id: "act-1",
    courseTitle: "Cohort CS-Y2 (Computer Science)",
    actionText: "Day-30 evaluation completed",
    timeAgo: "1h ago",
    type: "enrollment",
  },
  {
    id: "act-2",
    courseTitle: "Data Structures & Algorithms (CS201)",
    actionText: "Assessment results synced",
    timeAgo: "3h ago",
    type: "update",
  },
  {
    id: "act-3",
    courseTitle: "Computer Organization (CS202)",
    actionText: "Lab attendance uploaded",
    timeAgo: "5h ago",
    type: "enrollment",
  },
  {
    id: "act-4",
    courseTitle: "Discrete Mathematics (MA201)",
    actionText: "Remedial session scheduled",
    timeAgo: "2h ago",
    type: "update",
  },
];

// =========================================================================
// Canonical SUTRA Demo Synthetic Datasets (docs/fixtures/demo_seed.json)
// Used when operating in explicit Synthetic Demo Mode or backend offline.
// =========================================================================

export const DEMO_INTERVENTIONS: InterventionItem[] = [
  {
    id: "int-mentor-checkin",
    intervention_key: "mentor_check_in",
    display_label: "Academic Mentor Check-In",
    domain: "mentor",
    recipient_role: "faculty",
    required_purpose_key: "student_support",
    requires_human_approval: true,
    description: "Standard protocol for Academic Mentor Check-In",
  },
  {
    id: "int-academic-tutoring",
    intervention_key: "academic_tutoring_offer",
    display_label: "Subject Tutoring Referral",
    domain: "academic",
    recipient_role: "faculty",
    required_purpose_key: "student_support",
    requires_human_approval: true,
    description: "Standard protocol for Subject Tutoring Referral",
  },
  {
    id: "int-fee-emergency",
    intervention_key: "fee_emergency_counselling",
    display_label: "Emergency Financial Aid Consultation",
    domain: "finance",
    recipient_role: "finance",
    required_purpose_key: "fee_support",
    requires_human_approval: true,
    description: "Standard protocol for Emergency Financial Aid Consultation",
  },
  {
    id: "int-counselling-referral",
    intervention_key: "counselling_referral",
    display_label: "Student Wellbeing Referral",
    domain: "counselling",
    recipient_role: "counselor",
    required_purpose_key: "student_support",
    requires_human_approval: true,
    description: "Standard protocol for Student Wellbeing Referral",
  },
];

export const DEMO_ML_MODEL_INFO: MLModelInfo = {
  model_name: "LogisticRegression_Day30",
  model_version: "v1.0.0",
  status: "operational",
  threshold: 0.46,
  cutoff_days: 30,
  features: [
    "attendance_rate",
    "missing_assignments_count",
    "vle_total_clicks_d30",
    "vle_active_days_d30",
    "vle_clicks_poststart_d30",
  ],
  decision_threshold: 0.46,
  active_policy_key: "POLICY-DEMO-2026-V1",
};

export const DEMO_SIGNALS: SignalDTO[] = [
  {
    id: "SIG-SYN-1007",
    institution_id: DEMO_CAMPUS_ID,
    student_id: "SYN-1007",
    external_student_ref: "SYN-1007",
    student_display_name: "Asha (synthetic)",
    rule_key: "ug_attendance_drop",
    result: "attention_suggested",
    quality_state: "sufficient",
    explanation: {
      attendance_rate: 0.58,
      missing_assignments_count: 3,
      baseline_risk_probability: 0.68,
      summary: "Attendance dropped to 58% (policy threshold: 70%). 3 assignments unsubmitted.",
    },
    evaluated_at: "2026-10-10T12:00:00Z",
    reviewed_decision: null, // PENDING TRIAGE
    reviewed_by: null,
    reviewed_at: null,
    evidence_digest:
      "Day-30 attendance rate 58% dropped below policy threshold 70%. 3 assignments missing. Baseline ML risk 0.68 exceeds 0.46 threshold.",
    evidence_card: {
      card_type: "ml_early_warning_evidence",
      model_name: "logistic_regression_baseline",
      model_version: "1.0.0",
      prediction_cutoff: "Day 30",
      risk_probability: 0.68,
      threshold: 0.46,
      classification: "At_Risk",
      attributions: [
        { feature: "attendance_rate", value: 0.58, attribution: 0.42, direction: "increases_risk" },
        { feature: "missing_assignments_count", value: 3, attribution: 0.28, direction: "increases_risk" },
        { feature: "vle_active_days_d30", value: 8, attribution: 0.14, direction: "increases_risk" },
      ],
      limitations: [
        "A decision as of 2026-10-07 excludes latest_score because it was only available on 2026-10-10",
        "Stale participation is labelled stale/insufficient evidence, not zero activity",
        "Restricted fee-support details are strictly segregated (ADR-003)",
      ],
    },
  },
  {
    id: "SIG-SYN-1009",
    institution_id: DEMO_CAMPUS_ID,
    student_id: "SYN-1009",
    external_student_ref: "SYN-1009",
    student_display_name: "Ira (synthetic)",
    rule_key: "assignment_backlog",
    result: "attention_suggested",
    quality_state: "sufficient",
    explanation: {
      missing_assignments_count: 2,
      summary: "2 unsubmitted assignments across programming modules. VLE activity decelerating.",
    },
    evaluated_at: "2026-10-11T09:30:00Z",
    reviewed_decision: null, // PENDING TRIAGE
    reviewed_by: null,
    reviewed_at: null,
    evidence_digest:
      "2 coursework milestones missing in core modules. ML risk probability 0.74 exceeds early intervention threshold 0.46.",
    evidence_card: {
      card_type: "ml_early_warning_evidence",
      model_name: "logistic_regression_baseline",
      model_version: "1.0.0",
      prediction_cutoff: "Day 30",
      risk_probability: 0.74,
      threshold: 0.46,
      classification: "At_Risk",
      attributions: [
        { feature: "missing_assignments_count", value: 2, attribution: 0.38, direction: "increases_risk" },
        { feature: "attendance_rate", value: 0.64, attribution: 0.22, direction: "increases_risk" },
      ],
      limitations: [
        "Excludes non-modular course records.",
      ],
    },
  },
  {
    id: "SIG-SYN-1011",
    institution_id: DEMO_CAMPUS_ID,
    student_id: "SYN-1011",
    external_student_ref: "SYN-1011",
    student_display_name: "Milan (synthetic)",
    rule_key: "faculty_feedback_concern",
    result: "attention_suggested",
    quality_state: "sufficient",
    explanation: {
      support_check_requested: true,
      summary: "Faculty mentor flagged student wellness check-in requirement.",
    },
    evaluated_at: "2026-10-09T14:15:00Z",
    reviewed_decision: "approve", // REVIEWED
    reviewed_by: "11111111-1111-1111-1111-111111111111",
    reviewed_at: "2026-10-10T10:00:00Z",
    review_reason_code: "FACULTY_SUPPORT_REQUESTED",
    evidence_digest: "Faculty mentor requested wellness check-in. Approved for student counseling consultation.",
    evidence_card: {
      card_type: "deterministic_rule_evidence",
      model_name: "faculty_feedback_concern",
      classification: "Attention Suggested",
      attributions: [
        { feature: "support_check_requested", value: true, attribution: 0.35, direction: "increases_risk" },
      ],
    },
  },
  {
    id: "SIG-SYN-1008",
    institution_id: DEMO_CAMPUS_ID,
    student_id: "SYN-1008",
    external_student_ref: "SYN-1008",
    student_display_name: "Dev (synthetic)",
    rule_key: "all_metrics_normal",
    result: "no_rule_triggered",
    quality_state: "sufficient",
    explanation: {
      summary: "All academic and attendance metrics within standard performance bounds.",
    },
    evaluated_at: "2026-10-08T08:00:00Z",
    reviewed_decision: "dismiss", // REVIEWED
    reviewed_by: "11111111-1111-1111-1111-111111111111",
    reviewed_at: "2026-10-08T16:30:00Z",
    review_reason_code: "BENIGN_PROFILE_VERIFIED",
    evidence_digest: "Verified nominal learning pace. Attendance 94%, 0 missing assignments.",
    evidence_card: {
      card_type: "deterministic_rule_evidence",
      model_name: "all_metrics_normal",
      classification: "Normal",
    },
  },
  {
    id: "SIG-SYN-1010",
    institution_id: DEMO_CAMPUS_ID,
    student_id: "SYN-1010",
    external_student_ref: "SYN-1010",
    student_display_name: "Noor (synthetic)",
    rule_key: "ug_attendance_drop",
    result: "attention_suggested",
    quality_state: "sufficient",
    explanation: {
      summary: "Historical attendance drop successfully recovered after peer tutoring.",
    },
    evaluated_at: "2026-10-07T11:00:00Z",
    reviewed_decision: "approve", // REVIEWED
    reviewed_by: "33333333-3333-3333-3333-333333333333",
    reviewed_at: "2026-10-07T15:00:00Z",
    review_reason_code: "TUTORING_COMPLETED_RESOLVED",
    evidence_digest: "Peer tutoring assigned and completed. Attendance recovered to 91%.",
    evidence_card: {
      card_type: "deterministic_rule_evidence",
      model_name: "ug_attendance_drop",
      classification: "Attention Suggested",
    },
  },
];

export const DEMO_CASES: CaseDetailDTO[] = [
  {
    id: "CASE-SYN-1007",
    institution_id: DEMO_CAMPUS_ID,
    student_id: "SYN-1007",
    external_student_ref: "SYN-1007",
    student_display_name: "Asha (synthetic)",
    originating_signal_id: "SIG-SYN-1007",
    selected_intervention_key: "mentor_check_in",
    state: "IN_PROGRESS",
    primary_owner_user_id: "11111111-1111-1111-1111-111111111111",
    due_at: "2026-10-15T12:00:00Z",
    accepted_at: "2026-10-12T08:00:00Z",
    is_escalated: false,
    version: 2,
    created_at: "2026-10-11T06:00:00Z",
    updated_at: "2026-10-12T08:00:00Z",
    tasks: [
      {
        id: "TASK-SYN-1007-1",
        domain: "mentor",
        generic_label: "Initial 1-on-1 Academic Mentorship Session",
        state: "in_progress",
        assignee_user_id: "11111111-1111-1111-1111-111111111111",
        due_at: "2026-10-14T12:00:00Z",
        deadline_version: 1,
      },
      {
        id: "TASK-SYN-1007-2",
        domain: "counselling",
        generic_label: "Student Wellness Resource Check",
        state: "pending",
        assignee_user_id: "22222222-2222-2222-2222-222222222222",
        due_at: "2026-10-17T12:00:00Z",
        deadline_version: 1,
      },
    ],
    events: [
      {
        id: "EVT-SYN-1007-1",
        event_type: "SUPPORT_STARTED",
        actor_user_id: "11111111-1111-1111-1111-111111111111",
        actor_kind: "user",
        from_state: "ACCEPTED",
        to_state: "IN_PROGRESS",
        reason_code: "FOLLOWUP_INITIATED",
        event_metadata: { initiated_by: "Prof. Ananya Sharma" },
        created_at: "2026-10-12T08:00:00Z",
      },
    ],
    follow_ups: [
      {
        id: "FU-SYN-1007-1",
        follow_up_type: "contact_attempt",
        contact_status: "student_reached",
        proof_kind: "appointment_record",
        occurred_at: "2026-10-12T07:30:00Z",
        recorded_by: "11111111-1111-1111-1111-111111111111",
        sanitized_note: "Student met in office; confirmed commuting challenges affecting morning sessions. Arranged hybrid lab schedule.",
        proof_ref: "CAL-OFFICE-OCT12",
        created_at: "2026-10-12T07:35:00Z",
      },
    ],
  },
  {
    id: "CASE-SYN-1009",
    institution_id: DEMO_CAMPUS_ID,
    student_id: "SYN-1009",
    external_student_ref: "SYN-1009",
    student_display_name: "Ira (synthetic)",
    originating_signal_id: "SIG-SYN-1009",
    selected_intervention_key: "academic_tutoring_offer",
    state: "UNDER_REVIEW",
    primary_owner_user_id: "33333333-3333-3333-3333-333333333333",
    due_at: "2026-10-16T17:00:00Z",
    accepted_at: undefined,
    is_escalated: true, // Urgent Escalation for HOD SLA
    version: 1,
    created_at: "2026-10-11T14:00:00Z",
    updated_at: "2026-10-11T14:00:00Z",
    tasks: [],
    events: [
      {
        id: "EVT-SYN-1009-1",
        event_type: "CASE_REVIEW_STARTED",
        actor_user_id: "33333333-3333-3333-3333-333333333333",
        actor_kind: "user",
        from_state: "NEW",
        to_state: "UNDER_REVIEW",
        reason_code: "ESCALATED_TO_HOD",
        event_metadata: { reviewer: "Dr. Rajeshwar Rao", reason: "Multiple assignment backlog" },
        created_at: "2026-10-11T14:00:00Z",
      },
    ],
    follow_ups: [],
  },
  {
    id: "CASE-SYN-1011",
    institution_id: DEMO_CAMPUS_ID,
    student_id: "SYN-1011",
    external_student_ref: "SYN-1011",
    student_display_name: "Milan (synthetic)",
    originating_signal_id: "SIG-SYN-1011",
    selected_intervention_key: "counselling_referral",
    state: "FOLLOW_UP_REQUIRED",
    primary_owner_user_id: "22222222-2222-2222-2222-222222222222",
    due_at: "2026-10-14T10:00:00Z",
    accepted_at: "2026-10-10T11:00:00Z",
    is_escalated: false,
    version: 3,
    created_at: "2026-10-09T15:00:00Z",
    updated_at: "2026-10-12T09:00:00Z",
    tasks: [
      {
        id: "TASK-SYN-1011-1",
        domain: "counselling",
        generic_label: "Intake Counseling Session",
        state: "completed",
        assignee_user_id: "22222222-2222-2222-2222-222222222222",
        due_at: "2026-10-11T15:00:00Z",
        completed_at: "2026-10-11T14:30:00Z",
        deadline_version: 1,
      },
      {
        id: "TASK-SYN-1011-2",
        domain: "counselling",
        generic_label: "Follow-Up Study Habit & Stress Check",
        state: "in_progress",
        assignee_user_id: "22222222-2222-2222-2222-222222222222",
        due_at: "2026-10-14T10:00:00Z",
        deadline_version: 1,
      },
    ],
    events: [
      {
        id: "EVT-SYN-1011-1",
        event_type: "CONTACT_ATTEMPTED",
        actor_user_id: "22222222-2222-2222-2222-222222222222",
        actor_kind: "user",
        from_state: "ACCEPTED",
        to_state: "FOLLOW_UP_REQUIRED",
        reason_code: "INTAKE_COMPLETED",
        event_metadata: { notes: "Intake session completed. Follow-up required." },
        created_at: "2026-10-11T15:00:00Z",
      },
    ],
    follow_ups: [
      {
        id: "FU-SYN-1011-1",
        follow_up_type: "contact_attempt",
        contact_status: "student_reached",
        proof_kind: "appointment_record",
        occurred_at: "2026-10-11T14:00:00Z",
        recorded_by: "22222222-2222-2222-2222-222222222222",
        sanitized_note: "Initial counseling intake completed via Google Meet. Student shared positive feedback; time management guide provided.",
        proof_ref: "MEET-INTAKE-OCT11",
        created_at: "2026-10-11T14:35:00Z",
      },
    ],
  },
  {
    id: "CASE-SYN-1010",
    institution_id: DEMO_CAMPUS_ID,
    student_id: "SYN-1010",
    external_student_ref: "SYN-1010",
    student_display_name: "Noor (synthetic)",
    originating_signal_id: "SIG-SYN-1010",
    selected_intervention_key: "academic_tutoring_offer",
    state: "RESOLVED",
    primary_owner_user_id: "11111111-1111-1111-1111-111111111111",
    due_at: "2026-10-08T18:00:00Z",
    accepted_at: "2026-10-07T16:00:00Z",
    is_escalated: false,
    version: 4,
    created_at: "2026-10-07T15:00:00Z",
    updated_at: "2026-10-11T12:00:00Z",
    tasks: [
      {
        id: "TASK-SYN-1010-1",
        domain: "academic",
        generic_label: "Discrete Mathematics Remedial Tutoring",
        state: "completed",
        assignee_user_id: "11111111-1111-1111-1111-111111111111",
        due_at: "2026-10-08T18:00:00Z",
        completed_at: "2026-10-08T17:30:00Z",
        deadline_version: 1,
      },
    ],
    events: [
      {
        id: "EVT-SYN-1010-1",
        event_type: "CASE_CLOSED",
        actor_user_id: "11111111-1111-1111-1111-111111111111",
        actor_kind: "user",
        from_state: "SUPPORT_IN_PROGRESS",
        to_state: "RESOLVED",
        reason_code: "OBJECTIVES_MET",
        event_metadata: { final_score: 82 },
        created_at: "2026-10-11T12:00:00Z",
      },
    ],
    follow_ups: [
      {
        id: "FU-SYN-1010-1",
        follow_up_type: "contact_attempt",
        contact_status: "student_reached",
        proof_kind: "assessment_score",
        occurred_at: "2026-10-08T17:00:00Z",
        recorded_by: "11111111-1111-1111-1111-111111111111",
        sanitized_note: "Tutorial completed; all homework problems re-graded with 82% mastery score.",
        proof_ref: "GRADE-REC-OCT08",
        created_at: "2026-10-08T17:35:00Z",
      },
    ],
  },
];

export const DEMO_OBSERVATIONS: Record<string, ObservationDTO[]> = {
  "SYN-1007": [
    {
      id: "obs-1",
      domain: "attendance",
      metric_key: "attendance_rate",
      value: 0.58,
      unit: "ratio",
      quality_state: "good",
      event_at: "2026-10-02T00:00:00Z",
      available_at: "2026-10-02T12:00:00Z",
      ingested_at: "2026-10-02T12:05:00Z",
      source_system: "synthetic_fixture_v1",
    },
    {
      id: "obs-2",
      domain: "academic",
      metric_key: "missing_assignments_count",
      value: 3,
      quality_state: "good",
      event_at: "2026-10-05T00:00:00Z",
      available_at: "2026-10-05T12:00:00Z",
      ingested_at: "2026-10-05T12:05:00Z",
      source_system: "synthetic_fixture_v1",
    },
    {
      id: "obs-3",
      domain: "participation",
      metric_key: "weekly_activity_count",
      value: 2,
      quality_state: "stale",
      event_at: "2026-10-05T00:00:00Z",
      available_at: "2026-10-05T12:00:00Z",
      ingested_at: "2026-10-05T12:05:00Z",
      source_system: "synthetic_fixture_v1",
    },
    {
      id: "obs-4",
      domain: "skills",
      metric_key: "skill_rubric_status",
      value: "needs_review",
      quality_state: "good",
      event_at: "2026-10-01T00:00:00Z",
      available_at: "2026-10-02T12:00:00Z",
      ingested_at: "2026-10-02T12:05:00Z",
      source_system: "synthetic_fixture_v1",
    },
    {
      id: "obs-5",
      domain: "faculty_feedback",
      metric_key: "support_check_requested",
      value: true,
      quality_state: "good",
      event_at: "2026-10-06T00:00:00Z",
      available_at: "2026-10-06T12:00:00Z",
      ingested_at: "2026-10-06T12:05:00Z",
      source_system: "synthetic_fixture_v1",
    },
  ],
};

// ==============================================================
// Canonical SUTRA Counselor Subsystem Initial Data Fixtures
// ==============================================================

export const INITIAL_COUNSELOR_PROFILE: CounselorProfileDTO = {
  id: "COUNSELOR-001",
  user_id: "22222222-2222-2222-2222-222222222222",
  full_name: "Dr. Meera Nambiar",
  email: "counselor@sutra.edu",
  phone: "+91 98765 43210",
  designation: "Senior Student Counselor",
  department: "Student Wellbeing & Counseling Services",
  specializations: [
    "Academic Stress Management",
    "Transition Counseling",
    "Cognitive Behavioral Support",
  ],
  campus_id: DEMO_CAMPUS_ID,
  campus_name: "SUTRA Main Campus",
  qualification: "Ph.D. in Clinical Psychology (NIMHANS)",
  certifications: [
    "Certified Counseling Psychologist (RCI)",
    "Trauma-Informed Student Care",
  ],
  registration_number: "RCI-CRR-2018-94812",
  credentials_verified: true,
  contact_methods: ["phone", "in_person", "video"],
  availability_schedule: "Mon - Fri, 09:30 AM - 05:30 PM",
  availability_status: "available",
  preferred_notification: "email_and_sms",
  assigned_cohorts: [
    "Cohort CS-Y2 (Computer Science)",
    "Cohort EC-Y2 (Electronics)",
  ],
  onboarding_status: "APPROVED",
  approved_by: "Dr. Rajeshwar Rao (Dean)",
  approved_at: "2026-08-01T10:00:00Z",
  created_at: "2026-07-28T09:00:00Z",
  updated_at: "2026-10-12T08:00:00Z",
};

export const INITIAL_AUTHORITY_CONTACTS: AuthorityContactItem[] = [
  {
    id: "AUTH-01",
    service_name: "Counseling & Wellbeing Supervision",
    contact_name: "Dr. Arvind Verma",
    designation: "Chief Counseling Supervisor & Clinical Director",
    department: "Department of Clinical Psychology & Wellbeing",
    escalation_category: "counseling_supervisor",
    contact_number: "+91 80 2345 6701",
    contact_email: "supervisor.wellbeing@sutra.edu",
    communication_method: "phone",
    availability: "Mon-Sat, 09:00 - 18:00 (On-Call for Critical)",
    verified: true,
    is_emergency: false,
  },
  {
    id: "AUTH-02",
    service_name: "Office of Student Affairs & Welfare",
    contact_name: "Prof. S. K. Kulkarni",
    designation: "Dean of Student Affairs",
    department: "Student Welfare & Disciplinary Directorate",
    escalation_category: "student_welfare",
    contact_number: "+91 80 2345 6702",
    contact_email: "studentaffairs@sutra.edu",
    communication_method: "phone",
    availability: "Mon-Fri, 09:30 - 17:30",
    verified: true,
    is_emergency: false,
  },
  {
    id: "AUTH-03",
    service_name: "Academic Affairs Directorate",
    contact_name: "Dr. Rajeshwar Rao",
    designation: "Dean of Academic Affairs & HOD",
    department: "Academic Operations & Examination Cell",
    escalation_category: "academic_support",
    contact_number: "+91 80 2345 6703",
    contact_email: "dean@sutra.edu",
    communication_method: "email",
    availability: "Mon-Fri, 10:00 - 17:00",
    verified: true,
    is_emergency: false,
  },
  {
    id: "AUTH-04",
    service_name: "Institutional Emergency Response & Health Center",
    contact_name: "Campus Medical & Crisis Desk",
    designation: "Chief Medical Officer",
    department: "Campus Health Center & Security Directorate",
    escalation_category: "institutional_emergency",
    contact_number: "+91 80 2345 9999",
    contact_email: "emergency.response@sutra.edu",
    communication_method: "phone",
    availability: "24/7 Rapid Response",
    verified: true,
    is_emergency: true,
  },
  {
    id: "AUTH-05",
    service_name: "Campus Health Center Clinic",
    contact_name: "Dr. Anita Deshmukh",
    designation: "Campus Medical Officer",
    department: "Health & First Aid Center",
    escalation_category: "campus_medical",
    contact_number: "+91 80 2345 6705",
    contact_email: "healthcenter@sutra.edu",
    communication_method: "phone",
    availability: "Mon-Sat, 08:00 - 20:00",
    verified: true,
    is_emergency: false,
  },
];

export const INITIAL_CALL_REQUESTS: CounselorCallRequestDTO[] = [
  {
    id: "CALL-REQ-1007",
    student_id: "SYN-1007",
    student_name: "Asha (synthetic)",
    external_student_ref: "SYN-1007",
    case_id: "CASE-SYN-1007",
    signal_id: "SIG-SYN-1007",
    risk_score: 0.68,
    preferred_contact_method: "phone",
    preferred_time_slot: "afternoon",
    student_notes: "Would like guidance on managing lab deadlines and academic workload.",
    status: "requested",
    assigned_counselor_id: "22222222-2222-2222-2222-222222222222",
    assigned_counselor_name: "Dr. Meera Nambiar",
    contact_attempt_count: 0,
    created_at: "2026-10-12T07:30:00Z",
    updated_at: "2026-10-12T07:30:00Z",
  },
];

export const INITIAL_ESCALATIONS: EscalationRecordDTO[] = [
  {
    id: "ESC-001",
    case_id: "CASE-SYN-1007",
    student_id: "SYN-1007",
    student_name: "Asha (synthetic)",
    authority_contact_id: "AUTH-01",
    authority_name: "Dr. Arvind Verma (Chief Counseling Supervisor)",
    escalation_category: "counseling_supervisor",
    initiated_by_user_id: "22222222-2222-2222-2222-222222222222",
    initiator_name: "Dr. Meera Nambiar",
    timestamp: "2026-10-12T08:15:00Z",
    reason: "Severe attendance drop across 3 consecutive laboratory modules requiring supervisor triage alignment.",
    communication_method: "phone",
    status: "contact_attempted",
    follow_up_notes: "Follow-up discussion scheduled with student welfare coordinator for Thursday 11:00 AM.",
  },
];

export interface CalendarAttachment {
  dayOfWeek: number;
  color: 'peach' | 'sky' | 'lavender';
  title: string;
  studentName: string;
  notes: string;
}

export const INITIAL_CALENDAR_ATTACHMENTS: CalendarAttachment[] = [
  {
    dayOfWeek: 2, // Tuesday
    color: 'peach',
    title: 'Consultation Note: Asha S. - Exam Stress Strategy',
    studentName: 'Asha (synthetic)',
    notes: 'Prescribed 15-minute pomodoro breakdown and coordinated with Prof. Sharma for assignment deadline cushion.',
  },
  {
    dayOfWeek: 3, // Wednesday
    color: 'sky',
    title: 'Wellbeing Intake Form: Ira - Attendance Triage',
    studentName: 'Ira (synthetic)',
    notes: 'Health center clearance attached. Attendance concession recommended for 3 consecutive days.',
  },
  {
    dayOfWeek: 3, // Wednesday
    color: 'lavender',
    title: 'Academic Concession Slip: Physics Lab Evaluation',
    studentName: 'Milan (synthetic)',
    notes: 'Signed by Dean Rao for lab make-up session scheduling.',
  },
  {
    dayOfWeek: 4, // Thursday
    color: 'lavender',
    title: 'Intervention Plan: Computer Science Exam Accommodations',
    studentName: 'Tara (synthetic)',
    notes: 'Peer tutoring pairing confirmed with Year 3 mentor.',
  },
  {
    dayOfWeek: 6, // Saturday
    color: 'peach',
    title: 'Weekend Debrief Summary: 4 Consultations Completed',
    studentName: 'Counselor Team',
    notes: 'Weekly cohort wellbeing status marked green across 88% of mentored students.',
  },
];

export const INITIAL_CALENDAR_EVENTS: CounselorCalendarEvent[] = [
  {
    id: "evt-1",
    title: "Academic Stress Review",
    studentId: "SYN-1007",
    studentName: "Asha (synthetic)",
    category: "academic",
    dayOfWeek: 2, // Tuesday
    startTime: "07:00",
    endTime: "07:40",
    durationLabel: "7:00am - 7:40am",
    status: "pending",
    color: "lavender",
    locationOrMode: "Room 102 / Wellness Desk",
    notes: "Review academic anxiety, lab submission deadlines, and persistence strategies.",
  },
  {
    id: "evt-2",
    title: "Anxiety & Workload Check-in",
    studentId: "SYN-1009",
    studentName: "Ira (synthetic)",
    category: "wellbeing",
    dayOfWeek: 2, // Tuesday
    startTime: "07:30",
    endTime: "09:00",
    durationLabel: "7:30am - 9:00am",
    status: "pending",
    color: "sky",
    locationOrMode: "Studio 4 / Online Call",
    notes: "Stress de-escalation for project submission milestones and cognitive workload balancing.",
  },
  {
    id: "evt-3",
    title: "Lab Attendance Follow-up",
    studentId: "SYN-1011",
    studentName: "Milan (synthetic)",
    category: "attendance",
    dayOfWeek: 2, // Tuesday
    startTime: "10:00",
    endTime: "10:40",
    durationLabel: "10:00am - 10:40am",
    status: "pending",
    color: "lavender",
    locationOrMode: "Lab Hall B",
    notes: "Follow-up on laboratory attendance drop, peer tutoring alignment, and assignment backlog.",
  },
  {
    id: "evt-4",
    title: "Wellbeing & Sports Routine",
    studentId: "SYN-1010",
    studentName: "Noor (synthetic)",
    category: "wellbeing",
    dayOfWeek: 2, // Tuesday
    startTime: "10:50",
    endTime: "12:10",
    durationLabel: "10:50am - 12:10pm",
    status: "confirmed",
    color: "peach",
    locationOrMode: "Wellness Center - Cabin 2",
    notes: "Physical health rehabilitation, sleep routine check, and extracurricular scheduling clearance.",
  },
  {
    id: "evt-5",
    title: "Midterm Preparation Strategy",
    studentId: "SYN-1008",
    studentName: "Rohan (synthetic)",
    category: "academic",
    dayOfWeek: 4, // Thursday
    startTime: "09:30",
    endTime: "10:30",
    durationLabel: "9:30am - 10:30am",
    status: "pending",
    color: "lavender",
    locationOrMode: "Google Meet",
    notes: "Midterm revision planning, study schedule breakdown, and test accommodation.",
  },
  {
    id: "evt-6",
    title: "Career & Internship Guidance",
    studentId: "SYN-1012",
    studentName: "Tara (synthetic)",
    category: "career",
    dayOfWeek: 4, // Thursday
    startTime: "10:30",
    endTime: "12:00",
    durationLabel: "10:30am - 12:00pm",
    status: "confirmed",
    color: "mint",
    locationOrMode: "Coding Lab 3",
    notes: "Placement readiness, technical interview confidence building, and course persistence.",
  },
  {
    id: "evt-7",
    title: "Weekly Persistence Debrief",
    studentId: "SYN-1007",
    studentName: "Asha (synthetic)",
    category: "academic",
    dayOfWeek: 6, // Saturday
    startTime: "09:30",
    endTime: "10:30",
    durationLabel: "9:30am - 10:30am",
    status: "pending",
    color: "lavender",
    locationOrMode: "Phone Consultation",
    notes: "Weekly wellness check-in, mentor feedback review, and milestone validation.",
  },
  {
    id: "evt-8",
    title: "Mental Health Care Consultation",
    studentId: "SYN-1011",
    studentName: "Milan (synthetic)",
    category: "wellbeing",
    dayOfWeek: 6, // Saturday
    startTime: "10:30",
    endTime: "12:00",
    durationLabel: "10:30am - 12:00pm",
    status: "confirmed",
    color: "peach",
    locationOrMode: "Sports Complex Room A",
    notes: "Re-engagement debrief, stress coping mechanisms, and weekend routine check.",
  },
];


