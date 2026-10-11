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
} from "./types";
import { DEMO_PERSONAS, DEMO_CAMPUS_ID, DemoPersona } from "./demo-auth";
import { api } from "./api";

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
    desc: "Case CASE-2026-089 has 36 hours remaining on mentor follow-up",
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
  "stu-1": [
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
      authorAvatar: "/assets/avatar-albert.jpg",
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
  currentPersona: DemoPersona;
  backendConnected: boolean;
  isLoadingBackend: boolean;
  backendError: string | null;
  signals: SignalDTO[];
  cases: CaseDetailDTO[];
  interventions: InterventionItem[];
  mlModelInfo: MLModelInfo | null;
  refreshBackendData: () => Promise<void>;

  // SUTRA Workflow Actions
  reviewSignal: (id: string, req: SignalReviewRequest) => Promise<SignalReviewResponse>;
  assignCase: (id: string, req: CaseAssignmentRequest) => Promise<CaseDetailDTO>;
  acceptCase: (id: string, req?: AcceptAssignmentRequest) => Promise<CaseDetailDTO>;
  transitionCase: (id: string, req: CaseTransitionRequest) => Promise<CaseDetailDTO>;
  createCaseTask: (id: string, req: CreateTaskRequest) => Promise<CaseTaskDTO>;
  recordCaseFollowUp: (id: string, req: FollowUpRequest) => Promise<FollowUpDTO>;
  recordCaseOutcome: (id: string, req: OutcomeRequest) => Promise<CaseOutcomeDTO>;

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
  const currentPersona = DEMO_PERSONAS[activeRole] || DEMO_PERSONAS.faculty;

  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  // SUTRA Data Entities
  const [signals, setSignals] = useState<SignalDTO[]>([]);
  const [cases, setCases] = useState<CaseDetailDTO[]>([]);
  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [mlModelInfo, setMlModelInfo] = useState<MLModelInfo | null>(null);

  // Existing UI compatibility state
  const [user, setUser] = useState({
    ...CURRENT_USER,
    name: currentPersona.name.split(" ")[0],
    fullName: currentPersona.name,
    role: currentPersona.title,
    avatar: currentPersona.avatar,
  });

  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
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
    setActiveRoleState(newRole);
    const persona = DEMO_PERSONAS[newRole];
    api.setToken(persona.token);
    api.setCampusId(DEMO_CAMPUS_ID);
    setUser({
      ...CURRENT_USER,
      name: persona.name.split(" ")[0],
      fullName: persona.name,
      role: persona.title,
      avatar: persona.avatar,
    });
  };

  // Sync with Backend
  const refreshBackendData = async () => {
    setIsLoadingBackend(true);
    setBackendError(null);
    try {
      api.setToken(currentPersona.token);
      api.setCampusId(DEMO_CAMPUS_ID);

      // Check health
      await api.health.check();
      setBackendConnected(true);

      // Fetch model info & interventions
      try {
        const [info, intList] = await Promise.all([
          api.ml.getModelInfo(),
          api.interventions.list(),
        ]);
        setMlModelInfo(info);
        setInterventions(intList);
      } catch (e) {
        console.warn("Non-fatal error loading model info or interventions:", e);
      }

      // Fetch signals and cases
      try {
        const [sigList, caseList] = await Promise.all([
          api.signals.list(),
          api.cases.list(),
        ]);
        setSignals(sigList);
        setCases(caseList);
      } catch (e) {
        console.warn("Non-fatal error loading signals/cases:", e);
      }

      // Fetch students if allowed for current role (Leadership is suppressed per Phase 4)
      if (currentPersona.canViewIndividualStudents) {
        try {
          const rawStus = await api.students.list({ limit: 50 });
          if (rawStus && rawStus.length > 0) {
            // Map backend students into UI format
            const mappedStudents: Student[] = rawStus.map((rs, idx) => {
              const matchingCase = cases.find((c) => c.student_id === rs.id);
              const matchingSignal = signals.find((s) => s.student_id === rs.id);

              let statusText: Student["status"] = "Active";
              if (matchingCase?.is_escalated || matchingSignal?.result === "concern") {
                statusText = "At Risk";
              } else if (rs.enrollment_status === "completed") {
                statusText = "Completed";
              } else if (rs.enrollment_status === "inactive") {
                statusText = "Inactive";
              }

              return {
                id: rs.id,
                name: rs.display_name,
                email: `${rs.external_ref.toLowerCase()}@sutra.edu`,
                course: rs.cohort_code ? `Cohort ${rs.cohort_code}` : "Computer Science (UG)",
                progress: matchingSignal?.result === "concern" ? 42 : 78,
                status: statusText,
                avatar: INITIAL_STUDENTS[idx % INITIAL_STUDENTS.length]?.avatar || "/assets/avatar-sarah.jpg",
                isOnline: idx % 2 === 0,
                enrolledDate: "August 2026",
                lastActive: "Today",
                grade: matchingSignal?.result === "concern" ? "C-" : "A",
                attendance: matchingSignal?.result === "concern" ? "58%" : "92%",
                completedLessons: 6,
                totalLessons: 12,
                bio: `Student ID: ${rs.external_ref} • Active Enrollment`,
              };
            });

            // Merge with initial rich mock students so UI remains visually complete
            const combined = [
              ...mappedStudents,
              ...INITIAL_STUDENTS.filter(
                (is) => !mappedStudents.some((ms) => ms.name.toLowerCase() === is.name.toLowerCase())
              ),
            ];
            setStudents(combined);
          }
        } catch (e: any) {
          console.warn("Could not load student roster:", e);
        }
      }
    } catch (err: any) {
      console.warn("Backend API not reachable; operating in local mode:", err);
      setBackendConnected(false);
      setBackendError(err.message || "Backend offline");
    } finally {
      setIsLoadingBackend(false);
    }
  };

  useEffect(() => {
    refreshBackendData();
  }, [activeRole]);

  // Workflow Handlers
  const reviewSignal = async (id: string, req: SignalReviewRequest): Promise<SignalReviewResponse> => {
    const res = await api.signals.review(id, req);
    await refreshBackendData();
    return res;
  };

  const assignCase = async (id: string, req: CaseAssignmentRequest): Promise<CaseDetailDTO> => {
    const res = await api.cases.assign(id, req);
    await refreshBackendData();
    return res;
  };

  const acceptCase = async (id: string, req?: AcceptAssignmentRequest): Promise<CaseDetailDTO> => {
    const res = await api.cases.accept(id, req);
    await refreshBackendData();
    return res;
  };

  const transitionCase = async (id: string, req: CaseTransitionRequest): Promise<CaseDetailDTO> => {
    const res = await api.cases.transition(id, req);
    await refreshBackendData();
    return res;
  };

  const createCaseTask = async (id: string, req: CreateTaskRequest): Promise<CaseTaskDTO> => {
    const res = await api.cases.createTask(id, req);
    await refreshBackendData();
    return res;
  };

  const recordCaseFollowUp = async (id: string, req: FollowUpRequest): Promise<FollowUpDTO> => {
    const res = await api.cases.recordFollowUp(id, req);
    await refreshBackendData();
    return res;
  };

  const recordCaseOutcome = async (id: string, req: OutcomeRequest): Promise<CaseOutcomeDTO> => {
    const res = await api.cases.recordOutcome(id, req);
    await refreshBackendData();
    return res;
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
      id: `stud-${Date.now()}`,
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
        currentPersona,
        backendConnected,
        isLoadingBackend,
        backendError,
        signals,
        cases,
        interventions,
        mlModelInfo,
        refreshBackendData,
        reviewSignal,
        assignCase,
        acceptCase,
        transitionCase,
        createCaseTask,
        recordCaseFollowUp,
        recordCaseOutcome,
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
