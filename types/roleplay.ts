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

export interface RoleplayCorrection {
  said: string;
  better: string;
  tip: string;
}

/** A right answer in other words than the comic (Role Play): not a mistake. */
export interface RoleplayAlternative {
  said: string;
  comic: string;
}

export interface RoleplayFeedback {
  praise: string;
  corrections: RoleplayCorrection[];
  alternatives?: RoleplayAlternative[];
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
