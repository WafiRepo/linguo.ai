import { LESSONS } from "@/data/lessons";
import { getUnitsForLanguage } from "@/data/units";
import { LanguageCode, Lesson, Unit } from "@/types/learning";

export function getLessonsForLanguage(languageCode: LanguageCode): Lesson[] {
  return getUnitsForLanguage(languageCode).flatMap((unit) =>
    unit.lessonIds
      .map((id) => LESSONS.find((lesson) => lesson.id === id))
      .filter((lesson): lesson is Lesson => Boolean(lesson)),
  );
}

export function getActiveUnit(
  languageCode: LanguageCode,
  completedLessonIds: string[],
): Unit | undefined {
  const units = getUnitsForLanguage(languageCode);
  return (
    units.find((unit) =>
      unit.lessonIds.some((id) => !completedLessonIds.includes(id)),
    ) ?? units[0]
  );
}

export function getNextLesson(
  languageCode: LanguageCode,
  completedLessonIds: string[],
): Lesson | undefined {
  const lessons = getLessonsForLanguage(languageCode);
  return (
    lessons.find((lesson) => !completedLessonIds.includes(lesson.id)) ??
    lessons[0]
  );
}

export function getUnitForLesson(
  languageCode: LanguageCode,
  lessonId: string,
): Unit | undefined {
  const lesson = LESSONS.find((item) => item.id === lessonId);
  if (!lesson) return undefined;

  return getUnitsForLanguage(languageCode).find(
    (unit) => unit.id === lesson.unitId,
  );
}

export function getLessonNumber(
  languageCode: LanguageCode,
  lessonId: string,
): number {
  const lessons = getLessonsForLanguage(languageCode);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 ? index + 1 : 1;
}

export function getCefrLevelForUnit(unitOrder: number): string {
  if (unitOrder <= 2) return "A1";
  if (unitOrder <= 4) return "A2";
  return "B1";
}
