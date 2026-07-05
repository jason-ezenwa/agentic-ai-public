#!/bin/bash

set -e

VALID_VERBS=("feat" "fix" "chore" "hotfix")

usage() {
    echo "Usage: $0 <verb> <feature-description> [--spec <path>] [--base <branch>]"
    echo ""
    echo "Arguments:"
    echo "  verb                 - feat, fix, chore, hotfix"
    echo "  feature-description  - kebab-case (e.g., reference-fix)"
    echo ""
    echo "Options:"
    echo "  --spec <path>        - relative path to a spec file to copy into the worktree"
    echo "  --base <branch>      - branch to base the worktree off (overrides auto-detect)"
    echo ""
    echo "Prerequisite: Run from inside the git repo root."
    exit 1
}

validate_args() {
    if [[ -z "$1" || -z "$2" ]]; then
        usage
    fi

    local verb="$1"

    if [[ ! " ${VALID_VERBS[@]} " =~ " ${verb} " ]]; then
        echo "Error: verb must be one of: ${VALID_VERBS[*]}" >&2
        exit 1
    fi
}

get_base_branch() {
    for branch in develop development main; do
        if git show-ref --verify --quiet refs/remotes/origin/$branch; then
            echo "$branch"
            return
        fi
    done
    echo "main"
}

check_branch_exists() {
    local branch="$1"
    if git show-ref --verify --quiet refs/heads/$branch; then
        echo "local"
    elif git show-ref --verify --quiet refs/remotes/origin/$branch; then
        echo "remote"
    else
        echo "none"
    fi
}

get_repo_name() {
    basename "$(git rev-parse --show-toplevel)"
}

detect_package_manager() {
    if [[ -f "bun.lockb" ]]; then
        echo "bun"
    elif [[ -f "pnpm-lock.yaml" ]]; then
        echo "pnpm"
    elif [[ -f "yarn.lock" ]]; then
        echo "yarn"
    elif [[ -f "package-lock.json" ]]; then
        echo "npm"
    else
        echo "npm"
    fi
}

branch_exists_in_worktree() {
    local worktree_path="$1"
    if [[ -d "$worktree_path" && -d "$worktree_path/.git" ]]; then
        echo "true"
    else
        echo "false"
    fi
}

main() {
    validate_args "$@"

    local verb="$1"
    local feature_desc="$2"
    local spec_path=""
    local explicit_base=""

    shift 2
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --spec)
                spec_path="$2"
                shift 2
                ;;
            --base)
                explicit_base="$2"
                shift 2
                ;;
            *)
                echo "Error: unknown option '$1'" >&2
                usage
                ;;
        esac
    done

    local package_manager
    package_manager=$(detect_package_manager)

    local branch_name="$verb/$feature_desc"
    local branch_slug="${verb}-${feature_desc}"
    local repo_name
    repo_name=$(get_repo_name)
    local worktree_parent="../${repo_name}-worktrees"
    local worktree_path="${worktree_parent}/${branch_slug}"

    local base_branch
    if [[ -n "$explicit_base" ]]; then
        base_branch="$explicit_base"
    else
        base_branch=$(get_base_branch)
    fi

    local exists_status
    exists_status=$(check_branch_exists "$branch_name")
    local current_branch
    current_branch=$(git branch --show-current)

    local action=""
    local worktree_exists="false"

    if [[ -e "$worktree_path/.git" ]]; then
        worktree_exists="true"
        action="existing"
    elif [[ "$exists_status" == "local" || "$exists_status" == "remote" ]]; then
        if [[ "$current_branch" == "$branch_name" ]]; then
            echo "Error: Branch '$branch_name' is currently checked out in this working tree. Switch to '$base_branch' first, then re-run this script." >&2
            exit 1
        fi
        action="resume"
    else
        action="create"
    fi

    if [[ "$worktree_exists" == "true" ]]; then
        echo "Worktree already exists at: $(realpath "$worktree_path")"
    else
        mkdir -p "$worktree_parent"

        if [[ "$action" == "create" ]]; then
            git fetch origin "$base_branch" 2>/dev/null || true

            if git show-ref --verify --quiet refs/remotes/origin/"$base_branch"; then
                # Base branch exists on remote — branch off it directly
                git worktree add "$worktree_path" -b "$branch_name" origin/"$base_branch"
            elif git show-ref --verify --quiet refs/heads/"$base_branch"; then
                # Base branch exists locally only — use it and push so cloud sessions can reach it
                git push -u origin "$base_branch" 2>/dev/null || true
                git worktree add "$worktree_path" -b "$branch_name" "$base_branch"
            else
                # Base branch doesn't exist anywhere — create it off the default branch and push
                local default_branch
                default_branch=$(get_base_branch)
                git fetch origin "$default_branch" 2>/dev/null || true
                git branch "$base_branch" "origin/$default_branch" 2>/dev/null \
                    || git branch "$base_branch" "$default_branch"
                git push -u origin "$base_branch"
                git worktree add "$worktree_path" -b "$branch_name" "$base_branch"
            fi
        else
            git worktree add "$worktree_path" "$branch_name"
        fi
    fi

    local env_files=()
    while IFS= read -r -d '' file; do
        local relative_path="${file#./}"
        local dest_dir
        dest_dir=$(dirname "$worktree_path/$relative_path")
        mkdir -p "$dest_dir"
        cp "$file" "$worktree_path/$relative_path"
        env_files+=("$relative_path")
    done < <(find . -maxdepth 3 -name '.env*' -type f -print0)

    local copied_spec=""
    if [[ -n "$spec_path" ]]; then
        if [[ ! -f "$spec_path" ]]; then
            echo "Error: spec file not found: $spec_path" >&2
            exit 1
        fi
        if git ls-files --error-unmatch "$spec_path" &>/dev/null; then
            # Already committed — worktree has it via git, nothing to move
            copied_spec="$spec_path (already committed)"
        else
            local spec_dest_dir
            spec_dest_dir=$(dirname "$worktree_path/$spec_path")
            mkdir -p "$spec_dest_dir"
            mv "$spec_path" "$worktree_path/$spec_path"
            copied_spec="$spec_path"
        fi
    fi

    local install_status="success"
    local install_output=""
    if ! (cd "$worktree_path" && "$package_manager" install); then
        install_status="failed"
        install_output="Install failed - check .npmrc, private registry tokens, or network"
    fi

    local worktree_absolute
    worktree_absolute=$(realpath "$worktree_path")

    cat <<EOF
{
  "path": "$worktree_absolute",
  "branch": "$branch_name",
  "base_branch": "$base_branch",
  "action": "$action",
  "env_files": $(printf '%s\n' "${env_files[@]}" | jq -R . | jq -s .),
  "copied_spec": $(echo "$copied_spec" | jq -R .),
  "install_status": "$install_status",
  "cd_command": "cd $worktree_absolute"
}
EOF
}

main "$@"
