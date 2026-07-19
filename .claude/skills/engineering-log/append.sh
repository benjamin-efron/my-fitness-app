#!/usr/bin/env bash
# Appends one entry to specs/<feature>/engineering-log.md. Never reads
# or rewrites existing entries — see SKILL.md for why that matters.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: append.sh --feature <spec-dir-name> --task <N> --role coder|reviewer --summary "<one line>" [--type <tag>] [--detail "<longer text>"]
EOF
}

feature=""
task=""
role=""
type=""
summary=""
detail=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --feature) feature="$2"; shift 2 ;;
    --task) task="$2"; shift 2 ;;
    --role) role="$2"; shift 2 ;;
    --type) type="$2"; shift 2 ;;
    --summary) summary="$2"; shift 2 ;;
    --detail) detail="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$feature" || -z "$task" || -z "$role" || -z "$summary" ]]; then
  echo "Missing required argument — --feature, --task, --role, and --summary are all required." >&2
  usage
  exit 1
fi

if [[ "$role" != "coder" && "$role" != "reviewer" ]]; then
  echo "--role must be 'coder' or 'reviewer', got: $role" >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
log_file="$repo_root/specs/$feature/engineering-log.md"

if [[ ! -f "$log_file" ]]; then
  mkdir -p "$(dirname "$log_file")"
  cat > "$log_file" <<EOF
# Engineering log: $feature

Cumulative, append-only record of technical decisions, conventions,
debt, and judgment calls surfaced while building this feature — not a
per-task acceptance record (see plan.md and .claude/review/ for that).
Written by the coder and reviewer after finishing each task, without
reading prior entries first, so a point landing multiple times is
signal, not duplication to prune. Read by the human; never edited by
an agent except to append a new entry.
EOF
fi

{
  echo ""
  echo "## Task $task — $role${type:+ ($type)}"
  echo "$summary"
  if [[ -n "$detail" ]]; then
    echo ""
    echo "$detail"
  fi
} >> "$log_file"

echo "Appended to $log_file"
