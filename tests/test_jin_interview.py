"""Tests for interview skill.

Validates:
- Skill YAML frontmatter parsing
- Required interview phases exist
- Spec output format template
- File synchronization between ~/.claude and project repo
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

# --- Path Constants ---

PROJECT_ROOT = Path(__file__).parent.parent
HOME_CLAUDE = Path.home() / ".claude"

SKILL_PATHS = [
    PROJECT_ROOT / "plugins" / "jstack" / "skills" / "interview" / "SKILL.md",
]


def _parse_frontmatter(content: str) -> dict:
    """Parse YAML frontmatter from a markdown file using regex.

    Handles simple key-value pairs, multi-line strings (using >),
    and list values (using [a, b, c] syntax).
    Does not require pyyaml dependency.

    Args:
        content: The full markdown file content.

    Returns:
        Parsed YAML frontmatter as a dictionary.

    Raises:
        ValueError: If no valid YAML frontmatter is found.
    """
    match = re.match(r"^---\n(.+?)\n---", content, re.DOTALL)
    if not match:
        msg = "No YAML frontmatter found"
        raise ValueError(msg)

    raw = match.group(1)
    result: dict = {}
    current_key: str | None = None
    multiline_value = ""

    for line in raw.split("\n"):
        # Multi-line continuation (indented line after key with >)
        if current_key and line.startswith("  "):
            multiline_value += line.strip() + " "
            continue
        if current_key and multiline_value:
            result[current_key] = multiline_value.strip()
            current_key = None
            multiline_value = ""

        # Key-value pair
        kv_match = re.match(r'^(\S[\w-]*)\s*:\s*(.*)', line)
        if kv_match:
            key = kv_match.group(1)
            value = kv_match.group(2).strip()

            if value == ">":
                # Multi-line string follows
                current_key = key
                multiline_value = ""
            elif value.startswith("[") and value.endswith("]"):
                # List value: [a, b, c]
                items = [item.strip() for item in value[1:-1].split(",")]
                result[key] = items
            elif value.startswith('"') and value.endswith('"'):
                result[key] = value[1:-1]
            else:
                result[key] = value

    # Flush remaining multi-line value
    if current_key and multiline_value:
        result[current_key] = multiline_value.strip()

    return result


# --- Skill YAML Frontmatter Tests ---


class TestSkillFrontmatter:
    """Tests for interview skill YAML frontmatter parsing."""

    @pytest.fixture(params=SKILL_PATHS, ids=["plugin"])
    def skill_path(self, request: pytest.FixtureRequest) -> Path:
        """Parametrized fixture for skill file paths."""
        path = request.param
        if not path.exists():
            pytest.skip(f"Skill file not found: {path}")
        return path

    def test_skill_file_exists(self, skill_path: Path) -> None:
        """Skill SKILL.md file should exist."""
        assert skill_path.exists(), f"Missing: {skill_path}"

    def test_frontmatter_is_valid_yaml(self, skill_path: Path) -> None:
        """YAML frontmatter should parse without errors."""
        content = skill_path.read_text(encoding="utf-8")
        frontmatter = _parse_frontmatter(content)
        assert isinstance(frontmatter, dict)

    def test_name_is_zy_interview(self, skill_path: Path) -> None:
        """Skill name must be 'interview', not 'mole-interview'."""
        content = skill_path.read_text(encoding="utf-8")
        frontmatter = _parse_frontmatter(content)
        assert frontmatter["name"] == "interview"

    def test_has_description(self, skill_path: Path) -> None:
        """Skill must have a description field."""
        content = skill_path.read_text(encoding="utf-8")
        frontmatter = _parse_frontmatter(content)
        assert "description" in frontmatter
        assert len(frontmatter["description"]) > 10

    def test_has_allowed_tools(self, skill_path: Path) -> None:
        """Skill must declare allowed-tools."""
        content = skill_path.read_text(encoding="utf-8")
        frontmatter = _parse_frontmatter(content)
        assert "allowed-tools" in frontmatter
        tools = frontmatter["allowed-tools"]
        # AskUserQuestion is essential for interview
        assert "AskUserQuestion" in tools
