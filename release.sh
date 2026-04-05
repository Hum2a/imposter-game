#!/usr/bin/env bash

# Release Tag Manager — imposter-game
# Creates and manages semantic versioning tags for releases.
# Works on Windows (Git Bash), Linux, and macOS.
#
# Updates package.json (root + server/package.json) and README **Package version:** when present;
# updates CHANGELOG.md for stable releases (no --name) when CHANGELOG.md exists.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Initialize variables
INCREMENT=""
NAME=""
SET_TAG=""
SHOW_CURRENT=false
FORCE=false

# Show help function
show_help() {
  echo "Usage: $0 [OPTIONS]"
  echo "Manage release tags with semantic versioning (imposter-game repo root)."
  echo "Updates package.json and server/package.json; README **Package version:** if present;"
  echo "updates CHANGELOG.md for stable releases (no --name) when CHANGELOG.md exists."
  echo ""
  echo "Options:"
  echo "  --major           Increment major version (vX.0.0)"
  echo "  --minor           Increment minor version (v0.X.0)"
  echo "  --patch           Increment patch version (v0.0.X) (default)"
  echo "  --name NAME       Append custom name to version (e.g., beta)"
  echo "  --set-tag TAG     Set specific tag (must be vX.Y.Z format)"
  echo "  --current         Show current release tag"
  echo "  --force           Force tag creation even if commit is tagged"
  echo "  --help            Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --current"
  echo "  $0 --minor"
  echo "  $0 --major --name beta"
  echo "  $0 --set-tag v1.2.3"
  exit 0
}

# Parse long arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --major)
      if [[ -n "$INCREMENT" ]]; then
        echo "Error: Cannot use multiple version flags together (--major, --minor, --patch, --set-tag)"
        exit 1
      fi
      INCREMENT="major"
      shift
      ;;
    --minor)
      if [[ -n "$INCREMENT" ]]; then
        echo "Error: Cannot use multiple version flags together (--major, --minor, --patch, --set-tag)"
        exit 1
      fi
      INCREMENT="minor"
      shift
      ;;
    --patch)
      if [[ -n "$INCREMENT" ]]; then
        echo "Error: Cannot use multiple version flags together (--major, --minor, --patch, --set-tag)"
        exit 1
      fi
      INCREMENT="patch"
      shift
      ;;
    --name)
      if [[ "$SHOW_CURRENT" == true ]]; then
        echo "Error: Cannot use --name with --current"
        exit 1
      fi
      NAME="$2"
      shift 2
      ;;
    --set-tag)
      if [[ -n "$INCREMENT" ]]; then
        echo "Error: Cannot use multiple version flags together (--major, --minor, --patch, --set-tag)"
        exit 1
      fi
      SET_TAG="$2"
      # Validate tag format
      if [[ ! "$SET_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9-]+)?$ ]]; then
        echo "Error: Tag must be in format vX.Y.Z or vX.Y.Z-NAME (e.g., v1.2.3 or v1.2.3-beta)"
        exit 1
      fi
      INCREMENT="set"
      shift 2
      ;;
    --current)
      if [[ -n "$INCREMENT" || -n "$NAME" || "$FORCE" == true ]]; then
        echo "Error: Cannot combine --current with other options"
        exit 1
      fi
      SHOW_CURRENT=true
      shift
      ;;
    --force)
      if [[ "$SHOW_CURRENT" == true ]]; then
        echo "Error: Cannot use --force with --current"
        exit 1
      fi
      FORCE=true
      shift
      ;;
    --help)
      show_help
      ;;
    *)
      echo "Error: Unknown option $1"
      show_help
      exit 1
      ;;
  esac
done

# Default to patch if no version option specified
if [[ -z "$INCREMENT" && "$SHOW_CURRENT" == false ]]; then
  INCREMENT="patch"
fi

# Always sync with remote tags first
echo "Syncing with remote tags..."
git fetch --tags --force >/dev/null 2>&1

# Get current commit hash
CURRENT_COMMIT=$(git rev-parse HEAD)

# Get latest tag from remote
LATEST_TAG=$(git ls-remote --tags --refs --sort=-v:refname origin | head -n 1 | sed 's/.*\///')

# Show current tag if requested
if [[ "$SHOW_CURRENT" == true ]]; then
  if [[ -z "$LATEST_TAG" ]]; then
    echo "No releases found"
    exit 0
  fi

  TAG_COMMIT=$(git ls-remote origin refs/tags/"$LATEST_TAG" | cut -f 1)
  echo "Latest release tag: $LATEST_TAG"
  echo "Tag points to commit: $TAG_COMMIT"
  echo "Current commit: $CURRENT_COMMIT"

  if [[ "$TAG_COMMIT" == "$CURRENT_COMMIT" ]]; then
    echo "Status: Current commit is tagged"
  else
    echo "Status: Current commit is not tagged"
  fi
  exit 0
fi

# Handle set-tag mode
if [[ "$INCREMENT" == "set" ]]; then
  NEW_TAG="$SET_TAG"
  echo "Setting tag directly to: $NEW_TAG"
else
  # Set default version if no tags exist
  if [[ -z "$LATEST_TAG" ]]; then
    LATEST_TAG="v0.0.0"
    echo "No existing tags found. Starting from v0.0.0"
  else
    echo "Current release tag: $LATEST_TAG"
  fi

  # Extract version numbers
  CLEAN_TAG=${LATEST_TAG#v}
  MAJOR=$(echo "$CLEAN_TAG" | cut -d. -f1)
  MINOR=$(echo "$CLEAN_TAG" | cut -d. -f2)
  PATCH=$(echo "$CLEAN_TAG" | cut -d. -f3 | sed 's/-.*//') # Remove any suffixes

  # Increment version based on selection
  case $INCREMENT in
    major)
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      ;;
    minor)
      MINOR=$((MINOR + 1))
      PATCH=0
      ;;
    patch)
      PATCH=$((PATCH + 1))
      ;;
  esac

  # Construct new tag
  NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"

  # Append custom name if provided
  if [[ -n "$NAME" ]]; then
    SANITIZED_NAME=$(echo "$NAME" | tr -cd '[:alnum:]-' | tr ' ' '-')
    NEW_TAG="${NEW_TAG}-${SANITIZED_NAME}"
  fi
fi

# Check if tag already exists locally or remotely
echo "Checking for existing tags..."
EXISTING_REMOTE=$(git ls-remote origin "refs/tags/${NEW_TAG}")
EXISTING_LOCAL=$(git tag -l "$NEW_TAG")

# Delete existing tags if found
if [[ -n "$EXISTING_REMOTE" || -n "$EXISTING_LOCAL" ]]; then
  echo "Tag $NEW_TAG already exists - deleting old version"

  # Delete remote tag
  if [[ -n "$EXISTING_REMOTE" ]]; then
    echo "Deleting remote tag: $NEW_TAG"
    git push --delete origin "$NEW_TAG" >/dev/null 2>&1 || true
  fi

  # Delete local tag
  if [[ -n "$EXISTING_LOCAL" ]]; then
    echo "Deleting local tag: $NEW_TAG"
    git tag -d "$NEW_TAG" >/dev/null 2>&1 || true
  fi
fi

# Check if current commit is already tagged
if [[ -n "$LATEST_TAG" ]]; then
  TAG_COMMIT=$(git ls-remote origin refs/tags/"$LATEST_TAG" | cut -f 1)
  if [[ "$TAG_COMMIT" == "$CURRENT_COMMIT" && "$FORCE" == false ]]; then
    echo "Error: Current commit is already tagged as $LATEST_TAG"
    echo "Use --force to create a new tag on this commit"
    exit 1
  fi
fi

# Function to generate changelog entries from git commits
generate_changelog_from_commits() {
  local since_tag="$1"
  local added=""
  local changed=""
  local fixed=""
  local security=""
  local deprecated=""
  local removed=""
  local other=""

  # Determine the commit range
  local commit_range=""
  if [[ -z "$since_tag" || "$since_tag" == "v0.0.0" ]]; then
    # If no previous tag, get all commits
    commit_range="HEAD"
  else
    # Get commits since the last tag
    commit_range="${since_tag}..HEAD"
  fi

  # Get all commits in the range, excluding merge commits and chore commits that are just version bumps
  local commits
  commits=$(git log "$commit_range" --pretty=format:"%s" --no-merges 2>/dev/null | grep -vE "^chore:.*(version|changelog|bump)" || true)

  # Also filter out empty lines
  commits=$(echo "$commits" | grep -v "^$" || true)

  if [[ -z "$commits" ]]; then
    echo ""
    return
  fi

  # Create temp file for commits to avoid subshell issues
  local temp_commits_file
  if command -v mktemp >/dev/null 2>&1; then
    temp_commits_file=$(mktemp)
  else
    temp_commits_file="/tmp/release_commits_$$.txt"
  fi
  echo "$commits" > "$temp_commits_file"

  # Process each commit
  while IFS= read -r commit_msg || [[ -n "$commit_msg" ]]; do
    # Skip empty lines
    [[ -z "$commit_msg" ]] && continue

    # Extract the type and description from conventional commits
    # Format: type(scope): description or type: description
    local type=""
    local description=""

    # Try to match conventional commit format.
    # Use grep -E instead of bash =~ to avoid parser quirks across bash builds on Windows.
    if echo "$commit_msg" | grep -Eq '^[a-z]+(\([^)]+\))?[[:space:]]*:'; then
      type=$(echo "$commit_msg" | sed -E 's/^([a-z]+)(\([^)]+\))?[[:space:]]*:.*/\1/')
      # Remove the type and scope prefix, trim whitespace
      description=$(echo "$commit_msg" | sed -E 's/^[a-z]+(\([^)]+\))?[[:space:]]*:[[:space:]]*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    else
      # Non-conventional commit, use as-is but categorize as "other"
      description="$commit_msg"
      type="other"
    fi

    # Skip if description is empty
    [[ -z "$description" ]] && continue

    # Capitalize first letter and ensure it ends with a period if it doesn't
    if [[ -n "$description" ]]; then
      description=$(echo "$description" | sed 's/^./\U&/')
      if [[ ! "$description" =~ [.!?]$ ]]; then
        description="${description}."
      fi
    fi

    # Categorize based on conventional commit types
    case "$type" in
      feat|feature)
        if [[ -z "$added" ]]; then
          added="- ${description}"
        else
          added="${added}
- ${description}"
        fi
        ;;
      fix|bugfix)
        if [[ -z "$fixed" ]]; then
          fixed="- ${description}"
        else
          fixed="${fixed}
- ${description}"
        fi
        ;;
      security)
        if [[ -z "$security" ]]; then
          security="- ${description}"
        else
          security="${security}
- ${description}"
        fi
        ;;
      deprecate|deprecated)
        if [[ -z "$deprecated" ]]; then
          deprecated="- ${description}"
        else
          deprecated="${deprecated}
- ${description}"
        fi
        ;;
      remove|removed)
        if [[ -z "$removed" ]]; then
          removed="- ${description}"
        else
          removed="${removed}
- ${description}"
        fi
        ;;
      change|changed|update|updated|refactor|perf|performance|style)
        if [[ -z "$changed" ]]; then
          changed="- ${description}"
        else
          changed="${changed}
- ${description}"
        fi
        ;;
      *)
        # Other types (docs, test, build, ci, chore, etc.) - can be added to "Other" or skipped
        # For now, we'll add significant ones to "Changed"
        if [[ "$type" == "refactor" || "$type" == "perf" || "$type" == "style" ]]; then
          if [[ -z "$changed" ]]; then
            changed="- ${description}"
          else
            changed="${changed}
- ${description}"
          fi
        fi
        ;;
    esac
  done < "$temp_commits_file"

  # Clean up temp file
  rm -f "$temp_commits_file"

  # Build the changelog content
  local changelog_content=""

  if [[ -n "$added" ]]; then
    changelog_content="${changelog_content}
### Added
${added}"
  fi

  if [[ -n "$changed" ]]; then
    changelog_content="${changelog_content}
### Changed
${changed}"
  fi

  if [[ -n "$fixed" ]]; then
    changelog_content="${changelog_content}
### Fixed
${fixed}"
  fi

  if [[ -n "$security" ]]; then
    changelog_content="${changelog_content}
### Security
${security}"
  fi

  if [[ -n "$deprecated" ]]; then
    changelog_content="${changelog_content}
### Deprecated
${deprecated}"
  fi

  if [[ -n "$removed" ]]; then
    changelog_content="${changelog_content}
### Removed
${removed}"
  fi

  # If no categorized changes, add a generic entry
  if [[ -z "$changelog_content" ]]; then
    changelog_content="
### Changed
- Various updates and improvements."
  fi

  echo "$changelog_content"
}

# Bump "version" in a package.json (path relative to repo root)
update_package_json_version() {
  local rel="$1"
  [[ -f "$rel" ]] || return 0
  export VERSION_SEMVER
  export PACKAGE_JSON_REL="$rel"
  node <<'NODEJS'
const fs = require('fs');
const v = process.env.VERSION_SEMVER;
const rel = process.env.PACKAGE_JSON_REL;
const p = JSON.parse(fs.readFileSync(rel, 'utf8'));
p.version = v;
fs.writeFileSync(rel, JSON.stringify(p, null, 2) + '\n');
NODEJS
}

update_readme_version() {
  [[ -f README.md ]] || return 0
  export VERSION_SEMVER
  node <<'NODEJS'
const fs = require('fs');
const v = process.env.VERSION_SEMVER;
const path = 'README.md';
let t = fs.readFileSync(path, 'utf8');
const re = /(\*\*Package version:\*\* `)[^`]+(`)/;
if (re.test(t)) {
  fs.writeFileSync(path, t.replace(re, (_, a, b) => a + v + b));
}
NODEJS
}

VERSION_SEMVER=${NEW_TAG#v}
echo "Updating package.json files and README.md to version ${VERSION_SEMVER}..."
update_package_json_version package.json
update_package_json_version server/package.json
update_readme_version

# Update CHANGELOG.md if this is a release (not a pre-release with --name)
CHANGELOG_FILE="CHANGELOG.md"
CHANGELOG_UPDATED=false
if [[ -z "$NAME" && -f "$CHANGELOG_FILE" ]]; then
  echo "Updating CHANGELOG.md..."

  # Get current date in YYYY-MM-DD format
  RELEASE_DATE=$(date -u +"%Y-%m-%d")

  # Extract version number from tag (remove 'v' prefix)
  VERSION_NUMBER=${VERSION_SEMVER}

  # Generate changelog entries from git commits
  echo "Generating changelog entries from git commits since ${LATEST_TAG:-beginning}..."
  COMMIT_CHANGES=$(generate_changelog_from_commits "$LATEST_TAG")

  # Create temporary files
  if command -v mktemp >/dev/null 2>&1; then
    TEMP_CHANGELOG=$(mktemp)
    TEMP_COMMITS=$(mktemp)
  else
    # Fallback for systems without mktemp
    TEMP_CHANGELOG="${CHANGELOG_FILE}.tmp"
    TEMP_COMMITS="${CHANGELOG_FILE}.commits.tmp"
  fi

  # Write commit changes to temp file for easier handling
  echo "$COMMIT_CHANGES" > "$TEMP_COMMITS"

  # Use awk for more reliable parsing (works across all platforms)
  awk -v version="$VERSION_NUMBER" -v date="$RELEASE_DATE" '
    BEGIN {
      in_unreleased = 0
      unreleased_content = ""
      version_inserted = 0
      has_commit_changes = 0

      # Read commit changes from temp file
      commit_changes_file = "'"$TEMP_COMMITS"'"
      if ((getline commit_changes_line < commit_changes_file) > 0) {
        commit_changes = commit_changes_line
        while ((getline commit_changes_line < commit_changes_file) > 0) {
          commit_changes = commit_changes "\n" commit_changes_line
        }
        close(commit_changes_file)
        if (commit_changes != "" && commit_changes != "\n") {
          has_commit_changes = 1
        }
      }
    }

    # Match [Unreleased] section header
    /^## \[Unreleased\]/ {
      print
      in_unreleased = 1
      unreleased_content = ""
      next
    }

    # Match any other version section header
    /^## \[/ {
      if (in_unreleased && !version_inserted) {
        # Insert new version section before this one
        print ""
        printf "## [%s] - %s\n", version, date
        if (has_commit_changes) {
          print commit_changes
        } else if (unreleased_content != "") {
          print ""
          print unreleased_content
        }
        version_inserted = 1
      }
      in_unreleased = 0
      print
      next
    }

    # Collect Unreleased section content (only if we have no commit changes)
    in_unreleased {
      if (!has_commit_changes) {
        if (unreleased_content == "") {
          unreleased_content = $0
        } else {
          unreleased_content = unreleased_content "\n" $0
        }
      }
      next
    }

    # All other lines
    {
      print
    }

    END {
      # If we ended while still in Unreleased section, append new version
      if (in_unreleased && !version_inserted) {
        print ""
        printf "## [%s] - %s\n", version, date
        if (has_commit_changes) {
          print commit_changes
        } else if (unreleased_content != "") {
          print ""
          print unreleased_content
        }
      }
    }
  ' "$CHANGELOG_FILE" > "$TEMP_CHANGELOG"

  # Clean up temp commits file
  rm -f "$TEMP_COMMITS"

  # Replace the original changelog with the updated one
  mv "$TEMP_CHANGELOG" "$CHANGELOG_FILE"
  CHANGELOG_UPDATED=true
fi

# One commit for CHANGELOG (if any) + package.json files + README.md
[[ "$CHANGELOG_UPDATED" == true ]] && git add "$CHANGELOG_FILE"
[[ -f package.json ]] && git add package.json
[[ -f server/package.json ]] && git add server/package.json
[[ -f README.md ]] && git add README.md

if ! git diff --cached --quiet; then
  if [[ "$CHANGELOG_UPDATED" == true ]]; then
    COMMIT_MSG="chore: update CHANGELOG and bump version for ${NEW_TAG}"
    echo "Committing CHANGELOG.md, package.json files, and README.md for version ${VERSION_SEMVER}..."
  else
    COMMIT_MSG="chore: bump version to ${VERSION_SEMVER} (${NEW_TAG})"
    echo "Committing package.json files and README.md for version ${VERSION_SEMVER}..."
  fi
  git commit -m "$COMMIT_MSG" >/dev/null 2>&1
  git push origin HEAD >/dev/null 2>&1 || true
else
  echo "No file changes to commit (version files and CHANGELOG already match)"
fi

# Create and push new tag
echo "Creating new tag: $NEW_TAG"
if git tag "$NEW_TAG" && git push origin "$NEW_TAG"; then
  echo "Successfully created release tag: $NEW_TAG"
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)
  if [[ -n "$REMOTE_URL" ]]; then
    REPO_SLUG=$(echo "$REMOTE_URL" | sed -E 's/.*[:/]([^/]+\/[^/]+)(\.git)?$/\1/')
    echo "Tag URL: https://github.com/${REPO_SLUG}/releases/tag/$NEW_TAG"
  fi
else
  echo "Error: Failed to create tag"
  exit 1
fi
