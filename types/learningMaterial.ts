import { images } from "@/constants/images";

export interface VocabularyItem {
  /** Indonesian word/phrase as displayed, e.g. "steker (colokan)". */
  word: string;
  /** Traditional Chinese translation. */
  translation: string;
  /** Text actually passed to text-to-speech — strips parenthetical alternates. */
  speakText: string;
}

export interface LearningMaterial {
  id: string;
  title: string;
  subtitle: string;
  imageKey: keyof typeof images;
  /** width / height of the source image, for a non-distorted fit inside the scroll view. */
  aspectRatio: number;
  vocabulary: VocabularyItem[];
}
