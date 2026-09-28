import unittest

import roleplay
from practice import build_comic_practice_prompt
from pronunciation import indonesian_pronunciation_rules, indonesian_syllables


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
        guide = rules.split("- Syllables:")[1]
        self.assertIn("hadir = ha-dir", guide)
        self.assertEqual(guide.count("hadir = "), 1)
        self.assertIn("anak = a-nak", rules)
        self.assertIn('NOT "hai-dir"', rules)


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

    def test_scenario_prompt(self):
        objectives = roleplay.parse_objectives([
            {"id": "thanks", "goal": "thank", "targets": ["terima kasih"]},
        ])
        prompt = roleplay.build_roleplay_system_prompt(
            {"opening_line": "Selamat pagi!"}, objectives, "English"
        )
        self.assertIn("terima = te-ri-ma", prompt)
        self.assertIn("selamat = se-la-mat", prompt)


if __name__ == "__main__":
    unittest.main()
