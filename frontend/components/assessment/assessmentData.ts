/**
 * SUTRA Student Guidance Assessment - Questionnaire Definitions
 *
 * Self-reflection questionnaire designed to help authorized counselors
 * understand students' self-reported learning habits, motivation, confidence,
 * planning, coping, and aspirations.
 *
 * NOTE: This is a self-reflection tool, not a clinical diagnosis or
 * a validated standardized psychometric test.
 */

export interface LikertOption {
  value: number;
  label: string;
}

export const LIKERT_SCALE_OPTIONS: LikertOption[] = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Not sure" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

export interface AssessmentQuestion {
  id: string; // e.g. "q1", "q2"
  number: number;
  dimensionKey: AssessmentDimensionKey;
  prompt: string;
}

export type AssessmentDimensionKey =
  | "learning_approach"
  | "motivation_engagement"
  | "confidence_self_efficacy"
  | "planning_time_management"
  | "coping_support"
  | "aspirations_career";

export interface AssessmentDimensionMeta {
  key: AssessmentDimensionKey;
  title: string;
  shortDescription: string;
  discussionSuggestion: string;
}

export const ASSESSMENT_DIMENSIONS: AssessmentDimensionMeta[] = [
  {
    key: "learning_approach",
    title: "Learning Approach",
    shortDescription: "Study methods, adaptability, and academic help-seeking",
    discussionSuggestion:
      "Study methods, practice strategies, and subject-specific academic support.",
  },
  {
    key: "motivation_engagement",
    title: "Motivation & Engagement",
    shortDescription: "Academic goal orientation and persistence",
    discussionSuggestion:
      "Personal goals, core academic interests, and barriers to sustained engagement.",
  },
  {
    key: "confidence_self_efficacy",
    title: "Confidence & Self-Efficacy",
    shortDescription: "Growth mindset, asking for support, and resilience after mistakes",
    discussionSuggestion:
      "Recognizing learning progress, comfortable help-seeking, and setting achievable next steps.",
  },
  {
    key: "planning_time_management",
    title: "Planning & Time Management",
    shortDescription: "Organization, task breakdown, and schedule flexibility",
    discussionSuggestion:
      "Task breakdown, daily prioritization, and realistic scheduling routines.",
  },
  {
    key: "coping_support",
    title: "Coping & Support",
    shortDescription: "Managing academic pressure and awareness of support resources",
    discussionSuggestion:
      "Existing coping strategies, trusted support contacts, and campus wellbeing resources.",
  },
  {
    key: "aspirations_career",
    title: "Aspirations & Career Direction",
    shortDescription: "Clarity on academic horizons and career exploration",
    discussionSuggestion:
      "Future interests, academic course options, relevant skills, and career exploration.",
  },
];

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // DIMENSION 1: LEARNING APPROACH
  {
    id: "q1",
    number: 1,
    dimensionKey: "learning_approach",
    prompt: "I understand which study methods help me learn effectively.",
  },
  {
    id: "q2",
    number: 2,
    dimensionKey: "learning_approach",
    prompt:
      "When I struggle to understand a topic, I try a different approach instead of giving up.",
  },
  {
    id: "q3",
    number: 3,
    dimensionKey: "learning_approach",
    prompt:
      "I can identify when I need additional academic help and know how to seek it.",
  },

  // DIMENSION 2: MOTIVATION AND ENGAGEMENT
  {
    id: "q4",
    number: 4,
    dimensionKey: "motivation_engagement",
    prompt: "I feel motivated to work toward my academic goals.",
  },
  {
    id: "q5",
    number: 5,
    dimensionKey: "motivation_engagement",
    prompt:
      "I can connect what I am studying with something I want to achieve in the future.",
  },
  {
    id: "q6",
    number: 6,
    dimensionKey: "motivation_engagement",
    prompt:
      "Even when a subject becomes difficult, I can usually find a reason to keep working on it.",
  },

  // DIMENSION 3: CONFIDENCE AND SELF-EFFICACY
  {
    id: "q7",
    number: 7,
    dimensionKey: "confidence_self_efficacy",
    prompt:
      "I believe I can improve my performance through practice and effort.",
  },
  {
    id: "q8",
    number: 8,
    dimensionKey: "confidence_self_efficacy",
    prompt:
      "I feel comfortable asking teachers, mentors, or classmates for help when I need it.",
  },
  {
    id: "q9",
    number: 9,
    dimensionKey: "confidence_self_efficacy",
    prompt:
      "When I make a mistake, I can identify what I could do differently next time.",
  },

  // DIMENSION 4: PLANNING AND TIME MANAGEMENT
  {
    id: "q10",
    number: 10,
    dimensionKey: "planning_time_management",
    prompt:
      "I can organize my academic tasks and keep track of deadlines.",
  },
  {
    id: "q11",
    number: 11,
    dimensionKey: "planning_time_management",
    prompt:
      "I break large assignments or goals into smaller, manageable steps.",
  },
  {
    id: "q12",
    number: 12,
    dimensionKey: "planning_time_management",
    prompt:
      "When my plans are not working, I can adjust them to make progress.",
  },

  // DIMENSION 5: COPING AND SUPPORT
  {
    id: "q13",
    number: 13,
    dimensionKey: "coping_support",
    prompt: "I have healthy ways to manage academic pressure.",
  },
  {
    id: "q14",
    number: 14,
    dimensionKey: "coping_support",
    prompt:
      "I can recognize when stress is affecting my studies or daily routine.",
  },
  {
    id: "q15",
    number: 15,
    dimensionKey: "coping_support",
    prompt:
      "I know at least one person or support service I can approach when I am struggling.",
  },

  // DIMENSION 6: ASPIRATIONS AND CAREER DIRECTION
  {
    id: "q16",
    number: 16,
    dimensionKey: "aspirations_career",
    prompt:
      "I have an idea of what I want to achieve academically or professionally over the next year.",
  },
  {
    id: "q17",
    number: 17,
    dimensionKey: "aspirations_career",
    prompt:
      "I understand which skills or experiences could help me move toward my future goals.",
  },
  {
    id: "q18",
    number: 18,
    dimensionKey: "aspirations_career",
    prompt:
      "I feel able to explore different academic or career options when I am uncertain about my direction.",
  },
];

// Optional unscored reflection questions
export const REFLECTION_Q19_OPTIONS = [
  "Academic performance",
  "Motivation",
  "Confidence",
  "Time management",
  "Stress or pressure",
  "Career or academic direction",
  "Personal circumstances",
  "Other",
  "Prefer not to say",
] as const;

export const REFLECTION_Q20_OPTIONS = [
  "A practical study plan",
  "Help setting goals",
  "Support with motivation or confidence",
  "Guidance exploring career options",
  "Help identifying useful support resources",
  "Something else",
  "Not sure yet",
] as const;

export const ASSESSMENT_DISCLAIMER =
  "These scores summarize self-reported responses. They are not validated norms, diagnoses, or definitive measures of ability.";

export const CONSENT_TEXT = {
  title: "About the Student Guidance Assessment",
  description:
    "This 18-question self-reflection assessment is designed to help you reflect on your study habits, motivation, confidence, time management, and support resources before speaking with a counselor.",
  points: [
    "Takes approximately 3–4 minutes to complete.",
    "This is a self-reflection tool, not a clinical diagnosis or standardized psychometric test.",
    "Skipping questions is permitted. Skipped questions are never scored as zero.",
    "Your responses remain in this active session and are not saved permanently without your explicit review.",
    "Dimension summaries serve as open discussion topics, not automated evaluations or labels.",
  ],
  consentPrompt:
    "I understand that this is a voluntary self-reflection questionnaire for counseling preparation, not a diagnostic or clinical test.",
};
