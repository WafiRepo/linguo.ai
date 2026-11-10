import type { RoleplayCorrection } from "@/types/roleplay";

export type PortfolioMode = "practice" | "roleplay";
export type PortfolioRole = "student" | "teacher" | "admin";

/** What the phone sends after a Latihan or Role Play session. */
export interface NewSessionResult {
  clientId: string;
  topicId: string;
  mode: PortfolioMode;
  completed: boolean;
  objectivesDone: number;
  objectivesTotal: number;
  xpEarned: number;
  stars: number[];
  praise: string | null;
  corrections: RoleplayCorrection[];
  durationSeconds: number;
  /** When the session ended on the phone (ISO), so late uploads keep their date. */
  createdAt: string;
  /** Profile details, kept up to date on the server for teachers. */
  nickname: string | null;
  classGroup: string | null;
}

/** One saved session, as the portfolio screen shows it. */
export interface SessionResult {
  clientId: string;
  topicId: string;
  mode: PortfolioMode;
  completed: boolean;
  objectivesDone: number;
  objectivesTotal: number;
  xpEarned: number;
  stars: number[];
  praise: string | null;
  corrections: RoleplayCorrection[];
  durationSeconds: number;
  createdAt: string;
}

export interface StudentSummary {
  userId: string;
  nickname: string | null;
  classGroup: string | null;
}

/** One row of a teacher's "My students" list. */
export interface StudentOverview extends StudentSummary {
  sessionsCount: number;
  /** Topics with both Practice and Role Play finished. */
  topicsCompleted: number;
  /** Parts (A, B, C) with an issued certificate. */
  certificateParts: string[];
  lastActiveAt: string | null;
}

/** GET /api/portfolio */
export interface PortfolioResponse {
  role: PortfolioRole;
  student: StudentSummary;
  sessions: SessionResult[];
  /** Only for teachers/admins looking at their own portfolio page. */
  students?: StudentOverview[];
}
