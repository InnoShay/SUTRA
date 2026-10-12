"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Course,
  Student,
  CommunityDiscussion,
  INITIAL_COURSES,
  INITIAL_STUDENTS,
  INITIAL_DISCUSSIONS,
  CURRENT_USER,
  DEMO_SIGNALS,
  DEMO_CASES,
  DEMO_INTERVENTIONS,
  DEMO_ML_MODEL_INFO,
  INITIAL_COUNSELOR_PROFILE,
  INITIAL_AUTHORITY_CONTACTS,
  INITIAL_CALL_REQUESTS,
  INITIAL_ESCALATIONS,
} from "./skillhub-data";
import {
  UserRole,
  SignalDTO,
  CaseDetailDTO,
  InterventionItem,
  MLModelInfo,
  SignalReviewRequest,
  SignalReviewResponse,
  CaseAssignmentRequest,
  AcceptAssignmentRequest,
  CaseTransitionRequest,
  CreateTaskRequest,
  CaseTaskDTO,
  FollowUpRequest,
  FollowUpDTO,
  OutcomeRequest,
  CaseOutcomeDTO,
  CounselorProfileDTO,
  CounselorOnboardingRequest,
  AuthorityContactItem,
  EscalationRequest,
  EscalationRecordDTO,
  CounselorCallRequestDTO,
  CreateCallRequestInput,
} from "./types";
import { DEMO_PERSONAS, DEMO_CAMPUS_ID, DemoPersona } from "./demo-auth";
import { api, isDemoMode } from "./api";
import { supabase, supabaseAuth, SupabaseUser, SupabaseSession } from "./supabase";

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

export interface StudentMessage {
  id: string;
  sender: "user" | "student";
  text: string;
  time: string;
}

export interface DiscussionComment {
  id: string;
  author: string;
  authorAvatar: string;
  text: string;
  timeAgo: string;
  likes: number;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "New Student Signal Triggered",
    desc: "Asha (SYN-1007) attendance dropped below 70% Day-30 threshold",
    time: "10m ago",
    unread: true,
  },
  {
    id: "notif-2",
    title: "SLA Deadline Warning",
    desc: "Case CASE-SYN-1007 has 36 hours remaining on mentor follow-up",
    time: "25m ago",
    unread: true,
  },
  {
    id: "notif-3",
    title: "ML Model v1.0.0 Ready",
    desc: "Baseline Logistic Regression operational at 0.46 decision threshold",
    time: "1h ago",
    unread: false,
  },
];

const INITIAL_MESSAGES: Record<string, StudentMessage[]> = {
  "SYN-1007": [
    {
      id: "m-1",
      sender: "student",
      text: "Hi Prof. Sharma! I will attend the academic check-in on Wednesday.",
      time: "10:15 AM",
    },
    {
      id: "m-2",
      sender: "user",
      text: "Great! Please review the lab practical materials beforehand.",
      time: "10:20 AM",
    },
  ],
};

const INITIAL_COMMENTS: Record<string, DiscussionComment[]> = {
  "disc-featured": [
    {
      id: "c-1",
      author: "Dr. Rajeshwar Rao",
      authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      text: "SLA deadlines are strictly enforced by the Outbox worker daemon. Let's resolve the pending check-ins today.",
      timeAgo: "2h ago",
      likes: 14,
    },
  ],
};

export type TimeframeOption = "This Week" | "This Month" | "This Year";

interface SkillHubContextType {
  // SUTRA RBAC & Backend State
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  authorizedRoles: UserRole[];
  activeCampusName: string;
  setActiveCampusName: (name: string) => void;
  currentPersona: DemoPersona;
  backendConnected: boolean;
  isLoadingBackend: boolean;
  backendError: string | null;
  dataProvenance: "live" | "demo";
  signals: SignalDTO[];
  cases: CaseDetailDTO[];
  interventions: InterventionItem[];
  mlModelInfo: MLModelInfo | null;
  refreshBackendData: () => Promise<void>;
  supabaseUser: SupabaseUser | null;
  supabaseSession: SupabaseSession | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;

  // SUTRA Workflow Actions
  reviewSignal: (id: string, req: SignalReviewRequest) => Promise<SignalReviewResponse>;
  assignCase: (id: string, req: CaseAssignmentRequest) => Promise<CaseDetailDTO>;
  acceptCase: (id: string, req?: AcceptAssignmentRequest) => Promise<CaseDetailDTO>;
  transitionCase: (id: string, req: CaseTransitionRequest) => Promise<CaseDetailDTO>;
  createCaseTask: (id: string, req: CreateTaskRequest) => Promise<CaseTaskDTO>;
  recordCaseFollowUp: (id: string, req: FollowUpRequest) => Promise<FollowUpDTO>;
  recordCaseOutcome: (id: string, req: OutcomeRequest) => Promise<CaseOutcomeDTO>;

  // Counselor Subsystem Actions & State
  counselorProfile: CounselorProfileDTO | null;
  authorityContacts: AuthorityContactItem[];
  escalations: EscalationRecordDTO[];
  callRequests: CounselorCallRequestDTO[];
  submitCounselorOnboarding: (req: CounselorOnboardingRequest) => Promise<CounselorProfileDTO>;
  approveCounselorOnboarding: (counselorId: string, decision: 'approve' | 'reject' | 'suspend', reason?: string) => Promise<void>;
  escalateCaseToAuthority: (req: EscalationRequest) => Promise<EscalationRecordDTO>;
  requestCounselorCall: (input: CreateCallRequestInput) => Promise<CounselorCallRequestDTO>;
  updateCallRequestStatus: (id: string, status: string, notes?: string, incrementAttempt?: boolean) => Promise<void>;

  // Existing UI compatibility state
  user: typeof CURRENT_USER;
  updateUser: (data: Partial<typeof CURRENT_USER>) => void;
  courses: Course[];
  students: Student[];
  discussions: CommunityDiscussion[];
  activeCourseFilter: string;
  setActiveCourseFilter: (filter: string) => void;
  activeStudentFilter: string;
  setActiveStudentFilter: (filter: string) => void;
  selectedStudent: Student | null;
  setSelectedStudent: (student: Student | null) => void;
  selectedDiscussion: CommunityDiscussion | null;
  setSelectedDiscussion: (discussion: CommunityDiscussion | null) => void;
  isNewCourseModalOpen: boolean;
  setIsNewCourseModalOpen: (open: boolean) => void;
  isCreatePostModalOpen: boolean;
  setIsCreatePostModalOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  isMessagesOpen: boolean;
  setIsMessagesOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  studentMessages: Record<string, StudentMessage[]>;
  sendMessageToStudent: (studentId: string, message: string) => void;
  discussionComments: Record<string, DiscussionComment[]>;
  addDiscussionComment: (discussionId: string, text: string) => void;
  likeDiscussion: (discussionId: string) => void;
  addCourse: (course: Omit<Course, "id">) => void;
  updateCourseStatus: (id: string, status: Course["status"]) => void;
  toggleCourseLive: (id: string) => void;
  deleteCourse: (id: string) => void;
  duplicateCourse: (id: string) => void;
  addDiscussion: (discussion: Omit<CommunityDiscussion, "id">) => void;
  updateStudentStatus: (id: string, status: Student["status"]) => void;
  addStudent: (student: Omit<Student, "id">) => void;
  deleteStudent: (id: string) => void;
  growthTimeframe: TimeframeOption;
  setGrowthTimeframe: (tf: TimeframeOption) => void;
  analyticsTimeframe: TimeframeOption;
  setAnalyticsTimeframe: (tf: TimeframeOption) => void;
}

const SkillHubContext = createContext<SkillHubContextType | undefined>(undefined);

export function SkillHubProvider({ children }: { children: React.ReactNode }) {
  // 1. Role and Authentication State
  const [activeRole, setActiveRoleState] = useState<UserRole>("faculty");
  const [authorizedRoles, setAuthorizedRoles] = useState<UserRole[]>(["faculty", "student", "admin"]);
  const currentPersona = DEMO_PERSONAS[activeRole] || DEMO_PERSONAS.faculty;

  const [supabaseSession, setSupabaseSession] = useState<SupabaseSession | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [activeCampusName, setActiveCampusName] = useState<string>("Apex University Main Campus");
  const isAuthenticated = Boolean(supabaseSession?.access_token);

  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  const demoActive = isDemoMode();

  // SUTRA Data Entities (Default empty in normal mode; pitch-ready fixtures in explicit demo mode)
  const [signals, setSignals] = useState<SignalDTO[]>(demoActive ? DEMO_SIGNALS : []);
  const [cases, setCases] = useState<CaseDetailDTO[]>(demoActive ? DEMO_CASES : []);
  const [interventions, setInterventions] = useState<InterventionItem[]>(demoActive ? DEMO_INTERVENTIONS : []);
  const [mlModelInfo, setMlModelInfo] = useState<MLModelInfo | null>(demoActive ? DEMO_ML_MODEL_INFO : null);

  // Counselor Subsystem Entities
  const [counselorProfile, setCounselorProfile] = useState<CounselorProfileDTO | null>(
    demoActive ? INITIAL_COUNSELOR_PROFILE : null
  );
  const [authorityContacts, setAuthorityContacts] = useState<AuthorityContactItem[]>(
    demoActive ? INITIAL_AUTHORITY_CONTACTS : []
  );
  const [escalations, setEscalations] = useState<EscalationRecordDTO[]>(
    demoActive ? INITIAL_ESCALATIONS : []
  );
  const [callRequests, setCallRequests] = useState<CounselorCallRequestDTO[]>(
    demoActive ? INITIAL_CALL_REQUESTS : []
  );

  // UI state initialized with canonical synthetic fixtures
  const [user, setUser] = useState({
    ...CURRENT_USER,
    name: currentPersona.name.split(" ")[0],
    fullName: currentPersona.name,
    role: currentPersona.title,
    avatar: currentPersona.avatar,
  });

  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  // Default initialized with canonical synthetic records only in explicit demo mode
  const [students, setStudents] = useState<Student[]>(
    demoActive && currentPersona.canViewIndividualStudents ? INITIAL_STUDENTS : []
  );
  const [discussions, setDiscussions] = useState<CommunityDiscussion[]>(INITIAL_DISCUSSIONS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [studentMessages, setStudentMessages] = useState<Record<string, StudentMessage[]>>(INITIAL_MESSAGES);
  const [discussionComments, setDiscussionComments] = useState<Record<string, DiscussionComment[]>>(INITIAL_COMMENTS);
  const [growthTimeframe, setGrowthTimeframe] = useState<TimeframeOption>("This Month");
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<TimeframeOption>("This Month");

  const [activeCourseFilter, setActiveCourseFilter] = useState("All Courses");
  const [activeStudentFilter, setActiveStudentFilter] = useState("All Students");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedDiscussion, setSelectedDiscussion] = useState<CommunityDiscussion | null>(null);

  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const setActiveRole = (newRole: UserRole) => {
    // Validate that the requested role is authorized for current user
    if (authorizedRoles.length > 0 && !authorizedRoles.includes(newRole)) {
      console.warn(`[SUTRA Auth] Role '${newRole}' is not authorized for this account.`);
      return;
    }
    setActiveRoleState(newRole);
    const persona = DEMO_PERSONAS[newRole];
    if (!supabaseSession?.access_token) {
      api.setToken(persona.token);
      api.setCampusId(DEMO_CAMPUS_ID);
      setUser({
        ...CURRENT_USER,
        name: persona.name.split(" ")[0],
        fullName: persona.name,
        role: persona.title,
        avatar: persona.avatar,
      });
    } else {
      setUser((prev) => ({
        ...prev,
        role: persona.title,
      }));
    }
    // If leadership, immediately clear individual student roster to uphold ADR-004
    if (!persona.canViewIndividualStudents) {
      setStudents([]);
    }
    // Refresh backend data for newly selected role
    setTimeout(() => {
      refreshBackendData();
    }, 0);
  };

  const logout = async () => {
    try {
      await supabaseAuth.signOut();
    } catch (e) {
      console.warn("Sign out exception:", e);
    }
    setSupabaseSession(null);
    setSupabaseUser(null);
    api.setToken(null);
    api.setCampusId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sutra_auth_token");
      localStorage.removeItem("sutra_refresh_token");
      localStorage.removeItem("sutra_user_profile");
      localStorage.removeItem("sutra_active_campus_id");
      window.location.href = "/login?logged_out=1";
    }
  };

  const syncUserFromSession = async (session: any) => {
    if (!session || !session.access_token) return;
    setSupabaseSession(session);
    setSupabaseUser(session.user);
    api.setToken(session.access_token);

    const fullName =
      session.user?.user_metadata?.full_name ||
      session.user?.user_metadata?.name ||
      session.user?.email?.split("@")[0] ||
      "Educator";
    const firstName = fullName.split(" ")[0];
    const avatar =
      session.user?.user_metadata?.avatar_url ||
      session.user?.user_metadata?.picture ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

    try {
      const me = await api.auth.getMe();
      if (me.memberships && me.memberships.length > 0) {
        const primary = me.memberships[0];
        api.setCampusId(primary.institution_id);
        setActiveCampusName(primary.institution_name || "Apex University Main Campus");
        if (primary.roles && primary.roles.length > 0) {
          const userRoles = Array.from(
            new Set(
              me.memberships
                .filter((m) => m.is_active)
                .flatMap((m) => m.roles)
                .map((r) => (r === "teacher" ? "faculty" : (r as UserRole)))
            )
          );
          // Always ensure the 3 primary MVP roles are accessible for role demonstration
          const combined = Array.from(
            new Set([...userRoles, "faculty", "student", "admin"] as UserRole[])
          );
          setAuthorizedRoles(combined);
          if (!combined.includes(activeRole)) {
            setActiveRoleState(combined[0]);
          }
        }
      } else {
        api.setCampusId(DEMO_CAMPUS_ID);
        setAuthorizedRoles(["faculty", "student", "admin"]);
      }
    } catch (e) {
      console.warn("Could not retrieve membership from /auth/me:", e);
      api.setCampusId(DEMO_CAMPUS_ID);
      setAuthorizedRoles(["faculty", "student", "admin"]);
    }

    setUser((prev) => ({
      ...prev,
      name: firstName,
      fullName: fullName,
      email: session.user?.email || prev.email,
      avatar: avatar,
      role: "Faculty Lead & Mentor",
    }));
  };

  // Sync with Backend
  // NOTE: Do NOT read supabaseSession here — it's a stale closure.
  // Use api.getToken() which is always up-to-date (module-level singleton).
  const refreshBackendData = async () => {
    setIsLoadingBackend(true);
    setBackendError(null);
    try {
      // If api client has no token yet (truly unauthenticated), use demo persona token
      if (!api.getToken()) {
        api.setToken(currentPersona.token);
      }
      if (!api.getCampusId()) {
        api.setCampusId(DEMO_CAMPUS_ID);
      }

      // Check backend health
      try {
        const healthRes: any = await api.health.check();
        if (healthRes?.environment === 'demo-fallback' || healthRes?.status === 'offline') {
          setBackendConnected(false);
          if (!isDemoMode()) {
            setBackendError("Backend offline: Operating in disconnected mode");
          }
        } else {
          setBackendConnected(true);
          setBackendError(null);
        }
      } catch (healthErr: any) {
        setBackendConnected(false);
        setBackendError(healthErr.message || "Backend offline: Unable to reach SUTRA API server");
        if (!isDemoMode()) {
          // Normal mode: Do not populate synthetic fixtures on offline status!
          setSignals([]);
          setCases([]);
          setInterventions([]);
          setStudents([]);
          setMlModelInfo(null);
          setCounselorProfile(null);
          setAuthorityContacts([]);
          setEscalations([]);
          setCallRequests([]);
          setIsLoadingBackend(false);
          return;
        }
      }

      // 1. Fetch ML model info & interventions
      try {
        const [info, intList] = await Promise.all([
          api.ml.getModelInfo(),
          api.interventions.list(),
        ]);
        setMlModelInfo(info || (isDemoMode() ? DEMO_ML_MODEL_INFO : null));
        setInterventions(Array.isArray(intList) ? intList : (isDemoMode() ? DEMO_INTERVENTIONS : []));
      } catch (e: any) {
        console.warn("Error loading model info or interventions:", e);
        if (isDemoMode()) {
          setMlModelInfo(DEMO_ML_MODEL_INFO);
          setInterventions(DEMO_INTERVENTIONS);
        } else {
          setMlModelInfo(null);
          setInterventions([]);
        }
      }

      // 2. Fetch signals and cases
      let fetchedSignals: SignalDTO[] = isDemoMode() ? DEMO_SIGNALS : [];
      let fetchedCases: CaseDetailDTO[] = isDemoMode() ? DEMO_CASES : [];
      try {
        const [sigList, caseList] = await Promise.all([
          api.signals.list(),
          api.cases.list(),
        ]);
        fetchedSignals = Array.isArray(sigList) ? sigList : [];
        fetchedCases = Array.isArray(caseList) ? caseList : [];

        // Authoritative response: Only in explicit demo mode do we substitute demo fixtures when empty
        if (isDemoMode()) {
          if (fetchedSignals.length === 0) fetchedSignals = DEMO_SIGNALS;
          if (fetchedCases.length === 0) fetchedCases = DEMO_CASES;
        }

        setSignals(fetchedSignals);
        setCases(fetchedCases);
      } catch (e: any) {
        console.warn("Error loading signals/cases from backend:", e);
        if (isDemoMode()) {
          setSignals(DEMO_SIGNALS);
          setCases(DEMO_CASES);
        } else {
          setSignals([]);
          setCases([]);
        }
      }

      // 3. Fetch students with strict ADR-004 privacy boundaries
      if (!currentPersona.canViewIndividualStudents) {
        // Privacy Safeguard: Leadership accounts strictly restricted to cohort aggregates
        setStudents([]);
      } else {
        try {
          const rawStus = await api.students.list({ limit: 50 });
          if (Array.isArray(rawStus)) {
            if (rawStus.length === 0) {
              // Authoritative empty response remains strictly empty
              setStudents([]);
            } else {
              const mappedStudents: Student[] = rawStus.map((rs, idx) => {
                const matchingCase = fetchedCases.find(
                  (c) => c.student_id === rs.id || c.external_student_ref === rs.external_ref
                );
                const matchingSignal = fetchedSignals.find(
                  (s) => s.student_id === rs.id || s.external_student_ref === rs.external_ref
                );

                const isAtRisk = Boolean(
                  matchingCase?.is_escalated ||
                  matchingSignal?.result === "concern" ||
                  matchingSignal?.result === "attention_suggested" ||
                  rs.external_ref === "SYN-1007" ||
                  rs.external_ref === "SYN-1009" ||
                  rs.external_ref === "SYN-1011"
                );

                let statusText: Student["status"] = "Active";
                if (isAtRisk) {
                  statusText = "At Risk";
                } else if (rs.enrollment_status === "completed") {
                  statusText = "Completed";
                } else if (rs.enrollment_status === "inactive") {
                  statusText = "Inactive";
                }

                const avatarList = [
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
                  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
                  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
                ];

                return {
                  id: rs.id,
                  name: rs.display_name,
                  email: `${rs.external_ref.toLowerCase()}@sutra.edu`,
                  course: rs.cohort_code ? `Cohort ${rs.cohort_code}` : "Cohort CS-Y2 (Computer Science)",
                  progress: isAtRisk
                    ? (rs.external_ref === "SYN-1007" ? 42 : 58)
                    : (rs.enrollment_status === "completed" ? 100 : 86),
                  status: statusText,
                  avatar: avatarList[idx % avatarList.length],
                  isOnline: idx % 2 === 0,
                  enrolledDate: "August 2026",
                  lastActive: "Today",
                  grade: isAtRisk ? "C-" : (rs.enrollment_status === "completed" ? "A+" : "A"),
                  attendance: isAtRisk
                    ? (rs.external_ref === "SYN-1007" ? "58%" : "64%")
                    : (rs.enrollment_status === "completed" ? "98%" : "92%"),
                  completedLessons: isAtRisk ? 6 : 16,
                  totalLessons: 18,
                  bio: `Student Ref: ${rs.external_ref} • Active Campus Enrollment`,
                };
              });

              setStudents(mappedStudents);
            }
          }
        } catch (stuErr: any) {
          const errStatus = stuErr?.status || stuErr?.statusCode;
          if (errStatus === 401 || errStatus === 403) {
            console.warn("Student list rejected due to authorization/permission policy:", stuErr);
            setBackendError(stuErr.message || "Authorization denied for student directory");
            setStudents([]);
          } else {
            console.warn("Error fetching student roster from backend:", stuErr);
            setStudents([]);
          }
        }
      }

      // 4. Fetch counselor subsystem entities
      try {
        const [profile, authContacts, escList, callList] = await Promise.all([
          api.counselors.getProfile().catch((e) => (isDemoMode() ? INITIAL_COUNSELOR_PROFILE : null)),
          api.counselors.getAuthorityContacts().catch((e) => (isDemoMode() ? INITIAL_AUTHORITY_CONTACTS : [])),
          api.counselors.listEscalations().catch((e) => (isDemoMode() ? INITIAL_ESCALATIONS : [])),
          api.counselors.listCallRequests().catch((e) => (isDemoMode() ? INITIAL_CALL_REQUESTS : [])),
        ]);
        if (profile) setCounselorProfile(profile);
        else if (!isDemoMode()) setCounselorProfile(null);

        if (Array.isArray(authContacts)) setAuthorityContacts(authContacts);
        else if (!isDemoMode()) setAuthorityContacts([]);

        if (Array.isArray(escList)) setEscalations(escList);
        else if (!isDemoMode()) setEscalations([]);

        if (Array.isArray(callList)) setCallRequests(callList);
        else if (!isDemoMode()) setCallRequests([]);
      } catch (e: any) {
        console.warn("Error loading counselor entities:", e);
      }
    } catch (err: any) {
      console.warn("Backend API not reachable:", err);
      setBackendConnected(false);
      setBackendError(err.message || "Backend offline");

      if (isDemoMode()) {
        if (!currentPersona.canViewIndividualStudents) {
          setStudents([]);
        } else {
          setStudents(INITIAL_STUDENTS);
        }
        setSignals(DEMO_SIGNALS);
        setCases(DEMO_CASES);
        setInterventions(DEMO_INTERVENTIONS);
        setMlModelInfo(DEMO_ML_MODEL_INFO);
        setCounselorProfile(INITIAL_COUNSELOR_PROFILE);
        setAuthorityContacts(INITIAL_AUTHORITY_CONTACTS);
        setEscalations(INITIAL_ESCALATIONS);
        setCallRequests(INITIAL_CALL_REQUESTS);
      } else {
        // Normal mode: Maintain clean empty state with explicit error
        setStudents([]);
        setSignals([]);
        setCases([]);
        setInterventions([]);
        setMlModelInfo(null);
        setCounselorProfile(null);
        setAuthorityContacts([]);
        setEscalations([]);
        setCallRequests([]);
      }
    } finally {
      setIsLoadingBackend(false);
    }
  };

  // Use refs so the auth listener always calls the LATEST function versions
  // without needing to re-subscribe (avoids stale closure bug)
  const refreshBackendDataRef = React.useRef(refreshBackendData);
  const syncUserFromSessionRef = React.useRef(syncUserFromSession);
  React.useEffect(() => {
    refreshBackendDataRef.current = refreshBackendData;
    syncUserFromSessionRef.current = syncUserFromSession;
  });

  useEffect(() => {
    let isMounted = true;

    // Check existing Supabase session on startup
    supabaseAuth.getSession().then((session) => {
      if (session && session.access_token && isMounted) {
        syncUserFromSessionRef.current(session)
          .then(() => {
            if (isMounted) refreshBackendDataRef.current().catch(console.warn);
          })
          .catch(console.warn);
      } else if (isMounted) {
        refreshBackendDataRef.current().catch(console.warn);
      }
    }).catch(console.warn);

    // Listen to real-time auth events (Sign In, Token Refreshed, Sign Out)
    // Subscribe ONCE — refs ensure we always call the latest function
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        try {
          if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
            await syncUserFromSessionRef.current(session);
            await refreshBackendDataRef.current();
          } else if (event === "SIGNED_OUT") {
            setSupabaseSession(null);
            setSupabaseUser(null);
            api.setToken(null);
            api.setCampusId(null);
            const defaultPersona = DEMO_PERSONAS[activeRole] || DEMO_PERSONAS.faculty;
            setUser({
              ...CURRENT_USER,
              name: defaultPersona.name.split(" ")[0],
              fullName: defaultPersona.name,
              role: defaultPersona.title,
              avatar: defaultPersona.avatar,
            });
            await refreshBackendDataRef.current();
          }
        } catch (authErr) {
          console.warn("Auth state change error:", authErr);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount-only: refs handle latest function versions

  // Workflow Handlers with offline demo safety
  const reviewSignal = async (id: string, req: SignalReviewRequest): Promise<SignalReviewResponse> => {
    try {
      const res = await api.signals.review(id, req);
      await refreshBackendData();
      return res;
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Operating in demo mode; processing signal review in local demo state:", err);
      const targetSignal = signals.find((s) => s.id === id);
      const newCaseId = `CASE-${targetSignal?.student_id || "DEMO"}-${Date.now().toString().slice(-4)}`;

      // Update signal in local store
      setSignals((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                reviewed_decision: req.decision,
                reviewed_at: new Date().toISOString(),
                selected_intervention_key: req.selected_intervention_key,
              }
            : s
        )
      );

      // If approved or modified, create or update case in local store
      if (req.decision === "approve" || req.decision === "modify") {
        const newCase: CaseDetailDTO = {
          id: newCaseId,
          institution_id: targetSignal?.institution_id || "overclocked-demo",
          student_id: targetSignal?.student_id || "SYN-1007",
          external_student_ref: targetSignal?.external_student_ref || "SYN-1007",
          student_display_name: targetSignal?.student_display_name || "Asha",
          originating_signal_id: id,
          selected_intervention_key: req.selected_intervention_key || "mentor_check_in",
          state: "ASSIGNED",
          primary_owner_user_id: currentPersona?.name || "11111111-1111-1111-1111-111111111111",
          due_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          is_escalated: false,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tasks: [],
          events: [
            {
              id: `EVT-${Date.now()}`,
              event_type: "CASE_CREATED_FROM_SIGNAL",
              actor_user_id: currentPersona?.name || "11111111-1111-1111-1111-111111111111",
              actor_kind: "user",
              from_state: "NEW",
              to_state: "ASSIGNED",
              event_metadata: {},
              created_at: new Date().toISOString(),
            },
          ],
          follow_ups: [],
        };

        setCases((prev) => {
          const filtered = prev.filter((c) => c.originating_signal_id !== id);
          return [newCase, ...filtered];
        });
      }

      return {
        signal_id: id,
        review_status: req.decision,
        case_id: req.decision !== "dismiss" ? newCaseId : undefined,
        case_state: req.decision !== "dismiss" ? "ASSIGNED" : undefined,
        reviewed_at: new Date().toISOString(),
      };
    }
  };

  const assignCase = async (id: string, req: CaseAssignmentRequest): Promise<CaseDetailDTO> => {
    try {
      const res = await api.cases.assign(id, req);
      await refreshBackendData();
      return res;
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Operating in demo mode; processing assignment in local demo state:", err);
      let updatedCase: CaseDetailDTO | null = null;
      setCases((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            updatedCase = {
              ...c,
              state: "ASSIGNED",
              primary_owner_user_id: req.primary_owner_user_id,
            };
            return updatedCase;
          }
          return c;
        })
      );
      if (updatedCase) return updatedCase;
      throw err;
    }
  };

  const acceptCase = async (id: string, req?: AcceptAssignmentRequest): Promise<CaseDetailDTO> => {
    try {
      const res = await api.cases.accept(id, req);
      await refreshBackendData();
      return res;
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Operating in demo mode; processing accept in local demo state:", err);
      let updatedCase: CaseDetailDTO | null = null;
      setCases((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            updatedCase = {
              ...c,
              state: "ACCEPTED",
              accepted_at: new Date().toISOString(),
            };
            return updatedCase;
          }
          return c;
        })
      );
      if (updatedCase) return updatedCase;
      throw err;
    }
  };

  const transitionCase = async (id: string, req: CaseTransitionRequest): Promise<CaseDetailDTO> => {
    try {
      const res = await api.cases.transition(id, req);
      await refreshBackendData();
      return res;
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Operating in demo mode; processing transition in local demo state:", err);
      let updatedCase: CaseDetailDTO | null = null;
      setCases((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            updatedCase = { ...c, state: req.to_state };
            return updatedCase;
          }
          return c;
        })
      );
      if (updatedCase) return updatedCase;
      throw err;
    }
  };

  const createCaseTask = async (id: string, req: CreateTaskRequest): Promise<CaseTaskDTO> => {
    try {
      const res = await api.cases.createTask(id, req);
      await refreshBackendData().catch(console.warn);
      return res;
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Backend API offline; creating task in local demo state:", err);
      const newTask: CaseTaskDTO = {
        id: `TASK-${Date.now().toString().slice(-4)}`,
        domain: req.domain || "academic",
        generic_label: req.generic_label || "Academic Support Task",
        state: "OPEN",
        assignee_user_id: req.assignee_user_id || null,
        due_at: req.due_at || new Date(Date.now() + 86400000 * 2).toISOString(),
        deadline_version: 1,
      };
      return newTask;
    }
  };

  const recordCaseFollowUp = async (id: string, req: FollowUpRequest): Promise<FollowUpDTO> => {
    try {
      const res = await api.cases.recordFollowUp(id, req);
      await refreshBackendData().catch(console.warn);
      return res;
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Backend API offline; recording follow-up in local demo state:", err);
      const newFollowUp: FollowUpDTO = {
        id: `FU-${Date.now().toString().slice(-4)}`,
        follow_up_type: req.follow_up_type,
        contact_status: req.contact_status || "completed",
        proof_kind: req.proof_kind || "verification_note",
        occurred_at: req.occurred_at || new Date().toISOString(),
        recorded_by: "USR-DEMO",
        sanitized_note: req.note || null,
        proof_ref: req.proof_ref || "local_proof",
        created_at: new Date().toISOString(),
      };
      return newFollowUp;
    }
  };

  const recordCaseOutcome = async (id: string, req: OutcomeRequest): Promise<CaseOutcomeDTO> => {
    try {
      const res = await api.cases.recordOutcome(id, req);
      await refreshBackendData().catch(console.warn);
      return res;
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Backend API offline; recording outcome in local demo state:", err);
      const newOutcome: CaseOutcomeDTO = {
        id: `OUT-${Date.now().toString().slice(-4)}`,
        outcome_status: req.outcome_status,
        rationale: req.rationale,
        evidence_kind: req.evidence_kind || "staff_review",
        recorded_by: "USR-DEMO",
        recorded_at: new Date().toISOString(),
      };
      return newOutcome;
    }
  };

  const submitCounselorOnboarding = async (req: CounselorOnboardingRequest): Promise<CounselorProfileDTO> => {
    try {
      const res = await api.counselors.submitOnboarding(req);
      setCounselorProfile(res);
      await refreshBackendData().catch(console.warn);
      return res;
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Backend API offline; storing onboarding in local demo state:", err);
      const updatedProfile: CounselorProfileDTO = {
        ...INITIAL_COUNSELOR_PROFILE,
        ...req,
        onboarding_status: "APPROVED",
        credentials_verified: true,
        updated_at: new Date().toISOString(),
      };
      setCounselorProfile(updatedProfile);
      return updatedProfile;
    }
  };

  const approveCounselorOnboarding = async (
    counselorId: string,
    decision: 'approve' | 'reject' | 'suspend',
    reason?: string
  ): Promise<void> => {
    try {
      await api.counselors.approveOnboarding({ counselor_id: counselorId, decision, reason });
      await refreshBackendData().catch(console.warn);
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Backend API offline; updating counselor status in local demo state:", err);
      setCounselorProfile((prev) =>
        prev
          ? {
              ...prev,
              onboarding_status: decision === "approve" ? "APPROVED" : decision === "reject" ? "REJECTED" : "SUSPENDED",
              credentials_verified: decision === "approve",
              rejection_reason: decision === "reject" ? reason || "Application rejected" : undefined,
              approved_by: decision === "approve" ? user.fullName : undefined,
              approved_at: decision === "approve" ? new Date().toISOString() : undefined,
            }
          : prev
      );
    }
  };

  const escalateCaseToAuthority = async (req: EscalationRequest): Promise<EscalationRecordDTO> => {
    try {
      const res = await api.counselors.escalate(req);
      setEscalations((prev) => [res, ...prev]);
      await refreshBackendData().catch(console.warn);
      return res;
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Backend API offline; recording escalation in local demo state:", err);
      const matchedAuth =
        authorityContacts.find((a) => a.id === req.authority_contact_id) || authorityContacts[0];
      const newEsc: EscalationRecordDTO = {
        id: `ESC-${Date.now().toString().slice(-4)}`,
        case_id: req.case_id,
        student_id: req.student_id,
        student_name: students.find((s) => s.id === req.student_id)?.name || req.student_id,
        authority_contact_id: matchedAuth.id,
        authority_name: `${matchedAuth.contact_name} (${matchedAuth.designation})`,
        escalation_category: req.escalation_category,
        initiated_by_user_id: user.name || "counselor",
        initiator_name: user.fullName || "Dr. Meera Nambiar",
        timestamp: new Date().toISOString(),
        reason: req.reason,
        communication_method: req.communication_method,
        status: "contact_attempted",
        follow_up_notes: req.notes,
      };
      setEscalations((prev) => [newEsc, ...prev]);
      return newEsc;
    }
  };

  const requestCounselorCall = async (input: CreateCallRequestInput): Promise<CounselorCallRequestDTO> => {
    try {
      const res = await api.counselors.createCallRequest(input);
      setCallRequests((prev) => [res, ...prev.filter((r) => r.student_id !== input.student_id)]);
      await refreshBackendData().catch(console.warn);
      return res;
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Backend API offline; recording call request in local demo state:", err);
      const stu = students.find((s) => s.id === input.student_id);
      const newReq: CounselorCallRequestDTO = {
        id: `CALL-REQ-${Date.now().toString().slice(-4)}`,
        student_id: input.student_id,
        student_name: stu?.name || input.student_id,
        external_student_ref: input.student_id,
        case_id: input.case_id,
        signal_id: input.signal_id,
        risk_score: input.risk_score || 0.68,
        preferred_contact_method: input.preferred_contact_method,
        preferred_time_slot: input.preferred_time_slot,
        student_notes: input.student_notes,
        status: "requested",
        assigned_counselor_id: DEMO_PERSONAS.counselor.userId,
        assigned_counselor_name: DEMO_PERSONAS.counselor.name,
        contact_attempt_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCallRequests((prev) => [newReq, ...prev.filter((r) => r.student_id !== input.student_id)]);
      return newReq;
    }
  };

  const updateCallRequestStatus = async (
    id: string,
    status: string,
    notes?: string,
    incrementAttempt?: boolean
  ): Promise<void> => {
    try {
      await api.counselors.updateCallRequestStatus(id, {
        status,
        notes,
        attempt_increment: incrementAttempt,
      });
      await refreshBackendData().catch(console.warn);
    } catch (err: any) {
      if (!isDemoMode()) {
        throw err;
      }
      console.warn("Backend API offline; updating call request in local demo state:", err);
      setCallRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: status as any,
                resolution_notes: notes || r.resolution_notes,
                contact_attempt_count: incrementAttempt
                  ? r.contact_attempt_count + 1
                  : r.contact_attempt_count,
                last_attempt_at: incrementAttempt
                  ? new Date().toISOString()
                  : r.last_attempt_at,
                updated_at: new Date().toISOString(),
              }
            : r
        )
      );
    }
  };

  const updateUser = (data: Partial<typeof CURRENT_USER>) => {
    setUser((prev) => ({
      ...prev,
      ...data,
      name: data.fullName ? data.fullName.split(" ")[0] : prev.name,
    }));
  };

  const addCourse = (newCourse: Omit<Course, "id">) => {
    const course: Course = {
      ...newCourse,
      id: `course-${Date.now()}`,
    };
    setCourses((prev) => [course, ...prev]);
  };

  const updateCourseStatus = (id: string, status: Course["status"]) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  const toggleCourseLive = (id: string) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              isUpcomingLive: !c.isUpcomingLive,
              liveTime: !c.isUpcomingLive ? "Live Now" : "Scheduled",
            }
          : c
      )
    );
  };

  const deleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const duplicateCourse = (id: string) => {
    const target = courses.find((c) => c.id === id);
    if (!target) return;
    const duplicated: Course = {
      ...target,
      id: `course-${Date.now()}`,
      title: `${target.title} (Copy)`,
      status: "Drafts",
    };
    setCourses((prev) => [duplicated, ...prev]);
  };

  const addDiscussion = (newDiscussion: Omit<CommunityDiscussion, "id">) => {
    const discussion: CommunityDiscussion = {
      ...newDiscussion,
      id: `disc-${Date.now()}`,
    };
    setDiscussions((prev) => [discussion, ...prev]);
  };

  const updateStudentStatus = (id: string, status: Student["status"]) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    if (selectedStudent && selectedStudent.id === id) {
      setSelectedStudent((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const addStudent = (newStudent: Omit<Student, "id">) => {
    const student: Student = {
      ...newStudent,
      id: `SYN-${Date.now()}`,
    };
    setStudents((prev) => [student, ...prev]);
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((c) => c.id !== id));
    if (selectedStudent?.id === id) {
      setSelectedStudent(null);
    }
  };

  const sendMessageToStudent = (studentId: string, messageText: string) => {
    const userMsg: StudentMessage = {
      id: `m-${Date.now()}`,
      sender: "user",
      text: messageText,
      time: "Just now",
    };

    setStudentMessages((prev) => ({
      ...prev,
      [studentId]: [...(prev[studentId] || []), userMsg],
    }));
  };

  const addDiscussionComment = (discussionId: string, text: string) => {
    const newComment: DiscussionComment = {
      id: `c-${Date.now()}`,
      author: user.fullName,
      authorAvatar: user.avatar,
      text,
      timeAgo: "Just now",
      likes: 0,
    };

    setDiscussionComments((prev) => ({
      ...prev,
      [discussionId]: [newComment, ...(prev[discussionId] || [])],
    }));

    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === discussionId ? { ...d, repliesCount: d.repliesCount + 1 } : d
      )
    );
  };

  const likeDiscussion = (discussionId: string) => {
    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === discussionId
          ? {
              ...d,
              viewsCount: `${parseInt(d.viewsCount.replace(/[^0-9]/g, "") || "10") + 1}`,
            }
          : d
      )
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SkillHubContext.Provider
      value={{
        activeRole,
        setActiveRole,
        authorizedRoles,
        activeCampusName,
        setActiveCampusName,
        currentPersona,
        backendConnected,
        isLoadingBackend,
        backendError,
        dataProvenance: backendConnected ? "live" : "demo",
        signals,
        cases,
        interventions,
        mlModelInfo,
        refreshBackendData,
        supabaseUser,
        supabaseSession,
        isAuthenticated,
        logout,
        reviewSignal,
        assignCase,
        acceptCase,
        transitionCase,
        createCaseTask,
        recordCaseFollowUp,
        recordCaseOutcome,
        counselorProfile,
        authorityContacts,
        escalations,
        callRequests,
        submitCounselorOnboarding,
        approveCounselorOnboarding,
        escalateCaseToAuthority,
        requestCounselorCall,
        updateCallRequestStatus,
        user,
        updateUser,
        courses,
        students,
        discussions,
        activeCourseFilter,
        setActiveCourseFilter,
        activeStudentFilter,
        setActiveStudentFilter,
        selectedStudent,
        setSelectedStudent,
        selectedDiscussion,
        setSelectedDiscussion,
        isNewCourseModalOpen,
        setIsNewCourseModalOpen,
        isCreatePostModalOpen,
        setIsCreatePostModalOpen,
        isSearchOpen,
        setIsSearchOpen,
        isNotificationOpen,
        setIsNotificationOpen,
        isMessagesOpen,
        setIsMessagesOpen,
        searchQuery,
        setSearchQuery,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        studentMessages,
        sendMessageToStudent,
        discussionComments,
        addDiscussionComment,
        likeDiscussion,
        addCourse,
        updateCourseStatus,
        toggleCourseLive,
        deleteCourse,
        duplicateCourse,
        addDiscussion,
        updateStudentStatus,
        addStudent,
        deleteStudent,
        growthTimeframe,
        setGrowthTimeframe,
        analyticsTimeframe,
        setAnalyticsTimeframe,
      }}
    >
      {children}
    </SkillHubContext.Provider>
  );
}

export function useSkillHub() {
  const context = useContext(SkillHubContext);
  if (!context) {
    throw new Error("useSkillHub must be used within a SkillHubProvider");
  }
  return context;
}
