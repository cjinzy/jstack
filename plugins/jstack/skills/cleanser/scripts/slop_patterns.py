"""AI 생성 코드 슬롭 정적 스캐너 (cleanser 의 유일한 정적 검사기).

라인 정규식으로 디버그 코드, 주석 처리된 코드, TODO 류 주석을 찾고,
ruff 가 있으면 F401(미사용 임포트)도 검사해 마크다운 리포트를 출력한다.
시맨틱 분석은 Claude 에이전트 담당.

사용: python3 slop_patterns.py <파일|디렉토리> [...]
"""

import re
import shutil
import subprocess
import sys
import traceback
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

# 언어별 패턴 적용 대상 확장자. 디렉토리 모드는 둘의 합집합만 스캔.
PYTHON_EXTENSION = ".py"
PYTHON_EXTENSIONS = frozenset({PYTHON_EXTENSION})
JS_EXTENSIONS = frozenset({".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"})
SCAN_EXTENSIONS = PYTHON_EXTENSIONS | JS_EXTENSIONS
TODO_KEYWORDS = "TODO|FIXME|HACK|XXX|TEMP|TEMPORARY"
TODO_SUGGESTION = "TODO/FIXME 등의 임시 주석이 남아있습니다. 처리하거나 제거하세요."
RUFF_SKIPPED_NOTICE = "> ruff 미설치 — unused-import(F401) 검사 생략."
RUFF_FAILED_NOTICE = "> F401 검사 실패 (ruff rc={rc}) — {stderr}"
SKIPPED_FILE_NOTICE = "> 건너뜀: {file} — UTF-8 아님"
RUFF_OK_RETURNCODES = frozenset({0, 1})  # 0 이슈 없음, 1 이슈 있음, 그 외 실행 실패
STDERR_EXCERPT_CHARS = 240
EXIT_OK = 0
EXIT_USAGE = 2
EXIT_MISSING_PATH = 3


class SlopCategory(Enum):
    """AI 슬롭 카테고리 열거형."""

    UNNECESSARY_COMMENT = "unnecessary-comment"
    EXCESSIVE_ERROR_HANDLING = "excessive-error-handling"
    UNUSED_IMPORT = "unused-import"
    BOILERPLATE_DOCSTRING = "boilerplate-docstring"
    OVER_ABSTRACTION = "over-abstraction"
    REDUNDANT_TYPE_ANNOTATION = "redundant-type-annotation"
    LEFTOVER_DEBUG = "leftover-debug"
    DEAD_CODE = "dead-code"


class Severity(Enum):
    """이슈 심각도 열거형.

    순서: INFO < WARNING < CRITICAL
    """

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

    def __lt__(self, other: "Severity") -> bool:
        """심각도 비교 연산자."""
        order = {Severity.INFO: 0, Severity.WARNING: 1, Severity.CRITICAL: 2}
        return order[self] < order[other]

    def __le__(self, other: "Severity") -> bool:
        """심각도 이하 비교 연산자."""
        return self == other or self < other

    def __gt__(self, other: "Severity") -> bool:
        """심각도 초과 비교 연산자."""
        return not self <= other

    def __ge__(self, other: "Severity") -> bool:
        """심각도 이상 비교 연산자."""
        return not self < other

    def __str__(self) -> str:
        """심각도를 문자열로 반환한다."""
        return self.value


# 카테고리별 심각도 매핑
CATEGORY_SEVERITY: dict[SlopCategory, Severity] = {
    SlopCategory.UNNECESSARY_COMMENT: Severity.WARNING,
    SlopCategory.EXCESSIVE_ERROR_HANDLING: Severity.WARNING,
    SlopCategory.UNUSED_IMPORT: Severity.WARNING,
    SlopCategory.BOILERPLATE_DOCSTRING: Severity.INFO,
    SlopCategory.OVER_ABSTRACTION: Severity.INFO,
    SlopCategory.REDUNDANT_TYPE_ANNOTATION: Severity.INFO,
    SlopCategory.LEFTOVER_DEBUG: Severity.CRITICAL,
    SlopCategory.DEAD_CODE: Severity.WARNING,
}


@dataclass
class SlopIssue:
    """슬롭 이슈 데이터 클래스.

    정적 분석 또는 시맨틱 분석에서 탐지된 단일 이슈를 나타낸다.
    """

    file: str
    line: int
    category: SlopCategory
    severity: Severity
    code_snippet: str
    suggestion: str
    end_line: int | None = None


# 정적 감지 패턴 정의
# 각 패턴: (정규식, 제안 메시지, 적용 확장자 — None 이면 모든 파일)
STATIC_PATTERNS: dict[
    SlopCategory, list[tuple[re.Pattern[str], str, frozenset[str] | None]]
] = {
    SlopCategory.LEFTOVER_DEBUG: [
        (
            re.compile(r"^\s*print\s*\("),
            "디버그용 print() 호출을 제거하세요.",
            PYTHON_EXTENSIONS,
        ),
        (
            re.compile(r"^\s*console\.log\s*\("),
            "디버그용 console.log() 호출을 제거하세요.",
            JS_EXTENSIONS,
        ),
        (
            re.compile(r"^\s*debugger\s*;?\s*$"),
            "debugger 문을 제거하세요.",
            JS_EXTENSIONS,
        ),
        (
            re.compile(r"^\s*pdb\.set_trace\s*\("),
            "pdb.set_trace() 호출을 제거하세요.",
            PYTHON_EXTENSIONS,
        ),
        (
            re.compile(r"^\s*breakpoint\s*\("),
            "breakpoint() 호출을 제거하세요.",
            PYTHON_EXTENSIONS,
        ),
        (
            re.compile(r"^\s*import\s+pdb\b"),
            "디버그용 pdb 임포트를 제거하세요.",
            PYTHON_EXTENSIONS,
        ),
    ],
    SlopCategory.DEAD_CODE: [
        (
            # 코드 형태만: 블록 시작은 ':' 로 끝남, return 은 식 하나, import 는 모듈 목록.
            # ponytail: 라인 정규식 — ':' 로 끝나는 산문은 오탐, 필요하면 ast.parse 판정으로
            re.compile(
                r"^\s*#\s*(?:"
                r"(?:def|class|if|for|while)\b.*:\s*$"
                r"|return(?:\s+\S+)?\s*$"
                r"|import\s+[\w.]+(?:\s*,\s*[\w.]+)*\s*$"
                r")"
            ),
            "주석 처리된 코드 블록이 발견되었습니다. 불필요하면 삭제를 고려하세요.",
            PYTHON_EXTENSIONS,
        ),
    ],
    SlopCategory.UNNECESSARY_COMMENT: [
        (
            re.compile(rf"^\s*#\s*(?:{TODO_KEYWORDS})\b"),  # 대문자만: `# temp dir` 제외
            TODO_SUGGESTION,
            None,
        ),
        (
            re.compile(rf"^\s*//\s*(?:{TODO_KEYWORDS})\b"),
            TODO_SUGGESTION,
            JS_EXTENSIONS,
        ),
    ],
}


def detect_static_patterns(file_path: Path) -> list[SlopIssue]:
    """파일에 대해 정적 패턴 매칭을 수행하여 슬롭 이슈를 반환한다.

    Args:
        file_path: 분석할 파일 경로.

    Returns:
        탐지된 SlopIssue 목록.

    Raises:
        FileNotFoundError: 파일이 존재하지 않을 때.
        UnicodeDecodeError: 파일 인코딩이 올바르지 않을 때.
    """
    issues: list[SlopIssue] = []
    file_str = str(file_path)

    lines = file_path.read_text(encoding="utf-8").splitlines()

    for line_num, line_content in enumerate(lines, start=1):
        for category, patterns in STATIC_PATTERNS.items():
            for pattern, suggestion, extensions in patterns:
                if extensions is not None and file_path.suffix not in extensions:
                    continue
                if pattern.search(line_content):
                    issues.append(
                        SlopIssue(
                            file=file_str,
                            line=line_num,
                            category=category,
                            severity=CATEGORY_SEVERITY[category],
                            code_snippet=line_content.strip(),
                            suggestion=suggestion,
                        )
                    )

    return issues


def parse_ruff_output(output: str) -> list[SlopIssue]:
    """ruff check --select F401 --output-format concise 출력을 파싱한다.

    형식 (`[*]` 는 자동수정 가능 표시, 선택):
        path/to/file.py:10:1: F401 [*] `os` imported but unused

    Args:
        output: ruff의 stdout 출력 문자열.

    Returns:
        파싱된 SlopIssue 목록.
    """
    issues: list[SlopIssue] = []
    # ruff 기본 출력 패턴: file:line:col: CODE message
    ruff_pattern = re.compile(
        r"^(.+?):(\d+):\d+:\s+F401\s+(?:\[\*\]\s+)?(.+)$",
        re.MULTILINE,
    )

    for match in ruff_pattern.finditer(output):
        file_path = match.group(1)
        line_num = int(match.group(2))
        message = match.group(3).strip()

        issues.append(
            SlopIssue(
                file=file_path,
                line=line_num,
                category=SlopCategory.UNUSED_IMPORT,
                severity=Severity.WARNING,
                code_snippet=message,
                suggestion=f"미사용 임포트를 제거하세요: {message}",
            )
        )

    return issues


def format_report(issues: list[SlopIssue], verified: bool = True) -> str:
    """슬롭 이슈 목록을 마크다운 리포트로 포맷팅한다.

    Args:
        issues: SlopIssue 목록.
        verified: False 면 (검사 실패) 이슈가 없어도 깨끗하다고 하지 않는다.

    Returns:
        마크다운 형식의 리포트 문자열.
    """
    if not issues:
        verdict = "코드가 깨끗합니다!" if verified else "검사 일부 실패 — 깨끗한지 판단 불가."
        return f"## AI Slop 분석 리포트\n\n슬롭 이슈가 발견되지 않았습니다. {verdict}"

    # 심각도별 건수 집계
    severity_counts: dict[Severity, int] = {
        Severity.CRITICAL: 0,
        Severity.WARNING: 0,
        Severity.INFO: 0,
    }
    for issue in issues:
        severity_counts[issue.severity] += 1

    # 리포트 헤더
    lines: list[str] = [
        "## AI Slop 분석 리포트",
        "",
        "### 요약",
        "| 심각도 | 건수 |",
        "|--------|------|",
        f"| critical | {severity_counts[Severity.CRITICAL]} |",
        f"| warning | {severity_counts[Severity.WARNING]} |",
        f"| info | {severity_counts[Severity.INFO]} |",
        "",
        "### 이슈 목록",
        "| # | 파일 | 라인 | 카테고리 | 심각도 | 제안 |",
        "|---|------|------|----------|--------|------|",
    ]

    # 심각도 내림차순 정렬 (critical → warning → info)
    sorted_issues = sorted(issues, key=lambda i: i.severity, reverse=True)

    for idx, issue in enumerate(sorted_issues, start=1):
        lines.append(
            f"| {idx} | {issue.file} | {issue.line} "
            f"| {issue.category.value} | {issue.severity.value} "
            f"| {issue.suggestion} |"
        )

    lines.extend([
        "",
        "**주의: 이 도구는 리뷰만 수행합니다. 자동 삭제/수정은 하지 않습니다.**",
    ])

    return "\n".join(lines)


# 디렉토리 모드에서 건너뛸 의존성/빌드 산출물 디렉토리
SKIP_DIRS = frozenset({".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build"})


def collect_files(targets: list[Path]) -> list[Path]:
    """파일은 그대로, 디렉토리는 SCAN_EXTENSIONS 파일을 재귀 수집한다."""
    files: list[Path] = []
    for target in targets:
        if target.is_dir():
            files.extend(
                p
                for p in sorted(target.rglob("*"))
                if p.is_file()
                and p.suffix in SCAN_EXTENSIONS
                and not SKIP_DIRS.intersection(p.relative_to(target).parts)
            )
        else:
            files.append(target)
    return files


def run_ruff_f401(py_files: list[Path]) -> list[SlopIssue] | None:
    """ruff F401 검사 결과를 반환한다. ruff 미설치면 None.

    Raises:
        subprocess.CalledProcessError: ruff 실행 실패 (rc 가 0·1 이 아님, 예: 깨진 설정).
    """
    ruff = shutil.which("ruff")
    if ruff is None:
        return None
    if not py_files:
        return []
    cmd = [ruff, "check", "--select", "F401", "--output-format", "concise", *map(str, py_files)]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode not in RUFF_OK_RETURNCODES:  # rc=1 은 이슈 발견일 뿐
        raise subprocess.CalledProcessError(result.returncode, cmd, result.stdout, result.stderr)
    return parse_ruff_output(result.stdout)


def main(argv: list[str]) -> int:
    """대상 경로를 스캔해 리포트를 stdout 에 출력하고 종료 코드를 반환한다."""
    if not argv:
        print("사용법: python3 slop_patterns.py <파일|디렉토리> [...]", file=sys.stderr)
        return EXIT_USAGE

    targets = [Path(arg) for arg in argv]
    missing = [str(t) for t in targets if not t.exists()]
    if missing:
        print(f"오류: 경로 없음 — {', '.join(missing)}", file=sys.stderr)
        return EXIT_MISSING_PATH

    files = collect_files(targets)
    issues: list[SlopIssue] = []
    notices: list[str] = []  # 리포트 끝에 붙는 검사 누락 안내
    for file in files:
        try:
            issues.extend(detect_static_patterns(file))
        except UnicodeDecodeError:
            traceback.print_exc()  # 바이너리/비 UTF-8 파일은 건너뛴다
            notices.append(SKIPPED_FILE_NOTICE.format(file=file))

    ruff_failed = False
    try:
        ruff_issues = run_ruff_f401([f for f in files if f.suffix == PYTHON_EXTENSION])
    except subprocess.CalledProcessError as exc:
        traceback.print_exc()
        ruff_failed = True
        ruff_issues = []
        excerpt = " ".join(exc.stderr.split())[:STDERR_EXCERPT_CHARS] or "stderr 없음"
        notices.append(RUFF_FAILED_NOTICE.format(rc=exc.returncode, stderr=excerpt))
    if ruff_issues is None:
        notices.append(RUFF_SKIPPED_NOTICE)
    else:
        issues.extend(ruff_issues)

    print(format_report(issues, verified=not ruff_failed))
    for notice in notices:
        print(f"\n{notice}")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
