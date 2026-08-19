#!/bin/bash
#
# Derives the mutation scope: the changed line ranges of this branch versus its
# base, as `path:start-end` entries.
#
# Two failure modes this exists to prevent:
#   1. A scope that silently resolves to nothing, so the tool reports a clean run
#      having mutated zero lines. Git pathspecs resolve against the current
#      working directory, so a tool running from a package subdirectory sees no
#      matches. This script always resolves from the repository root and exits
#      non-zero on an empty scope.
#   2. Whole-file scope. A one-line edit to a 1,500-line legacy file must
#      contribute one range, not the whole file.

set -euo pipefail

usage() {
    echo "Usage: $0 [--joined]"
    echo ""
    echo "Options:"
    echo "  --joined    Emit one comma-separated line instead of one range per line."
    echo ""
    echo "Environment:"
    echo "  MUTATION_BASE        Base branch to diff against. Defaults to the"
    echo "                       repository's default branch via origin/HEAD."
    echo "  MUTATION_EXTENSIONS  Pipe-separated source extensions to mutate."
    echo "                       Defaults to: ts|tsx|js|jsx|mjs|cjs"
    echo ""
    echo "Output: path:start-end entries on stdout, a summary on stderr."
    echo "Exits 1 if the scope is empty."
    exit 1
}

JOINED="false"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --joined) JOINED="true"; shift ;;
        -h|--help) usage ;;
        *) echo "Error: unknown option '$1'" >&2; usage ;;
    esac
done

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

detect_base_branch() {
    if [[ -n "${MUTATION_BASE:-}" ]]; then
        echo "$MUTATION_BASE"
        return
    fi
    local head_ref
    if head_ref=$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null); then
        echo "${head_ref#refs/remotes/origin/}"
        return
    fi
    # origin/HEAD is not set locally. Ask the remote, then fall back.
    if head_ref=$(git remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF}'); then
        if [[ -n "$head_ref" && "$head_ref" != "(unknown)" ]]; then
            echo "$head_ref"
            return
        fi
    fi
    for branch in develop development main master; do
        if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
            echo "$branch"
            return
        fi
    done
    echo "Error: could not detect a base branch. Set MUTATION_BASE." >&2
    exit 1
}

BASE_BRANCH=$(detect_base_branch)

resolve_base_ref() {
    if git rev-parse --verify --quiet "origin/$BASE_BRANCH" >/dev/null; then
        echo "origin/$BASE_BRANCH"
    elif git rev-parse --verify --quiet "$BASE_BRANCH" >/dev/null; then
        echo "$BASE_BRANCH"
    else
        echo "Error: base branch '$BASE_BRANCH' not found locally or on origin." >&2
        exit 1
    fi
}

BASE_REF=$(resolve_base_ref)

MERGE_BASE=$(git merge-base "$BASE_REF" HEAD) || {
    echo "Error: no merge base between $BASE_REF and HEAD." >&2
    exit 1
}

EXTENSIONS="${MUTATION_EXTENSIONS:-ts|tsx|js|jsx|mjs|cjs}"

# Deleted files have no lines left to mutate.
CHANGED_FILES=$(git diff --name-only --diff-filter=d "$MERGE_BASE" HEAD \
    | grep -E "\.($EXTENSIONS)$" \
    | grep -Ev '(^|/)(__tests__|__mocks__|test|tests|e2e)/' \
    | grep -Ev '\.(spec|test|e2e-spec|test-utils)\.' \
    || true)

if [[ -z "$CHANGED_FILES" ]]; then
    echo "Error: no mutable source files changed against $BASE_REF." >&2
    echo "Nothing to mutate. Do not report this as a clean run." >&2
    exit 1
fi

# --unified=0 gives one hunk per contiguous change, so a hunk header is exactly
# one range. `@@ -old,n +12,5 @@` means five lines starting at 12; a missing
# count means one line; a count of zero is a pure deletion with nothing to mutate.
# The file list goes through the environment, not -v: BSD awk rejects newlines
# in a -v assignment.
RANGES=$(git diff --unified=0 "$MERGE_BASE" HEAD | MUTATION_ALLOWED="$CHANGED_FILES" awk '
    BEGIN { split(ENVIRON["MUTATION_ALLOWED"], list, "\n"); for (i in list) keep[list[i]] = 1 }
    /^\+\+\+ b\// { file = substr($0, 7); if (!(file in keep)) file = ""; next }
    /^\+\+\+ / { file = ""; next }
    /^@@ / {
        match($0, /\+[0-9]+(,[0-9]+)?/)
        spec = substr($0, RSTART + 1, RLENGTH - 1)
        split(spec, parts, ",")
        start = parts[1]
        count = (2 in parts) ? parts[2] : 1
        if (count > 0 && file != "") print file ":" start "-" start + count - 1
    }
')

if [[ -z "$RANGES" ]]; then
    echo "Error: derived scope is empty despite changed files. Nothing to mutate." >&2
    exit 1
fi

RANGE_COUNT=$(echo "$RANGES" | wc -l | tr -d ' ')
FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')

{
    echo "Base:   $BASE_REF (merge-base ${MERGE_BASE:0:8})"
    echo "Scope:  $RANGE_COUNT line ranges across $FILE_COUNT files"
} >&2

if [[ "$JOINED" == "true" ]]; then
    echo "$RANGES" | paste -sd, -
else
    echo "$RANGES"
fi
