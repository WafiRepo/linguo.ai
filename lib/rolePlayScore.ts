// Role Play score and the PASS stamp. One rule for the phone (stamp, Home)
// and the server (Learning Portfolio, teacher view, certificates):
// a topic is done when its Role Play earned the PASS stamp. Practice is extra
// training and does not count. No imports, so the API routes can use it too.

/** The PASS stamp needs at least this score (0–100). */
export const ROLE_PLAY_PASS_SCORE = 60;

/** The share of dialogues Bu Guru did not need to correct, 0–100. */
export function rolePlayScore(dialogues: number, corrections: number): number {
  if (dialogues <= 0) return 0;
  const correct = Math.max(0, dialogues - corrections);
  return Math.round((correct / dialogues) * 100);
}

/**
 * A saved session that earned the PASS stamp: a Role Play with every dialogue
 * done and Bu Guru's feedback in (praise is saved with it) with a passing score.
 */
export function isPassedRolePlay(session: {
  mode: string;
  completed: boolean;
  objectivesTotal: number;
  corrections: unknown[] | null;
  praise: string | null;
}): boolean {
  return (
    session.mode === "roleplay" &&
    session.completed &&
    session.praise !== null &&
    rolePlayScore(session.objectivesTotal, session.corrections?.length ?? 0) >= ROLE_PLAY_PASS_SCORE
  );
}
