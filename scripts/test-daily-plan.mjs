/**
 * Quick local smoke test for daily goal / today plan helpers.
 * Run: node scripts/test-daily-plan.mjs
 */

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterdayDateKey(date = new Date()) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - 1);
  return getLocalDateKey(copy);
}

function createEmptyTodayPlanProgress(lessonId, date) {
  return {
    date,
    lessonId,
    lesson: false,
    aiConversation: false,
    newWords: false,
  };
}

function isTodayPlanItemComplete(progress, itemId, lessonId, date) {
  if (!progress || progress.date !== date || progress.lessonId !== lessonId) {
    return false;
  }
  if (itemId === "lesson") return progress.lesson;
  if (itemId === "ai-conversation") return progress.aiConversation;
  if (itemId === "new-words") return progress.newWords;
  return false;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const today = getLocalDateKey();
const yesterday = getYesterdayDateKey();

assert(getLocalDateKey(new Date("2026-05-21T10:00:00")) === "2026-05-21", "date key format");
assert(yesterday !== today, "yesterday differs from today");

const progress = createEmptyTodayPlanProgress("id-lesson-1", today);
assert(!isTodayPlanItemComplete(progress, "new-words", "id-lesson-1", today), "new words not complete initially");

progress.newWords = true;
assert(isTodayPlanItemComplete(progress, "new-words", "id-lesson-1", today), "new words complete after flag");

assert(
  !isTodayPlanItemComplete(progress, "new-words", "id-lesson-2", today),
  "wrong lesson id should not match",
);

// XP accumulation logic (mirrors store)
let xpToday = 0;
const dailyGoal = 20;
function addXP(amount) {
  xpToday += amount;
}
addXP(7);
addXP(15);
assert(xpToday === 22, "xp can exceed daily goal");
const xpProgress = dailyGoal > 0 ? Math.min((xpToday / dailyGoal) * 100, 100) : 0;
assert(xpProgress === 100, "progress bar caps at 100%");

console.log("All daily plan smoke tests passed.");
