import { images } from "@/constants/images";

export interface ClassDialogueLine {
  id: string;
  zhTW: string;
}

export interface ClassDialogueTurn {
  guruLine: ClassDialogueLine;
  studentLine: ClassDialogueLine;
  expectedAnswers: string[];
  guruPanelIndex: number;
  studentPanelIndex: number;
  guruImageKey: keyof typeof images;
  studentImageKey: keyof typeof images;
}

export interface ClassManagementTopic {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  /** What the comic covers — tutor must not go beyond this. */
  comicScope: string;
  imageKey: keyof typeof images;
  xpReward: number;
  introMessage: string;
  turns: ClassDialogueTurn[];
}

export type ClassMgmtPhase =
  | "intro"
  | "guru_speaking"
  | "student_turn"
  | "complete";
