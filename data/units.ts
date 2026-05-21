import { LanguageCode, Unit } from '@/types/learning';

export const UNITS: Unit[] = [
  {
    id: 'es-unit-1',
    languageCode: 'es',
    title: 'Greetings & Basics',
    description: 'Start your Spanish journey with everyday phrases',
    order: 1,
    lessonIds: ['es-lesson-1', 'es-lesson-2', 'es-lesson-3'],
  },
  {
    id: 'fr-unit-1',
    languageCode: 'fr',
    title: 'Bonjour! Greetings',
    description: 'Learn how to greet and introduce yourself in French',
    order: 1,
    lessonIds: ['fr-lesson-1', 'fr-lesson-2', 'fr-lesson-3', 'fr-lesson-4', 'fr-lesson-5'],
  },
  {
    id: 'ja-unit-1',
    languageCode: 'ja',
    title: 'はじめまして — First Steps',
    description: 'Learn essential Japanese phrases for meeting people',
    order: 1,
    lessonIds: ['ja-lesson-1', 'ja-lesson-2', 'ja-lesson-3', 'ja-lesson-4', 'ja-lesson-5'],
  },
  {
    id: 'de-unit-1',
    languageCode: 'de',
    title: 'Hallo! German Basics',
    description: 'Master everyday German greetings and introductions',
    order: 1,
    lessonIds: ['de-lesson-1', 'de-lesson-2', 'de-lesson-3', 'de-lesson-4', 'de-lesson-5'],
  },
  {
    id: 'id-unit-1',
    languageCode: 'id',
    title: 'Salam & Dasar',
    description: 'Mulai belajar Bahasa Indonesia dengan sapaan sehari-hari',
    order: 1,
    lessonIds: ['id-lesson-1', 'id-lesson-2', 'id-lesson-3', 'id-lesson-4', 'id-lesson-5'],
  },
  {
    id: 'id-unit-2',
    languageCode: 'id',
    title: 'Keluarga & Teman',
    description: 'Kenalan dengan keluarga, teman, pekerjaan, dan hobi',
    order: 2,
    lessonIds: ['id-lesson-6', 'id-lesson-7', 'id-lesson-8', 'id-lesson-9', 'id-lesson-10'],
  },
  {
    id: 'id-unit-3',
    languageCode: 'id',
    title: 'Makanan & Minuman',
    description: 'Pesan makanan, minuman, dan bicara soal rasa',
    order: 3,
    lessonIds: ['id-lesson-11', 'id-lesson-12', 'id-lesson-13', 'id-lesson-14', 'id-lesson-15'],
  },
  {
    id: 'id-unit-4',
    languageCode: 'id',
    title: 'Belanja & Uang',
    description: 'Belanja, tawar-menawar, dan bayar dengan rupiah',
    order: 4,
    lessonIds: ['id-lesson-16', 'id-lesson-17', 'id-lesson-18', 'id-lesson-19', 'id-lesson-20'],
  },
  {
    id: 'id-unit-5',
    languageCode: 'id',
    title: 'Perjalanan & Sehari-hari',
    description: 'Arah, transportasi, hotel, cuaca, dan darurat',
    order: 5,
    lessonIds: ['id-lesson-21', 'id-lesson-22', 'id-lesson-23', 'id-lesson-24', 'id-lesson-25'],
  },
];

export function getUnitsForLanguage(languageCode: LanguageCode): Unit[] {
  return UNITS.filter((unit) => unit.languageCode === languageCode).sort(
    (a, b) => a.order - b.order,
  );
}
