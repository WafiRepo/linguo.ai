// AI Teacher topics grouped into the three certificate parts.
// Plain data with no imports, so both the app and the API routes can use it.
// Keep in sync with data/classManagement.ts.
export type CurriculumPart = "A" | "B" | "C";

export const CURRICULUM_PARTS: Record<CurriculumPart, string[]> = {
  A: ["topik-1", "topik-2", "topik-3"],
  B: Array.from({ length: 11 }, (_, index) => `b-topik-${index + 1}`),
  C: Array.from({ length: 4 }, (_, index) => `c-topik-${index + 1}`),
};

export const PART_KEYS: CurriculumPart[] = ["A", "B", "C"];

export function partOfTopic(topicId: string): CurriculumPart {
  if (topicId.startsWith("b-")) return "B";
  if (topicId.startsWith("c-")) return "C";
  return "A";
}

/** Certificate course titles, printed on the PDF. */
export const PART_TITLES: Record<CurriculumPart, { zh: string; en: string }> = {
  A: { zh: "A 部分：課前準備", en: "Part A: Getting Ready for Class" },
  B: { zh: "B 部分：上課中", en: "Part B: During Class" },
  C: { zh: "C 部分：下課前", en: "Part C: Ending Class" },
};

export const COURSE_TITLE = { zh: "印尼語課室用語", en: "Indonesian Classroom Language" };

/** A certificate is for one part, or FULL once parts A, B and C are all done. */
export type CertificateKind = CurriculumPart | "FULL";

export const CERTIFICATE_KINDS: CertificateKind[] = ["A", "B", "C", "FULL"];

/** Topics that must be finished (Practice and Role Play) for each certificate. */
export const CERTIFICATE_TOPICS: Record<CertificateKind, string[]> = {
  ...CURRICULUM_PARTS,
  FULL: [...CURRICULUM_PARTS.A, ...CURRICULUM_PARTS.B, ...CURRICULUM_PARTS.C],
};

export const CERTIFICATE_TITLES: Record<CertificateKind, { zh: string; en: string }> = {
  ...PART_TITLES,
  FULL: { zh: "全部課程", en: "Full Course" },
};
