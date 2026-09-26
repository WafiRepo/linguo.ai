export interface RoleplayObjective {
  id: string;
  /** Shown to the student in the mission checklist (繁體中文). */
  label: string;
  /** Tells the AI what the student is trying to do (English, prompt only). */
  goal: string;
  /** Indonesian phrases that count as completing this objective. */
  targets: string[];
}

export interface RoleplayHint {
  text: string;
  translation: string;
}

export interface RoleplayScenario {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  accentColor: string;
  aiName: string;
  /** Who the AI plays, in English — used in the server-side prompt. */
  aiRole: string;
  /** Where the scene happens, in English — used in the server-side prompt. */
  setting: string;
  /** First Indonesian line the AI says to open the scene. */
  openingLine: string;
  objectives: RoleplayObjective[];
  hints: RoleplayHint[];
  xpReward: number;
}
