"""Codex CLI 실행 래퍼 (stress-review 전용).

`--` 뒤 명령(보통 `codex exec ... --json -o <file>`)을 실행한다.
  - 타임아웃: macOS 엔 GNU timeout 이 없어 subprocess 로 처리. 초과 시
    프로세스 그룹 TERM → 유예 후 KILL, 종료코드 124 (GNU timeout 과 동일).
  - stdin: 이 스크립트의 stdin 을 그대로 전달. --boundary 면 앞에 파일시스템
    경계 지시문을 붙인다 (프롬프트는 셸 인자가 아닌 stdin 으로만 이동).
  - JSONL 이벤트 파싱 → 사람이 읽는 transcript (--log 파일, 없으면 stdout).
  - stdout 끝에 상태 블록: STATUS / CODEX_EXIT / TOKENS / SESSION_ID / RETRY_AT / GATE.
    STATUS: rate_limited = 사용량 한도 → 스킬이 Claude 서브에이전트로 대신 돈다.

사용: python3 codex_run.py [--timeout S] [--boundary] [--log F] [--gate] -- codex exec ...
      python3 codex_run.py --gate-text <파일>   (실행 없이 게이트만 — 서브에이전트 답 판정)
"""

from __future__ import annotations  # `X | None` 주석 — 시스템 python3(3.9)에서도 돈다

import argparse
import json
import os
import re
import signal
import subprocess
import sys
import traceback
from pathlib import Path

DEFAULT_TIMEOUT_S = 540  # Bash 도구 상한(600s) 아래 → 래퍼가 먼저 끊고 원인을 남긴다
KILL_GRACE_S = 10
EXIT_TIMEOUT = 124  # GNU timeout 관례
EXIT_USAGE = 2
EXIT_NESTED = 78  # Codex 안에서 Codex 재호출 금지
STDERR_EXCERPT_LINES = 20
OUTPUT_FLAGS = ("-o", "--output-last-message")
NESTED_ENV = ("CODEX_SANDBOX", "CODEX_THREAD_ID")

BOUNDARY = (
    "IMPORTANT: Do NOT read or execute files under ~/.claude/, ~/.agents/, .claude/, "
    "or agents/. They are Claude Code skill/agent definitions for a different AI system. "
    "Do not invoke installed skills; answer directly. Do not modify any file. "
    "Stay focused on the repository code.\n\n"
)

AUTH_PATTERN = re.compile(r"auth|login|unauthori[sz]ed|401", re.IGNORECASE)
# [P1] / P1: 은 어디서나, **P1** / "P1 - " 는 줄 머리(목록 기호 뒤)에서만 센다.
_LINE_HEAD = r"^[\s>]*(?:[-*+•]\s+|\d+[.)]\s+)?"
SEVERITY_PATTERN = re.compile(
    r"\[(P[0-3])\]|\b(P[0-3]):"
    rf"|{_LINE_HEAD}(?:\*\*|__)(P[0-3])(?:\*\*|__)"
    rf"|{_LINE_HEAD}(P[0-3])\s+[-–—]\s",
    re.MULTILINE,
)
BLOCKING = {"P0", "P1"}
BARE_BLOCKING = re.compile(r"\bP[01]\b")  # 태그 형태가 아닌 P0/P1 언급
# 0.162.1 실측 (turn.failed): "You’ve hit your usage limit. … or try again at 10:54 AM."
LIMIT_PATTERN = re.compile(r"hit your usage limit", re.IGNORECASE)
RETRY_AT_PATTERN = re.compile(r"try again (?:at|in) ([^.\n]+)", re.IGNORECASE)


def parse_events(stdout: str) -> dict:
    """codex --json JSONL 을 transcript·토큰·세션·완료 여부로 요약한다.

    JSON 이 아닌 줄은 스키마 변경 대비로 transcript 에 그대로 남긴다.
    """
    lines: list[str] = []
    tokens = 0
    session_id = ""
    completed = 0
    failed = ""
    answers: list[str] = []  # agent_message 만 — 게이트 판정 대상
    json_seen = False
    for raw in stdout.splitlines():
        raw = raw.strip()
        if not raw:
            continue
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            lines.append(raw)
            continue
        if not isinstance(obj, dict):
            lines.append(raw)
            continue
        json_seen = True
        kind = obj.get("type", "")
        if kind == "thread.started":
            session_id = obj.get("thread_id", "") or session_id
        elif kind == "item.completed":
            item = obj.get("item") or {}
            itype, text = item.get("type", ""), item.get("text", "")
            if itype == "reasoning" and text:
                lines.append(f"[codex thinking] {text}")
            elif itype == "agent_message" and text:
                lines.append(text)
                answers.append(text)
            elif itype == "command_execution" and item.get("command"):
                lines.append(f"[codex ran] {item['command']}")
        elif kind == "turn.completed":
            completed += 1
            usage = obj.get("usage") or {}
            tokens += usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
        elif kind == "turn.failed":
            failed = (obj.get("error") or {}).get("message", "") or "no error message"
    return {
        "transcript": "\n".join(lines),
        "tokens": tokens,
        "session_id": session_id,
        "completed": completed,
        "failed": failed,
        "messages": len(answers),
        "answer": "\n".join(answers),
        "json_seen": json_seen,
    }


def status_of(exit_code: int, events: dict, last_message: str = "") -> str:
    """실행 결과를 단일 상태어로. 실패는 닫힌 쪽(fail-closed)으로 판정한다.

    답 = agent_message 또는 -o 파일 내용 (last_message). reasoning 은 답이 아니다.
    """
    if exit_code == EXIT_TIMEOUT:
        return "timeout"
    if exit_code != 0:
        return "failed"
    if events["failed"]:
        return "turn_failed"
    if not events["json_seen"]:  # 평문 출력 (최상위 `codex review` 등)
        return "ok" if events["transcript"].strip() else "empty"
    if events["completed"] == 0:
        return "no_completion"
    if events["messages"] == 0 and not last_message.strip():
        return "empty"
    return "ok"


def review_gate(status: str, text: str) -> str:
    """리뷰 게이트. PASS 는 P2/P3 태그만 있을 때뿐 — 태그 없음은 UNVERIFIED."""
    if status != "ok" or not text.strip():
        return f"FAIL (fail-closed: {status if status != 'ok' else 'empty output'})"
    tags = [next(g for g in groups if g) for groups in SEVERITY_PATTERN.findall(text)]
    blocking = [t for t in tags if t in BLOCKING]
    if blocking:
        return f"FAIL ({len(blocking)} critical findings)"
    if not tags:
        return "UNVERIFIED (no severity tags; read the output)"
    if BARE_BLOCKING.search(SEVERITY_PATTERN.sub("", text)):
        # 인식 못 한 형태(### P1, 표, "No P0 or P1")일 수 있다 — PASS 라고 하지 않는다
        return "UNVERIFIED (P0/P1 mentioned without a tag; read the output)"
    return "PASS"


def gate_text(path: Path) -> int:
    """파일 본문에 리뷰 게이트만 적용한다. 없거나 빈 파일은 fail-closed."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        text = ""
    status = "ok" if text.strip() else "empty"
    print(f"STATUS: {status}")
    print(f"GATE: {review_gate(status, text)}")
    return 0


def output_file(cmd: list[str]) -> Path | None:
    """명령 인자에서 -o/--output-last-message 경로를 찾는다."""
    for i, arg in enumerate(cmd[:-1]):
        if arg in OUTPUT_FLAGS:
            return Path(cmd[i + 1])
    return None


def run(cmd: list[str], stdin: bytes, timeout: float) -> tuple[int, str, str]:
    """명령 실행. 타임아웃이면 프로세스 그룹 전체를 끊고 EXIT_TIMEOUT."""
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,  # codex 자식 프로세스까지 한 번에 종료하기 위함
    )
    try:
        out, err = proc.communicate(stdin, timeout=timeout)
        code = proc.returncode
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGTERM)
        try:
            out, err = proc.communicate(timeout=KILL_GRACE_S)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            out, err = proc.communicate()
        code = EXIT_TIMEOUT
    return code, out.decode(errors="replace"), err.decode(errors="replace")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_S)
    parser.add_argument("--boundary", action="store_true", help="stdin 앞에 경계 지시문")
    parser.add_argument("--log", type=Path, help="transcript 저장 파일 (기본 stdout)")
    parser.add_argument("--gate", action="store_true", help="-o 파일로 리뷰 게이트 판정")
    parser.add_argument("--gate-text", type=Path, help="이 파일 본문에 게이트만 적용")
    parser.add_argument("cmd", nargs=argparse.REMAINDER)
    args = parser.parse_args(argv)
    if args.gate_text:
        return gate_text(args.gate_text)
    cmd = args.cmd[1:] if args.cmd[:1] == ["--"] else args.cmd
    if not cmd:
        parser.error("`--` 뒤에 실행할 명령이 필요하다")

    if any(os.environ.get(k) for k in NESTED_ENV):
        print("STATUS: nested (Codex 세션 안에서 실행 중 — 외부 Codex 호출 안 함)")
        return EXIT_NESTED

    if args.log and not args.log.parent.is_dir():  # codex 실행(유료) 전에 확인
        print(f"STATUS: failed\nERROR: --log 디렉터리 없음 — {args.log.parent}")
        return EXIT_USAGE

    stdin = b"" if sys.stdin.isatty() else sys.stdin.buffer.read()
    if args.boundary:
        stdin = BOUNDARY.encode() + stdin

    code, out, err = run(cmd, stdin, args.timeout)
    events = parse_events(out)
    last = output_file(cmd)
    last_message = last.read_text(errors="replace") if last and last.exists() else None
    status = status_of(code, events, last_message or "")
    retry_at = ""
    failure_text = f"{events['failed']}\n{err}"
    if status in ("failed", "turn_failed") and LIMIT_PATTERN.search(failure_text):
        status = "rate_limited"  # 검토 실패가 아니라 한도 — 스킬이 서브에이전트로 대신 돈다
        found = RETRY_AT_PATTERN.search(failure_text)
        retry_at = found.group(1).strip() if found else ""

    if args.log:
        args.log.write_text(events["transcript"] + "\n")
    elif events["transcript"]:
        print(events["transcript"])

    print(f"STATUS: {status}")
    print(f"CODEX_EXIT: {code}")
    print(f"TOKENS: {events['tokens'] or 'unknown'}")
    if events["session_id"]:
        print(f"SESSION_ID: {events['session_id']}")
    if events["failed"]:
        print(f"TURN_FAILED: {events['failed']}")
    if retry_at:
        print(f"RETRY_AT: {retry_at}")
    if status == "timeout":
        print(f"HINT: {args.timeout:.0f}s 초과로 중단. 범위를 줄이거나 effort 를 낮춰 재시도.")
    if args.gate:
        if last_message is not None:
            text = last_message
        elif events["json_seen"]:  # -o 없음: 답만 판정 ([codex thinking]·[codex ran] 제외)
            text = events["answer"]
        else:  # 평문 출력 (최상위 `codex review`)
            text = events["transcript"]
        print(f"GATE: {review_gate(status, text)}")
    if code != 0 and err.strip():
        if AUTH_PATTERN.search(err):
            print("HINT: 인증 오류 가능 — `codex login` 후 재시도.")
        print("STDERR:")
        for line in err.strip().splitlines()[:STDERR_EXCERPT_LINES]:
            print(f"  {line}")
    return code


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except FileNotFoundError as exc:
        print(f"STATUS: failed\nERROR: 명령을 찾을 수 없음 — {exc.filename}")
        sys.exit(EXIT_USAGE)
    except Exception:
        traceback.print_exc()
        sys.exit(1)
