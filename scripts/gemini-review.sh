#!/usr/bin/env bash
#
# gemini-review.sh — Send files or directories to Gemini for code review
#
# Usage:
#   ./scripts/gemini-review.sh lib/calculations/           # Review a directory
#   ./scripts/gemini-review.sh lib/constants.ts             # Review a single file
#   ./scripts/gemini-review.sh lib/calculations/*.ts        # Review matching files
#   ./scripts/gemini-review.sh --focus "security" app/api/  # Review with a specific focus
#

set -euo pipefail

GEMINI_MODEL="gemini-2.0-flash"
REVIEW_DIR="$(git rev-parse --show-toplevel)/.gemini-reviews"
MAX_CHARS=30000

# --- Parse arguments ---
FOCUS=""
FILES=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --focus)
            FOCUS="$2"
            shift 2
            ;;
        *)
            FILES+=("$1")
            shift
            ;;
    esac
done

if [ ${#FILES[@]} -eq 0 ]; then
    echo "Usage: ./scripts/gemini-review.sh [--focus \"topic\"] <file-or-dir> [file-or-dir...]"
    echo ""
    echo "Examples:"
    echo "  ./scripts/gemini-review.sh lib/calculations/"
    echo "  ./scripts/gemini-review.sh --focus \"security\" app/api/"
    echo "  ./scripts/gemini-review.sh --focus \"performance\" lib/calculations/retirementEngine.ts"
    echo "  ./scripts/gemini-review.sh lib/constants.ts lib/calculations/taxCalculations.ts"
    echo ""
    echo "Focus options: security, performance, bugs, testing, accessibility, architecture"
    exit 1
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "Error: GEMINI_API_KEY is not set. Run: source ~/.zshrc"
    exit 1
fi

# --- Collect file contents ---
COMBINED=""
FILE_LIST=""
FILE_COUNT=0

for target in "${FILES[@]}"; do
    if [ -d "$target" ]; then
        while IFS= read -r -d '' file; do
            if [[ "$file" =~ \.(ts|tsx|js|jsx|css|json|mjs)$ ]] && [[ ! "$file" =~ node_modules ]]; then
                content=$(cat "$file" 2>/dev/null || true)
                if [ -n "$content" ]; then
                    COMBINED+="
=== FILE: ${file} ===
${content}
"
                    FILE_LIST+="  - ${file}\n"
                    ((FILE_COUNT++))
                fi
            fi
        done < <(find "$target" -type f -print0 2>/dev/null)
    elif [ -f "$target" ]; then
        content=$(cat "$target" 2>/dev/null || true)
        if [ -n "$content" ]; then
            COMBINED+="
=== FILE: ${target} ===
${content}
"
            FILE_LIST+="  - ${target}\n"
            ((FILE_COUNT++))
        fi
    else
        echo "Warning: '$target' not found, skipping."
    fi
done

if [ $FILE_COUNT -eq 0 ]; then
    echo "No files found to review."
    exit 1
fi

# Truncate if too large
if [ ${#COMBINED} -gt $MAX_CHARS ]; then
    COMBINED="${COMBINED:0:$MAX_CHARS}

... [truncated at ${MAX_CHARS} chars — ${FILE_COUNT} files total] ..."
    echo "Warning: Content truncated to ${MAX_CHARS} chars. Consider reviewing fewer files at once."
fi

echo "Sending ${FILE_COUNT} file(s) to Gemini for review..."
echo -e "$FILE_LIST"

# --- Build the prompt ---
FOCUS_INSTRUCTION=""
if [ -n "$FOCUS" ]; then
    FOCUS_INSTRUCTION="IMPORTANT: Focus your review specifically on **${FOCUS}**. Prioritize findings related to ${FOCUS} above all else."
fi

PROMPT="You are a senior software engineer performing a comprehensive code review. Review the following source files and provide:

1. **Bugs & Logic Errors** — anything that looks wrong or could break
2. **Edge Cases** — inputs or scenarios not handled
3. **Security Concerns** — any vulnerabilities
4. **Architecture & Design** — structural issues, coupling, patterns
5. **Suggestions** — brief, actionable improvements

${FOCUS_INSTRUCTION}

Be concise and specific. Reference file names and line numbers where possible. If the code looks good, say so briefly. Group findings by severity (critical, warning, info).

Files under review:
${COMBINED}"

# Escape for JSON
JSON_PROMPT=$(printf '%s' "$PROMPT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

# --- Call Gemini ---
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
REVIEW_NAME="review-${TIMESTAMP}"
if [ -n "$FOCUS" ]; then
    REVIEW_NAME="review-${FOCUS}-${TIMESTAMP}"
fi

mkdir -p "$REVIEW_DIR"
REVIEW_FILE="${REVIEW_DIR}/${REVIEW_NAME}.md"

RESPONSE=$(curl -s -w "\n%{http_code}" \
    "https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"contents\": [{\"parts\": [{\"text\": ${JSON_PROMPT}}]}],
        \"generationConfig\": {\"temperature\": 0.3}
    }" 2>/dev/null)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] 2>/dev/null; then
    REVIEW=$(echo "$BODY" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data['candidates'][0]['content']['parts'][0]['text'])
" 2>/dev/null)

    cat > "$REVIEW_FILE" <<EOF
# Gemini Code Review
**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Model:** ${GEMINI_MODEL}
**Focus:** ${FOCUS:-General}
**Files reviewed:** ${FILE_COUNT}
$(echo -e "$FILE_LIST")
---

${REVIEW}
EOF

    echo "Review saved to: ${REVIEW_FILE}"
    echo ""
    echo "--- Review ---"
    echo ""
    cat "$REVIEW_FILE"
else
    echo "Error: Gemini API returned HTTP ${HTTP_CODE}"
    echo "$BODY" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('error', {}).get('message', 'Unknown error'))
except:
    print('Could not parse error response')
" 2>/dev/null
    exit 1
fi
