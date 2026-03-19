
#!/usr/bin/env python3

import re
import sys
from dataclasses import dataclass
from pathlib import Path


INDENT = "                    "


@dataclass(frozen=True)
class Entry:
    number: int
    title: str
    url: str


def _read_nonempty_lines(path: Path) -> list[str]:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as e:
        raise FileNotFoundError(f"File not found: {path}") from e
    except PermissionError as e:
        raise PermissionError(f"Permission denied: {path}") from e

    return [line.strip() for line in text.splitlines() if line.strip()]


def _parse_title_line(line: str) -> tuple[int, str]:
    m = re.match(r"^第(?P<num>\d+)回は、(?P<rest>.*)$", line)
    if not m:
        raise ValueError(f"Invalid line (missing '第NN回は、'): {line}")

    num = int(m.group("num"))
    rest = m.group("rest")

    parts = rest.split("、")
    if len(parts) < 2:
        raise ValueError(f"Invalid line (need at least 2 '、'): {line}")

    title = parts[0].strip()
    if not title:
        raise ValueError(f"Invalid line (empty title): {line}")

    return num, title


def _format_li(url: str, text: str, indent: str = INDENT) -> str:
    return f"{indent}<li><a href=\"{url}\" target=\"_blank\">{text}</a></li>"


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("Usage: gen_video_links.py TITLES.txt URLS.txt", file=sys.stderr)
        return 2

    titles_path = Path(argv[1]).expanduser().resolve()
    urls_path = Path(argv[2]).expanduser().resolve()

    try:
        title_lines = _read_nonempty_lines(titles_path)
        url_lines = _read_nonempty_lines(urls_path)
    except (FileNotFoundError, PermissionError) as e:
        print(str(e), file=sys.stderr)
        return 2

    try:
        parsed = [_parse_title_line(line) for line in title_lines]
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 2

    if len(parsed) != len(url_lines):
        print(
            f"Line count mismatch: titles={len(parsed)} urls={len(url_lines)} (must match)",
            file=sys.stderr,
        )
        return 2

    entries: list[Entry] = [
        Entry(number=num, title=title, url=url)
        for (num, title), url in zip(parsed, url_lines)
    ]

    print("<!-- sequential -->")
    for e in entries:
        print(_format_li(e.url, e.title))

    print()
    print("<!-- category -->")
    for e in entries:
        print(_format_li(e.url, f"#{e.number} {e.title}"))

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
