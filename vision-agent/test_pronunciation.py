import unittest

import roleplay
from practice import build_comic_practice_prompt
from pronunciation import e_sound, indonesian_pronunciation_rules, indonesian_syllables, slow_line, word_guide


class SyllableTest(unittest.TestCase):
    def test_common_patterns(self):
        cases = {
            "hadir": "ha-dir",          # the word Bu Guru said as "Haidir"
            "siap": "si-ap",            # touching vowels split
            "selamat": "se-la-mat",
            "stopkontak": "stop-kon-tak",
            "mengabsen": "me-ngab-sen",  # "ng" is one sound
            "nyanyi": "nya-nyi",
            "pantai": "pan-tai",        # word-final diphthong kept
            "main": "ma-in",
            "instruksi": "in-struk-si",  # "str" starts a syllable
            "ya": "ya",
        }
        for word, expected in cases.items():
            self.assertEqual(indonesian_syllables(word), expected, word)

    def test_rules_list_each_word_once(self):
        rules = indonesian_pronunciation_rules(["Hadir.", "Selamat pagi, anak-anak.", "Hadir."], "English")
        guide = rules.split("- Syllables and sounds:")[1]
        self.assertIn("hadir = ha-dir", guide)
        self.assertEqual(guide.count("hadir = "), 1)
        self.assertIn("anak = a-nak", rules)
        self.assertIn('NOT "hai-dir"', rules)


class KbbiGuideTest(unittest.TestCase):
    """data/pronunciation.json (KBBI syllables and lafal) feeds the AI's guide."""

    def test_every_comic_word_has_an_entry(self):
        import json
        import re
        from pathlib import Path

        source = (Path(__file__).resolve().parent.parent / "data" / "classManagement.ts").read_text("utf-8")
        lines = re.findall(r'(?:guruLine|studentLine):\s*\{\s*id:\s*"((?:[^"\\]|\\.)*)"', source)
        words = {w.lower() for line in lines for w in re.findall(r"[A-Za-z]+", line)}
        guide = word_guide()
        self.assertTrue(guide, "data/pronunciation.json is missing")
        self.assertEqual(sorted(words - set(guide)), [])
        for word, entry in guide.items():
            if "e" in word and word != "stopkontak":
                self.assertIn("lafal", entry, word)

    def test_guide_marks_e_pepet_and_e_taling(self):
        rules = indonesian_pronunciation_rules(["Mari lihat video di depan."], "English")
        self.assertIn("depan = de-pan /dêpan/ (e pepet)", rules)
        self.assertIn("video = vi-de-o /vidéo/ (e taling)", rules)
        self.assertEqual(e_sound("/mêngabsén/"), "e pepet + e taling")

    def test_model_a_line_normal_then_slow(self):
        rules = indonesian_pronunciation_rules(["Baik, Pak Guru."], "English")
        self.assertIn("ONCE at natural speed, then ONCE more slowly", rules)
        self.assertIn("never syllable by syllable", rules)

    def test_slow_line_pauses_between_words(self):
        self.assertEqual(slow_line("Baik, Pak Guru."), "Baik… Pak… Guru.")
        self.assertEqual(slow_line("Hadir."), "Hadir.")


class TeacherNameTest(unittest.TestCase):
    def test_comic_prompts_use_teacher_name(self):
        turns = roleplay.comic_turns([{"guruLine": "Ini apa?", "studentLine": "Baik, Pak Guru."}])
        self.assertTrue(
            build_comic_practice_prompt(turns, "English", "", "Pak Guru").startswith("You are Pak Guru")
        )
        self.assertTrue(
            roleplay.build_comic_roleplay_prompt(turns, "English").startswith("You are Bu Guru")
        )


class PromptIncludesPronunciationTest(unittest.TestCase):
    def test_comic_prompts(self):
        turns = roleplay.comic_turns([
            {"guruLine": "Saya mulai mengabsen. Andi?", "studentLine": "Hadir."},
        ])
        for prompt in (
            build_comic_practice_prompt(turns, "Traditional Chinese (Taiwan / 繁體中文)"),
            roleplay.build_comic_roleplay_prompt(turns, "English"),
        ):
            self.assertIn("INDONESIAN PRONUNCIATION", prompt)
            self.assertIn("mengabsen = me-ngab-sen", prompt)
            self.assertIn("hadir = ha-dir", prompt)


if __name__ == "__main__":
    unittest.main()
