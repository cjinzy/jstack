#!/usr/bin/env python3
"""세션 시작 시 구버전 스킬 사본 정리 + statusLine 복원 + 옛 refreshInterval 제거
+ 사용량 타이머 복구 + marketplace 자동 업데이트.

SessionStart hook (hooks/hooks.json). stdout 은 대화 컨텍스트에 주입되므로 쓰지 않는다.
"""

from __future__ import annotations  # `X | None` 주석 — hook 은 시스템 python3(3.9)로도 돈다

import json
import os
import shutil
import subprocess
import sys
import traceback
from datetime import datetime
from pathlib import Path

# sync_repo.py 가 clone 하는 저장소 — 존재 = init 이력 있음
TIMER_INSTALLER = Path(".claude/.jin-claude-repo/plugins/jstack/scripts/install-timer.sh")
# install-timer.sh 가 만드는 OS별 타이머 파일 (HOME 기준)
TIMER_MARKERS = {
    "darwin": Path("Library/LaunchAgents/com.jin-claude.fetch-usage.plist"),
    "linux": Path(".config/systemd/user/fetch-claude-usage.timer"),
}
# init 이 고른 수집 주기(분). sync_repo.py INTERVAL_FILE 과 같은 파일
# (hooks/ 와 scripts/ 는 서로 import 하지 않는다).
INTERVAL_FILE = Path(".claude/.jin-claude-usage-interval")
INTERVALS_MIN = (1, 3, 5, 10)  # install-timer.sh 허용값
DEFAULT_INTERVAL_MIN = 5
# hooks.json timeout(10s) 안에 끝나야 hook 이 강제 종료되지 않는다
GIT_PULL_TIMEOUT_SEC = 8
# 구버전(≤3.x) sync_repo 가 ~/.claude/skills 에 복사한 스킬 중 plugin 과 이름이 겹치거나
# (사용자 스킬이 plugin 스킬을 가림) 제거된 것. 다른 legacy 이름(py-standard 등)은
# 충돌이 없어 사용자 판단에 맡긴다.
LEGACY_SKILLS = {
    "jin-claude-init",
    "jin-commit",
    "jin-interview",
    "manage-skills",
    "verify-implementation",
}
SETTINGS_FILE = Path(".claude/settings.json")
SETTINGS_BACKUP_DIR = Path(".claude/backups")
# init 이 넣는 statusLine (merge_settings.REQUIRED_SETTINGS 와 같은 값)·스크립트
# (sync_repo 가 복사 = init 이력)
OUR_STATUSLINE = {"type": "command", "command": "bash ~/.claude/statusline-command.sh"}
# init 6.4.3–6.4.4 가 넣은 매초 갱신 값 — 이 값일 때만 우리 것으로 보고 지운다
LEGACY_REFRESH_INTERVAL_SEC = 1
STATUSLINE_SCRIPT = Path(".claude/statusline-command.sh")


def auto_update() -> None:
    """jstack marketplace repo를 자동 업데이트한다."""
    base = Path.home() / ".claude" / "plugins" / "marketplaces"
    if not base.exists():
        return
    for mp_dir in base.iterdir():
        jin_dir = mp_dir / "plugins" / "jstack"
        if jin_dir.is_dir():
            try:
                result = subprocess.run(
                    ["git", "-C", str(mp_dir), "pull", "--ff-only"],
                    capture_output=True,
                    text=True,
                    timeout=GIT_PULL_TIMEOUT_SEC,
                )
                if result.returncode != 0:
                    print(
                        f"[jstack] warning: auto-update failed for {mp_dir.name}",
                        file=sys.stderr,
                    )
            except subprocess.TimeoutExpired:
                print(
                    f"[jstack] warning: auto-update timeout for {mp_dir.name}",
                    file=sys.stderr,
                )
            except OSError as e:
                print(
                    f"[jstack] warning: auto-update error for {mp_dir.name}: {e}",
                    file=sys.stderr,
                )


def retire_legacy_skills() -> None:
    """LEGACY_SKILLS 사본을 ~/.claude/backups/skills_backup_<YYYYMMDD>/ 로 옮긴다 (삭제 아님)."""
    skills = Path.home() / ".claude" / "skills"
    now = datetime.now()
    for name in sorted(LEGACY_SKILLS):
        src = skills / name
        if not src.exists() and not src.is_symlink():
            continue
        dest = Path.home() / ".claude" / "backups" / f"skills_backup_{now:%Y%m%d}" / name
        if dest.exists():
            dest = dest.with_name(f"{name}_{now:%H%M%S%f}")
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), dest)
            print(f"[jstack] retired legacy skill {src} -> {dest}", file=sys.stderr)
        except OSError as e:
            print(f"[jstack] warning: retire {src} failed: {e!r}", file=sys.stderr)


def load_settings(home: Path) -> dict | None:
    """settings.json 을 읽는다. 없거나 깨졌거나 객체가 아니면 None (hook 은 조용히 건너뛴다)."""
    try:
        settings = json.loads((home / SETTINGS_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return settings if isinstance(settings, dict) else None


def write_settings(home: Path, settings: dict, what: str) -> None:
    """settings.json 을 백업(~/.claude/backups/)한 뒤 원자적으로 바꿔 쓴다."""
    path = home / SETTINGS_FILE
    try:
        stamp = f"{datetime.now():%Y%m%d_%H%M%S_%f}"
        backup = home / SETTINGS_BACKUP_DIR / f"settings_backup_{stamp}.json"
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, backup)
        target = path.resolve()  # 심링크(dotfile 관리)면 링크가 아니라 원본을 바꾼다
        tmp = target.with_name(target.name + ".tmp")
        tmp.write_text(json.dumps(settings, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        shutil.copymode(target, tmp)  # 권한 유지 (tmp 는 umask 를 따른다)
        os.replace(tmp, target)  # 원자적 교체 — 도중에 죽어도 settings.json 이 반쯤 쓰이지 않게
        print(f"[jstack] {what}: done; backup {backup}", file=sys.stderr)
    except OSError as e:
        print(f"[jstack] warning: {what} failed: {e!r}", file=sys.stderr)
        traceback.print_exc()  # stderr — stdout 은 대화 컨텍스트


def restore_statusline() -> None:
    """init 의 셸 statusLine 이 빠져 있으면 되돌린다 (init 이력 = statusline-command.sh 있을 때만).

    mod-statusline(6.4.3 에서 제거)이 뺀 statusLine 을 init 재실행 없이 복원한다. 사용자 커스텀은
    건드리지 않고, 바꾸기 전 settings.json 을 ~/.claude/backups/ 에 복사한다.
    ponytail: 마이그레이션 — 팀 전원이 6.4.3 이상이면 지운다.
    """
    home = Path.home()
    settings = load_settings(home)
    if settings is None or "statusLine" in settings:
        return
    if not (home / STATUSLINE_SCRIPT).is_file():
        return
    settings["statusLine"] = OUR_STATUSLINE
    write_settings(home, settings, "restore statusLine")


def drop_refresh_interval() -> None:
    """init 이 넣은 `statusLine.refreshInterval: 1` 을 지운다 — statusline 매초 실행을 멈춘다.

    6.4.3–6.4.4 init 이 턴 타이머용으로 넣었다 (7.0.0 에서 타이머와 함께 제거). 우리 command 이고
    값이 정수 1 일 때만 지운다 — 다른 command·다른 간격·bool 은 사용자 설정이라 건드리지 않는다.
    merge_settings.py 도 같은 조건으로 지운다 (hook 이 안 도는 환경).
    ponytail: 마이그레이션 — 팀 전원이 7.0.0 이상이면 지운다.
    """
    home = Path.home()
    settings = load_settings(home)
    status_line = settings.get("statusLine") if settings else None
    if not isinstance(status_line, dict):
        return
    if status_line.get("command") != OUR_STATUSLINE["command"]:
        return
    interval = status_line.get("refreshInterval")
    # True == 1 이라 bool 을 따로 거른다
    if isinstance(interval, bool) or interval != LEGACY_REFRESH_INTERVAL_SEC:
        return
    del status_line["refreshInterval"]
    write_settings(home, settings, "remove statusLine.refreshInterval")


def saved_interval(home: Path) -> int:
    """init 이 저장한 수집 주기. 없거나 정수 아님·허용값 밖이면 기본값."""
    try:
        minutes = int((home / INTERVAL_FILE).read_text())
    except (OSError, ValueError):
        return DEFAULT_INTERVAL_MIN
    return minutes if minutes in INTERVALS_MIN else DEFAULT_INTERVAL_MIN


def ensure_timer() -> None:
    """사용량 수집 타이머가 사라졌으면 init 때 고른 주기로 재등록한다.

    타이머는 init 때 한 번만 설치되므로, OS 업그레이드·정리 도구 등으로
    plist/timer 가 지워지면 캐시 갱신이 조용히 멈춘다. 매 세션 파일 존재만 확인.
    """
    home = Path.home()
    marker = TIMER_MARKERS.get(sys.platform)
    installer = home / TIMER_INSTALLER
    if marker is None or not installer.is_file() or (home / marker).exists():
        return
    # 분리 실행: 설치 스크립트의 초기 fetch 가 hook timeout(10s)을 넘길 수 있음.
    # ponytail: 등록 실패 시 install-timer.sh 가 marker 를 지우니 다음 세션이 재시도.
    # 동시 세션 경합은 무시.
    try:
        subprocess.Popen(
            ["bash", str(installer), str(saved_interval(home))],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    except OSError as e:
        print(f"[jstack] warning: timer reinstall error: {e!r}", file=sys.stderr)


def main() -> None:
    """메인 진입점."""
    retire_legacy_skills()  # 빠름 — 사본이 plugin 스킬을 가리기 전에
    restore_statusline()  # 빠름 — 파일 하나
    drop_refresh_interval()  # 빠름 — 같은 파일
    ensure_timer()  # 빠름 — 느린 git pull 보다 먼저
    auto_update()


if __name__ == "__main__":
    main()
