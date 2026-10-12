import {
  InterventionItem,
  MLModelInfo,
  SignalDTO,
  CaseDetailDTO,
  ObservationDTO,
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
    progress: 92.0,
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    isOnline: true,
    enrolledDate: "August 15, 2026",
    lastActive: "Just now",
    grade: "A",
    attendance: "96%",
    completedLessons: 17,
    totalLessons: 18,
    bio: "Synthetic demonstration profile. High engagement across programming modules.",
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
    bio: "Synthetic demonstration profile. Active participation in collaborative labs.",
  },
  {
    id: "SYN-1011",
    name: "Milan (synthetic)",
    email: "syn-1011@sutra.edu",
    course: "Cohort CS-Y2 (Computer Science)",
    progress: 68.0,
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    isOnline: false,
    enrolledDate: "August 15, 2026",
    lastActive: "2 days ago",
    grade: "B",
    attendance: "79%",
    completedLessons: 12,
    totalLessons: 18,
    bio: "Synthetic demonstration profile. Steady academic trajectory with moderate lab activity.",
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
    rule_key: "DAY30_EARLY_WARNING",
    result: "concern",
    quality_state: "good",
    explanation: {
      attendance_rate: 0.58,
      missing_assignments_count: 3,
      baseline_risk_probability: 0.68,
    },
    evaluated_at: "2026-10-06T12:00:00Z",
    evidence_digest:
      "Day-30 attendance rate 58% dropped below policy threshold 70%. 3 assignments missing. Baseline ML risk 0.68 exceeds 0.46 threshold.",
    evidence_card: {
      card_type: "ml_early_warning",
      model_name: "LogisticRegression_Day30",
      model_version: "v1.0.0",
      prediction_cutoff: "Day 30",
      risk_probability: 0.68,
      threshold: 0.46,
      classification: "At_Risk",
      attributions: [
        { feature: "attendance_rate", value: 0.58, attribution: 0.42, direction: "negative" },
        { feature: "missing_assignments_count", value: 3, attribution: 0.28, direction: "negative" },
        { feature: "vle_active_days_d30", value: 8, attribution: 0.14, direction: "negative" },
      ],
      limitations: [
        "A decision as of 2026-10-07 excludes latest_score because it was only available on 2026-10-10",
        "Stale participation is labelled stale/insufficient evidence, not zero activity",
        "Restricted fee-support details are strictly segregated (ADR-003)",
      ],
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
    version: 1,
    created_at: "2026-10-12T06:00:00Z",
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
        sanitized_note: "Student met in office; confirmed commuting challenges affecting morning sessions.",
        proof_ref: "CAL-OFFICE-OCT12",
        created_at: "2026-10-12T07:35:00Z",
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

// Preserved for component rendering in Phase 1; to be remediated in Phases 2-4
export const ANALYTICS_DATA = {
  growthOverview: {
    activeLearners: "25k",
    newEnrollments: "12K",
    totalEnrollments: "15K",
    growthPercentage: 42,
  },
  learningAnalytics: {
    totalStudents: { value: "28K", change: "+15% vs last week", isPositive: true },
    avgLearningTime: { value: "4h32m", change: "-15% vs last week", isPositive: false },
    completionRate: { value: "68.4%", change: "+12% vs last week", isPositive: true },
  },
  studentEngagementTrend: {
    consistentEngagement: "+ 6.91%",
    points: [
      { month: "Jan", value: 320 },
      { month: "Feb", value: 340 },
      { month: "Mar", value: 410 },
      { month: "Apr", value: 780 },
      { month: "May", value: 1450 },
      { month: "Jun", value: 2600 },
      { month: "Jul", value: 4000 },
    ],
  },
  learningProgressOverview: [
    { month: "Jan", value: 3200, label: "3.2K" },
    { month: "Feb", value: 2400, label: "2.4K" },
    { month: "Mar", value: 3000, label: "3.0K" },
    { month: "Apr", value: 3800, label: "3.8K", isHighlight: true },
    { month: "May", value: 2700, label: "2.7K" },
    { month: "Jun", value: 3500, label: "3.5K" },
    { month: "Jul", value: 4100, label: "4.1K" },
  ],
  coursePerformance: {
    overallRate: 78,
    categories: [
      { name: "Core CS", rate: 82 },
      { name: "Mathematics", rate: 75 },
      { name: "Systems", rate: 82 },
      { name: "Engineering Practices", rate: 63 },
    ],
  },
  activityByDay: {
    hours: ["12 PM", "6 PM", "3 PM"],
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    matrix: [
      [2, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 1, 0],
      [0, 0, 0, 1, 0, 0, 1],
    ],
  },
};
