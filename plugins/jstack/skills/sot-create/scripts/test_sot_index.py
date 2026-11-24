"""Tests for sot_index.py — Index.md must be derivable, not hand-maintained."""

from __future__ import annotations

import sys
from pathlib import Path

from sot_index import collect, main, render

ARC = """---
id: ARC-components
category: architecture
title: Service components
status: verified
updated: 2026-10-02
---

## ARC-001 — The gateway is the only public entry point
"""

OVW = """---
id: OVW-problem
category: overview
title: Problem and scope
status: draft
updated: 2026-10-02
---

## OVW-001 — The team has no shared view of the system
"""

BROKEN = "# No frontmatter here\n"


def build(root: Path) -> Path:
    (root / "architecture").mkdir(parents=True)
    (root / "overview").mkdir(parents=True)
    (root / "architecture" / "components.md").write_text(ARC, encoding="utf-8")
    (root / "overview" / "problem.md").write_text(OVW, encoding="utf-8")
    return root


def test_rows_follow_category_order(tmp_path):
    """overview precedes architecture, matching the category table, not the filesystem."""
    rows, skipped = collect(build(tmp_path / "sot"))
    assert [row["id"] for row in rows] == ["OVW-problem", "ARC-components"]
    assert skipped == []


def test_render_links_every_doc(tmp_path):
    rows, _ = collect(build(tmp_path / "sot"))
    out = render(rows)
    assert "[OVW-problem](overview/problem.md)" in out
    assert "[ARC-components](architecture/components.md)" in out
    assert "rules/sot-maintenance.md" in out  # update protocol pointer survives regeneration
    assert out.endswith("|\n")


def test_design_md_pointer_only_when_present(tmp_path):
    """Root DESIGN.md is part of the entry point when it exists; never a dead link."""
    root = build(tmp_path / "sot")
    rows, _ = collect(root)
    assert "DESIGN.md" not in render(rows, root)
    (tmp_path / "DESIGN.md").write_text("---\nname: x\n---\n", encoding="utf-8")
    assert "[DESIGN.md](../DESIGN.md)" in render(rows, root)


def test_incomplete_frontmatter_is_skipped_not_guessed(tmp_path):
    root = build(tmp_path / "sot")
    (root / "overview" / "draft.md").write_text(BROKEN, encoding="utf-8")
    rows, skipped = collect(root)
    assert skipped == ["overview/draft.md"]
    assert len(rows) == 2


def run_main(monkeypatch, *args: str) -> int:
    monkeypatch.setattr(sys, "argv", ["sot_index.py", *args])
    return main()


def test_hand_written_index_is_backed_up(tmp_path, monkeypatch, capsys):
    """`sot/` is gitignored: an overwritten hand-written Index.md is unrecoverable."""
    root = build(tmp_path / "sot")
    hand = "# SoT Index\n\n- my notes\n"
    (root / "Index.md").write_text(hand, encoding="utf-8")
    assert run_main(monkeypatch, "--root", str(root), "--check") == 1
    assert not (root / "Index.md.bak").exists()  # --check never writes
    assert run_main(monkeypatch, "--root", str(root)) == 0
    assert (root / "Index.md.bak").read_text(encoding="utf-8") == hand
    assert "Index.md.bak" in capsys.readouterr().err


def test_generated_index_is_overwritten_without_backup(tmp_path, monkeypatch):
    root = build(tmp_path / "sot")
    run_main(monkeypatch, "--root", str(root))
    run_main(monkeypatch, "--root", str(root))
    assert not (root / "Index.md.bak").exists()


if __name__ == "__main__":
    import sys

    import pytest

    sys.exit(pytest.main([__file__, "-q"]))
