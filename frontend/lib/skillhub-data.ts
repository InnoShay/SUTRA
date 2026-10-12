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
  name: "Faculty",
  fullName: "Faculty Member",
  role: "Academic Mentor",
  email: "faculty@sutra.edu",
  avatar: "",
  unreadMessages: 0,
  unreadNotifications: 0,
};

export const INITIAL_COURSES: Course[] = [
  {
    id: "inv-1",
    title: "Academic Mentor Check-In",
    subtitle: "Structured bi-weekly mentor review for student progress",
    category: "MENTOR",
    image: "",
    studentsCount: "Active",
    progress: 100,
    status: "Published",
    lessonsCount: 1,
    duration: "48h SLA",
    rating: 5.0,
    instructor: "Faculty Mentor",
  },
  {
    id: "inv-2",
    title: "Subject Tutoring Referral",
    subtitle: "Direct academic peer tutoring and supplemental instruction",
    category: "ACADEMIC",
    image: "",
    studentsCount: "Active",
    progress: 100,
    status: "Published",
    lessonsCount: 1,
    duration: "72h SLA",
    rating: 5.0,
    instructor: "Faculty",
  },
  {
    id: "inv-3",
    title: "Student Wellbeing Referral",
    subtitle: "Confidential counseling coordination under ADR-003 safeguards",
    category: "COUNSELLING",
    image: "",
    studentsCount: "Active",
    progress: 100,
    status: "Published",
    lessonsCount: 1,
    duration: "24h SLA",
    rating: 5.0,
    instructor: "Counselor",
  },
  {
    id: "inv-4",
    title: "Emergency Financial Aid Consultation",
    subtitle: "Financial aid and emergency bursary evaluation",
    category: "FINANCE",
    image: "",
    studentsCount: "Active",
    progress: 100,
    status: "Published",
    lessonsCount: 1,
    duration: "48h SLA",
    rating: 5.0,
    instructor: "Finance Officer",
  },
];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_DISCUSSIONS: CommunityDiscussion[] = [
  {
    id: "disc-featured",
    title: "How can AI improve UX research?",
    author: "Sarah Wilson",
    authorRole: "Educator & Lead",
    authorAvatar: "/assets/avatar-sarah.jpg",
    repliesCount: 245,
    viewsCount: "1.2K",
    participantsCount: 48,
    timeAgo: "Pinned",
    tags: ["AI", "UX Research", "Synthesis"],
    isFeatured: true,
    summary:
      "Exploring how generative clustering, semantic sentiment analysis, and interview transcript summarization enhance rapid customer insights without losing genuine human empathy.",
  },
  {
    id: "disc-1",
    title: "Building your first portfolio",
    author: "Sarah Wilson",
    authorRole: "Author",
    authorAvatar: "/assets/avatar-sarah.jpg",
    repliesCount: 18,
    viewsCount: "640",
    participantsCount: 12,
    timeAgo: "2h ago",
    tags: ["Portfolio", "Career"],
  },
  {
    id: "disc-2",
    title: "Best Figma plugins in 2026",
    author: "Mike Chen",
    authorRole: "Community Member",
    authorAvatar: "/assets/avatar-marvin.jpg",
    repliesCount: 24,
    viewsCount: "890",
    participantsCount: 19,
    timeAgo: "Yesterday",
    tags: ["Figma", "Workflow"],
  },
  {
    id: "disc-3",
    title: "Best Figma plugins in 2026 (Part 2)",
    author: "Mike Chen",
    authorRole: "Community Member",
    authorAvatar: "/assets/avatar-albert.jpg",
    repliesCount: 24,
    viewsCount: "510",
    participantsCount: 16,
    timeAgo: "Yesterday",
    tags: ["Figma", "Plugins"],
  },
  {
    id: "disc-4",
    title: "Design System Tips",
    author: "Emma Davis",
    authorRole: "Design Technologist",
    authorAvatar: "/assets/avatar-jane.jpg",
    repliesCount: 12,
    viewsCount: "430",
    participantsCount: 9,
    timeAgo: "Today",
    tags: ["Design Systems", "Tokens"],
  },
];

export const RECENT_ACTIVITIES: RecentActivityItem[] = [
  {
    id: "act-1",
    courseTitle: "Advanced UI/UX Design",
    actionText: "12 new enrollments",
    timeAgo: "1h ago",
    type: "enrollment",
  },
  {
    id: "act-2",
    courseTitle: "React.js Masterclass",
    actionText: "Lesson updated",
    timeAgo: "3h ago",
    type: "update",
  },
  {
    id: "act-3",
    courseTitle: "React.js Masterclass",
    actionText: "12 new enrollments",
    timeAgo: "5h ago",
    type: "enrollment",
  },
  {
    id: "act-4",
    courseTitle: "Design System Essentials",
    actionText: "12 new enrollments",
    timeAgo: "2h ago",
    type: "enrollment",
  },
];

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
      { name: "UI Design", rate: 82 },
      { name: "React Development", rate: 75 },
      { name: "JavaScript", rate: 82 },
      { name: "UX Research", rate: 63 },
    ],
  },
  activityByDay: {
    hours: ["12 PM", "6 PM", "3 PM"],
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    // matrix intensity: 0 (subtle), 1 (medium), 2 (high)
    matrix: [
      [2, 0, 0, 0, 0, 0, 0], // 12 PM: Mon active
      [0, 1, 1, 0, 0, 1, 0], // 6 PM: Tue, Wed, Sat active
      [0, 0, 0, 1, 0, 0, 1], // 3 PM: Thu, Sun active
    ],
  },
};
