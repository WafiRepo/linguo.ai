import { getLessonsForLanguage } from "@/lib/curriculum";
import { Activity, LanguageCode, Lesson } from "@/types/learning";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getUnlockedLessons(
  languageCode: LanguageCode,
  activeLessonId: string | undefined,
): Lesson[] {
  const lessons = getLessonsForLanguage(languageCode);
  if (lessons.length === 0) return [];

  if (!activeLessonId) {
    return [lessons[0]];
  }

  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeLessonId);
  const unlockUntil = activeIndex >= 0 ? activeIndex : 0;
  return lessons.slice(0, unlockUntil + 1);
}

export function getPracticeActivitiesForLesson(lesson: Lesson): Activity[] {
  return lesson.activities.filter(
    (activity) =>
      activity.type === "multiple-choice" || activity.type === "translate",
  );
}

export function buildMixedPracticeActivities(
  lessons: Lesson[],
  limit = 10,
): Activity[] {
  const activities = lessons.flatMap((lesson) =>
    getPracticeActivitiesForLesson(lesson),
  );
  return shuffle(activities).slice(0, Math.min(limit, activities.length));
}

export function normalizePracticeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isPracticeAnswerCorrect(
  given: string,
  expected: string,
): boolean {
  return normalizePracticeAnswer(given) === normalizePracticeAnswer(expected);
}

export function calculatePracticeXp(
  correctCount: number,
  totalCount: number,
): number {
  if (totalCount === 0) return 0;
  const baseXp = correctCount * 2;
  const perfectBonus = correctCount === totalCount ? 3 : 0;
  return baseXp + perfectBonus;
}
