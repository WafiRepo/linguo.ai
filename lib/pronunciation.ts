import pronunciation from "@/data/pronunciation.json";

// Syllables (and KBBI lafal) for the words of the comics and the Learning
// Materials vocabulary. The AI teacher on the server reads the same file.
type WordEntry = { syllables: string; lafal?: string };

const words: Record<string, WordEntry> = pronunciation.words;

/** "papan tulis" -> "pa·pan tu·lis"; words not in the list stay as written. */
export function syllablesOf(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => words[word.toLowerCase()]?.syllables ?? word)
    .join(" ");
}
