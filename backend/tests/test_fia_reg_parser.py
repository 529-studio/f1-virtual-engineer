import unittest

from tools.fia_reg_parser import DocMeta, extract_chunks, parse_filename


LEGACY_META = DocMeta(
    season=2024, section="Sporting", issue="7", issue_date="2024-07-31", doc_id="sr-2024"
)
SECTIONED_META = DocMeta(
    season=2026, section="B — Sporting", issue="09", issue_date="2026-10-01", doc_id="regs-2026-b"
)


class ParseFilenameTests(unittest.TestCase):
    def test_sectioned_2026_filename(self):
        meta = parse_filename(
            "fia_2026_f1_regulations_-_section_b_sporting_-_iss_09_-_2026-10-01.pdf"
        )
        self.assertEqual(meta.season, 2026)
        self.assertEqual(meta.section, "B — Sporting")
        self.assertEqual(meta.issue, "09")
        self.assertEqual(meta.issue_date, "2026-10-01")
        self.assertEqual(meta.doc_id, "regs-2026-b")

    def test_legacy_sporting_filename(self):
        meta = parse_filename(
            "fia_2024_formula_1_sporting_regulations_-_issue_7_-_2024-07-31.pdf"
        )
        self.assertEqual(meta.season, 2024)
        self.assertEqual(meta.section, "Sporting")
        self.assertEqual(meta.doc_id, "sr-2024")

    def test_unknown_filename_raises(self):
        with self.assertRaises(ValueError):
            parse_filename("random_notes.pdf")


class LegacyLayoutTests(unittest.TestCase):
    def test_heading_and_clause_split(self):
        text = "\n".join(
            [
                "33) TRACK LIMITS",
                "33.3 The FIA will define the track as the area between the white lines.",
                "Any driver who leaves the track must rejoin safely.",
                "33.4 Should a car leave the track the driver must give back any lasting advantage.",
            ]
        )
        chunks = extract_chunks(text, LEGACY_META)
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["clause"], "33.3")
        self.assertEqual(chunks[0]["article"], "33")
        self.assertEqual(chunks[0]["heading"], "TRACK LIMITS")
        self.assertIn("rejoin safely", chunks[0]["text"])
        self.assertEqual(chunks[1]["clause"], "33.4")
        self.assertEqual(chunks[1]["id"], "sr-2024:33.4")

    def test_toc_lines_are_dropped(self):
        text = "\n".join(
            [
                "ART CONTENTS PAGE",
                "38 FREE PRACTICE 45",
                "39 QUALIFYING AND SPRINT 46",
                "38) FREE PRACTICE",
                "38.1 Free practice sessions are permitted at all events.",
            ]
        )
        chunks = extract_chunks(text, LEGACY_META)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]["clause"], "38.1")
        self.assertEqual(chunks[0]["heading"], "FREE PRACTICE")
        self.assertNotIn("CONTENTS", " ".join(c["text"] for c in chunks))

    def test_measurement_lines_are_not_clauses(self):
        text = "\n".join(
            [
                "22) PIT LANE",
                "22.1 The speed limit in the pit lane is 80 km/h.",
                "Cars may not exceed 1.5 km per hour margin above the limit.",
            ]
        )
        chunks = extract_chunks(text, LEGACY_META)
        self.assertEqual(len(chunks), 1)
        self.assertIn("1.5 km", chunks[0]["text"])

    def test_continuation_ending_in_number_is_preserved(self):
        # TOC filtering must only apply to heading/clause-shaped lines — plain
        # body text ending in a small number must survive verbatim.
        text = "\n".join(
            [
                "34) PIT LANE PROCEDURE",
                "34.2 The speed limit for the pit lane shall not exceed 80",
                "during the whole Event.",
            ]
        )
        chunks = extract_chunks(text, LEGACY_META)
        self.assertEqual(len(chunks), 1)
        self.assertIn("not exceed 80", chunks[0]["text"])


class SectionedLayoutTests(unittest.TestCase):
    def test_article_b_heading_and_nested_clause_ids(self):
        text = "\n".join(
            [
                "B",
                "0",
                "SECTION B: SPORTING REGULATIONS",
                "ARTICLE B5: TOTAL TIME CLASSIFIED SESSIONS (TTCS)",
                "B5.15.2 Resumption",
                "As soon as a Resumption Time is known all Competitors will be informed.",
                "B5.15.2a) The Safety Car lights will be extinguished.",
            ]
        )
        chunks = extract_chunks(text, SECTIONED_META)
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["clause"], "B5.15.2")
        self.assertEqual(chunks[0]["article"], "B5")
        self.assertEqual(chunks[0]["heading"], "TOTAL TIME CLASSIFIED SESSIONS (TTCS)")
        self.assertEqual(chunks[1]["clause"], "B5.15.2a")
        self.assertEqual(chunks[1]["id"], "regs-2026-b:B5.15.2a")
        # page-banner junk never leaks into chunk text
        self.assertNotIn("SECTION B", chunks[0]["text"])

    def test_clause_before_any_heading_keeps_empty_heading(self):
        text = "B4.1 General Provisions for LTCS sessions."
        chunks = extract_chunks(text, SECTIONED_META)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]["heading"], "")
        self.assertEqual(chunks[0]["clause"], "B4.1")

    def test_appendix_internal_numbering_is_namespaced(self):
        text = "\n".join(
            [
                "ARTICLE B10: MEDIA ACTIVITIES",
                "B10.1 Podium ceremony rules apply.",
                "APPENDIX B4: PODIUM CEREMONY",
                "9. PRESS ROOM",
                "Immediately after the TV interviews, drivers must go to the press room.",
                "10. WATER + TOWELS",
                "Water and towels must be provided.",
            ]
        )
        chunks = extract_chunks(text, SECTIONED_META)
        clauses = {c["clause"]: c for c in chunks}
        self.assertIn("B10.1", clauses)
        # appendix prose attaches to namespaced articles, never bare "9"
        arts = {c["article"] for c in chunks}
        self.assertIn("APP-B4-9", arts)
        self.assertIn("APP-B4-10", arts)
        self.assertNotIn("9", arts)

    def test_approved_changes_appendix_is_cut(self):
        text = "\n".join(
            [
                "ARTICLE B5: TOTAL TIME CLASSIFIED SESSIONS (TTCS)",
                "B5.2 Reconnaissance Lap(s)",
                "Prior to the scheduled start the Pit Lane exit will be opened.",
                "APPENDIX B5: APPROVED CHANGES TO SECTION B FOR SUBSEQUENT YEARS",
                "ARTICLE B5: TOTAL TIME CLASSIFIED SESSIONS (TTCS)",
                "../..",
                "B5.2 Reconnaissance Lap(s)",
                "Duplicate clause text that must never be indexed.",
            ]
        )
        chunks = extract_chunks(text, SECTIONED_META)
        self.assertEqual(len(chunks), 1)
        self.assertNotIn("Duplicate clause", chunks[0]["text"])

    def test_lowercase_clause_start_is_rejected(self):
        # "22.0s loss" style must not split
        text = "\n".join(
            [
                "B7.1 Pit lane speed limits apply.",
                "22.0s loss is the reference pit loss at Monza.",
            ]
        )
        chunks = extract_chunks(text, SECTIONED_META)
        self.assertEqual(len(chunks), 1)
        self.assertIn("22.0s", chunks[0]["text"])


class MetadataTests(unittest.TestCase):
    def test_chunk_carries_doc_metadata_and_source(self):
        text = "12.1 All competitors must comply with these regulations."
        chunks = extract_chunks(text, LEGACY_META, source_filename="x.pdf")
        c = chunks[0]
        self.assertEqual(c["season"], 2024)
        self.assertEqual(c["section"], "Sporting")
        self.assertEqual(c["issue"], "7")
        # verbatim by construction: the chunk text is the raw clause line
        self.assertTrue(c["text"].startswith("12.1 All competitors"))
        self.assertEqual(c["source_url"], "https://www.fia.com/system/files/documents/x.pdf")


if __name__ == "__main__":
    unittest.main()
