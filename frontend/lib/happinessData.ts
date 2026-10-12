/**
 * SUTRA Happiness Index - Questionnaire & Dimension Definitions
 *
 * Weekly Happiness Pulse: 6 lightweight dimensions, 1 question per dimension.
 * Used for aggregate campus experience, wellbeing, and institutional improvement.
 *
 * SAFEGUARDS & GOVERNANCE:
 * - This is NOT a clinical assessment, diagnostic tool, or psychological risk score.
 * - This is NOT an individual student ranking, competition, or academic metric.
 * - Aggregate reporting enforces a minimum threshold of 10 respondents for privacy.
 */

import { HappinessDimensionKey, HappinessQuestion } from "./types";

export const HAPPINESS_QUESTIONNAIRE_VERSION = "v1.0-weekly";
export const HAPPINESS_MIN_SAMPLE_THRESHOLD = 10; // Minimum respondents required for aggregate display

export interface HappinessLikertOption {
  value: number;
  label: string;
  shortLabel: string;
}

export const HAPPINESS_LIKERT_OPTIONS: HappinessLikertOption[] = [
  { value: 1, label: "Strongly disagree", shortLabel: "Strongly Disagree" },
  { value: 2, label: "Disagree", shortLabel: "Disagree" },
  { value: 3, label: "Neither agree nor disagree", shortLabel: "Neutral" },
  { value: 4, label: "Agree", shortLabel: "Agree" },
  { value: 5, label: "Strongly agree", shortLabel: "Strongly Agree" },
];

export interface HappinessDimensionMeta {
  key: HappinessDimensionKey;
  title: string;
  shortTitle: string;
  description: string;
  focusArea: string;
}

export const HAPPINESS_DIMENSIONS: HappinessDimensionMeta[] = [
  {
    key: "emotional_wellbeing",
    title: "Emotional Wellbeing",
    shortTitle: "Wellbeing",
    description: "How students have been feeling emotionally over the past week.",
    focusArea: "General mood, emotional stability, and overall day-to-day balance.",
  },
  {
    key: "belonging_community",
    title: "Belonging & Community",
    shortTitle: "Belonging",
    description: "Whether students feel welcomed and connected to campus peers and faculty.",
    focusArea: "Peer connectedness, community integration, and feeling valued.",
  },
  {
    key: "academic_experience",
    title: "Academic Experience",
    shortTitle: "Workload",
    description: "How manageable coursework and academic obligations have felt recently.",
    focusArea: "Course pacing, assignment pressure, and academic workload balance.",
  },
  {
    key: "support_trust",
    title: "Support & Trust",
    shortTitle: "Support",
    description: "Whether students know where to seek guidance and trust campus resources.",
    focusArea: "Clarity of advisory channels, mentoring reachability, and institutional trust.",
  },
  {
    key: "safety_respect",
    title: "Safety & Respect",
    shortTitle: "Inclusion",
    description: "Whether students experience an inclusive, fair, and respectful campus environment.",
    focusArea: "Psychological safety, mutual respect, and inclusive learning spaces.",
  },
  {
    key: "growth_confidence",
    title: "Growth & Future Confidence",
    shortTitle: "Growth",
    description: "Whether students feel they are progressing toward personal and academic goals.",
    focusArea: "Purpose, learning momentum, and optimism about future milestones.",
  },
];

export const HAPPINESS_QUESTIONS: HappinessQuestion[] = [
  {
    id: "q1_emotional",
    dimensionKey: "emotional_wellbeing",
    prompt: "Over the past week, I have generally felt emotionally well.",
    order: 1,
  },
  {
    id: "q2_belonging",
    dimensionKey: "belonging_community",
    prompt: "I feel that I belong to my college community.",
    order: 2,
  },
  {
    id: "q3_academic",
    dimensionKey: "academic_experience",
    prompt: "My academic workload has felt manageable over the past week.",
    order: 3,
  },
  {
    id: "q4_support",
    dimensionKey: "support_trust",
    prompt: "I know where to turn when I need academic or personal support.",
    order: 4,
  },
  {
    id: "q5_safety",
    dimensionKey: "safety_respect",
    prompt: "I have felt respected and included in my college environment.",
    order: 5,
  },
  {
    id: "q6_growth",
    dimensionKey: "growth_confidence",
    prompt: "I feel that I am making progress toward my personal or academic goals.",
    order: 6,
  },
];

export interface HappinessInterpretationBand {
  key: "strong" | "positive" | "needs_attention" | "priority_review";
  label: string;
  min: number;
  max: number;
  description: string;
  colorClass: string;
  badgeClass: string;
}

export const HAPPINESS_INTERPRETATION_BANDS: HappinessInterpretationBand[] = [
  {
    key: "strong",
    label: "Strong",
    min: 80,
    max: 100,
    description: "Indicates high self-reported satisfaction and positive campus sentiment.",
    colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  {
    key: "positive",
    label: "Positive",
    min: 65,
    max: 79.99,
    description: "Indicates generally constructive student experiences across key dimensions.",
    colorClass: "text-blue-700 bg-blue-50 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  {
    key: "needs_attention",
    label: "Needs Attention",
    min: 50,
    max: 64.99,
    description: "Signals emergent pressure points where support or advisory review is advised.",
    colorClass: "text-amber-700 bg-amber-50 border-amber-200",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  },
  {
    key: "priority_review",
    label: "Priority for Review",
    min: 0,
    max: 49.99,
    description: "Signals significant student friction or disengagement requiring institutional inquiry.",
    colorClass: "text-rose-700 bg-rose-50 border-rose-200",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
  },
];

export const HAPPINESS_PRIVACY_DISCLOSURE = {
  summary:
    "Your weekly pulse responses are combined into aggregate campus trends to help faculty and leadership improve the student environment.",
  points: [
    "Individual responses are never shared on leaderboards or used to rank students.",
    "This check-in is not a clinical diagnosis, disciplinary metric, or academic grading factor.",
    "Optional reflections are reviewed solely by authorized student support staff under strict institutional privacy and are never processed by external third-party AI models.",
    "Aggregate reporting requires a minimum of 10 respondents to safeguard individual anonymity.",
  ],
};
