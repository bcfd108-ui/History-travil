#!/usr/bin/env bash
# Store the accepted manifest in a Git note. This ref has no branch, public
# route, expiration, or Vercel deployment. Workflow writers are serialized.
set -euo pipefail
ref=refs/notes/indexnow
anchor=$(git mktree </dev/null)
path=${2:?expected manifest path}

case "$1" in
  restore)
    remote=$(git ls-remote --refs origin "$ref")
    if [[ -n "$remote" ]]; then
      git fetch --quiet --no-tags origin "$ref:$ref"
      git notes --ref="$ref" show "$anchor" > "$path"
      cp "$path" "$path.before"
    elif [[ -e "$path" ]]; then
      echo "Unexpected manifest in an uninitialized workspace" >&2
      exit 1
    fi
    ;;
  save)
    if [[ -f "$path" ]] && ! cmp -s "$path" "$path.before"; then
      git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
        notes --ref="$ref" add -f -F "$path" "$anchor"
      git push origin "$ref:$ref"
    fi
    ;;
  *) exit 2 ;;
esac
