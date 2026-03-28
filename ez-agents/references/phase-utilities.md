# Phase Utilities Reference

**Version:** 1.0.0  
**Last Updated:** 2026-03-29  
**Purpose:** Phase number parsing, normalization, and calculation utilities

---

## Phase Number Formats

EZ Agents supports flexible phase number formats:

| Format | Example | Normalized | Description |
|--------|---------|------------|-------------|
| Integer | `1`, `8`, `12` | `01`, `08`, `12` | Standard phase |
| With letter | `12A`, `12B` | `12A`, `12B` | Variant phase |
| Decimal | `6.1`, `6.2` | `06.1`, `06.2` | Urgent insertion |
| Combined | `12A.1.2` | `12A.1.2` | Complex decimal |

---

## Phase Argument Parsing

### Using ez-tools (Recommended)

The `find-phase` command handles normalization and validation in one step:

```bash
PHASE_INFO=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" find-phase "${PHASE}")
```

**Returns JSON:**
```json
{
  "found": true,
  "directory": ".planning/phases/06-foundation",
  "phase_number": "06",
  "phase_name": "foundation",
  "plans": ["06-01-PLAN.md", "06-02-PLAN.md"],
  "summaries": ["06-01-SUMMARY.md"]
}
```

**Extract values:**
```bash
PHASE_DIR=$(printf '%s\n' "$PHASE_INFO" | jq -r '.directory')
PHASE_NUM=$(printf '%s\n' "$PHASE_INFO" | jq -r '.phase_number')
PHASE_NAME=$(printf '%s\n' "$PHASE_INFO" | jq -r '.phase_name')
```

---

### Manual Normalization (Legacy)

Zero-pad integer phases to 2 digits. Preserve decimal suffixes.

```bash
# Normalize phase number
if [[ "$PHASE" =~ ^[0-9]+$ ]]; then
  # Integer: 8 → 08
  PHASE=$(printf "%02d" "$PHASE")
elif [[ "$PHASE" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
  # Decimal: 2.1 → 02.1
  PHASE=$(printf "%02d.%s" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}")
elif [[ "$PHASE" =~ ^([0-9]+)([A-Z])\.([0-9.]+)$ ]]; then
  # Letter with decimal: 12A.1.2 → 12A.1.2
  PHASE=$(printf "%02d%s.%s" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}")
elif [[ "$PHASE" =~ ^([0-9]+)([A-Z])$ ]]; then
  # Letter: 12A → 12A
  PHASE=$(printf "%02d%s" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}")
fi
```

---

### Validation

Use `roadmap get-phase` to validate phase exists in ROADMAP.md:

```bash
PHASE_CHECK=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" roadmap get-phase "${PHASE}")
if [ "$(printf '%s\n' "$PHASE_CHECK" | jq -r '.found')" = "false" ]; then
  echo "ERROR: Phase ${PHASE} not found in roadmap"
  exit 1
fi
```

---

## Decimal Phase Calculation

Calculate the next decimal phase number for urgent insertions.

### Using ez-tools

```bash
# Get next decimal phase after phase 6
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" phase next-decimal 6
```

**Output:**
```json
{
  "found": true,
  "base_phase": "06",
  "next": "06.1",
  "existing": []
}
```

**With existing decimals:**
```json
{
  "found": true,
  "base_phase": "06",
  "next": "06.3",
  "existing": ["06.1", "06.2"]
}
```

---

### Extract Values

```bash
DECIMAL_INFO=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" phase next-decimal "${AFTER_PHASE}")
DECIMAL_PHASE=$(printf '%s\n' "$DECIMAL_INFO" | jq -r '.next')
BASE_PHASE=$(printf '%s\n' "$DECIMAL_INFO" | jq -r '.base_phase')
```

**Or with --raw flag:**
```bash
DECIMAL_PHASE=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" phase next-decimal "${AFTER_PHASE}" --raw)
# Returns just: 06.1
```

---

### Examples

| Existing Phases | Next Phase | Use Case |
|-----------------|------------|----------|
| 06 only | 06.1 | First urgent insertion |
| 06, 06.1 | 06.2 | Second urgent insertion |
| 06, 06.1, 06.2 | 06.3 | Third urgent insertion |
| 06, 06.1, 06.3 (gap) | 06.4 | Fills after highest |

---

### Directory Naming

Decimal phase directories use the full decimal number:

```bash
SLUG=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" generate-slug "$DESCRIPTION" --raw)
PHASE_DIR=".planning/phases/${DECIMAL_PHASE}-${SLUG}"
mkdir "$PHASE_DIR"
```

**Example:** `.planning/phases/06.1-fix-critical-auth-bug/`

---

## Phase Comparison

Compare phase numbers for sorting:

```bash
# Compare two phase numbers
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" phase compare "06" "06.1"
# Returns: -1 (06 < 06.1)

node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" phase compare "12A" "12B"
# Returns: -1 (12A < 12B)

node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" phase compare "06.2" "06.10"
# Returns: -1 (06.2 < 06.10)
```

---

## Phase Name Slugification

Generate URL-safe slugs from phase names:

```bash
SLUG=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" generate-slug "Fix Critical Auth Bug" --raw)
# Returns: fix-critical-auth-bug
```

**Usage in directory names:**
```bash
PHASE_DIR=".planning/phases/${PHASE_NUM}-${SLUG}"
# Example: .planning/phases/06-fix-critical-auth-bug/
```

---

## Phase Directory Structure

### Standard Phase

```
.planning/phases/
└── 06-foundation/
    ├── 06-01-PLAN.md
    ├── 06-01-SUMMARY.md
    ├── 06-02-PLAN.md
    └── 06-02-SUMMARY.md
```

### Decimal Phase

```
.planning/phases/
├── 06-foundation/
└── 06.1-critical-fix/
    ├── 06.1-01-PLAN.md
    └── 06.1-01-SUMMARY.md
```

### Letter Phase

```
.planning/phases/
├── 12-dashboard/
├── 12A-dashboard-mobile/
└── 12B-dashboard-tablet/
```

---

## Phase Search

Search for phase directories:

```bash
# Find phase by number
PHASE_DIR=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" find-phase "6" --raw)
# Returns: .planning/phases/06-foundation

# Find phase with fuzzy matching
PHASE_DIR=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" find-phase "foundation" --raw)
# Returns: .planning/phases/06-foundation
```

---

## Archived Phases

Search archived milestone phases:

```bash
# Search in current phases first, then archived
PHASE_INFO=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" find-phase "06")

# Check if archived
if [ "$(printf '%s\n' "$PHASE_INFO" | jq -r '.archived')" != "null" ]; then
  MILESTONE=$(printf '%s\n' "$PHASE_INFO" | jq -r '.archived')
  echo "Phase found in archived milestone $MILESTONE"
fi
```

**Archived phase structure:**
```
.planning/milestones/
└── v1.0-phases/
    ├── 01-scaffold/
    ├── 02-auth/
    └── 03-products/
```

---

## Phase Number Sorting

Sort phases in correct order:

```bash
# Get all phases sorted
PHASES=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" roadmap list-phases --json)

# Sort by phase number
echo "$PHASES" | jq -r '.phases | sort_by(.phase_number) | .[].phase_number'
```

**Sort order:**
```
01
02
...
12
12A
12B
12.1
12.2
13
```

---

## Common Patterns

### Pattern 1: Parse and Validate

```bash
#!/bin/bash
ARGUMENTS="$1"

# Extract phase number from arguments
PHASE=$(echo "$ARGUMENTS" | grep -oE '[0-9]+(\.[0-9]+)?[A-Z]?' | head -1)

# Normalize and validate
PHASE_INFO=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" find-phase "${PHASE}")
FOUND=$(printf '%s\n' "$PHASE_INFO" | jq -r '.found')

if [ "$FOUND" = "false" ]; then
  echo "ERROR: Phase not found: ${PHASE}"
  exit 1
fi

PHASE_DIR=$(printf '%s\n' "$PHASE_INFO" | jq -r '.directory')
PHASE_NUM=$(printf '%s\n' "$PHASE_INFO" | jq -r '.phase_number')
```

---

### Pattern 2: Insert Decimal Phase

```bash
#!/bin/bash
AFTER_PHASE="$1"
DESCRIPTION="$2"

# Calculate next decimal
DECIMAL_INFO=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" phase next-decimal "${AFTER_PHASE}")
DECIMAL_PHASE=$(printf '%s\n' "$DECIMAL_INFO" | jq -r '.next')

# Generate slug
SLUG=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" generate-slug "$DESCRIPTION" --raw)

# Create directory
PHASE_DIR=".planning/phases/${DECIMAL_PHASE}-${SLUG}"
mkdir -p "$PHASE_DIR"

echo "Created decimal phase: ${DECIMAL_PHASE}"
echo "Directory: ${PHASE_DIR}"
```

---

### Pattern 3: Iterate All Phases

```bash
#!/bin/bash
# Get all phases sorted
PHASES=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" roadmap list-phases --json)

# Process each phase
echo "$PHASES" | jq -r '.phases | sort_by(.phase_number) | .[] | @base64' | while read -r phase_b64; do
  _jq() {
    echo "${phase_b64}" | base64 --decode | jq -r "${1}"
  }
  
  PHASE_NUM=$(_jq '.phase_number')
  PHASE_NAME=$(_jq '.phase_name')
  PHASE_DIR=$(_jq '.directory')
  
  echo "Processing phase ${PHASE_NUM}: ${PHASE_NAME}"
  echo "Directory: ${PHASE_DIR}"
  
  # Your logic here
done
```

---

## Error Handling

### Phase Not Found

```bash
PHASE_INFO=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" find-phase "${PHASE}")
FOUND=$(printf '%s\n' "$PHASE_INFO" | jq -r '.found')

if [ "$FOUND" = "false" ]; then
  echo "ERROR: Phase ${PHASE} not found"
  echo "Available phases:"
  node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" roadmap list-phases
  exit 1
fi
```

---

### Invalid Phase Format

```bash
if ! [[ "$PHASE" =~ ^[0-9]+(\.[0-9]+)?[A-Z]?$ ]]; then
  echo "ERROR: Invalid phase format: ${PHASE}"
  echo "Valid formats: 1, 12, 12A, 12.1, 12A.1"
  exit 1
fi
```

---

## Best Practices

### ✅ Do

- Use `find-phase` for combined normalization + validation
- Always validate phase exists in ROADMAP.md
- Use decimal phases for urgent insertions only
- Keep phase slugs lowercase and hyphenated
- Sort phases using the built-in comparison

### ❌ Don't

- Manually parse phase numbers (use ez-tools)
- Skip validation before phase operations
- Use decimal phases for normal planning
- Create phase directories manually
- Mix phase formats inconsistently

---

## CLI Reference

### Find Phase

```bash
node ez-tools.cjs find-phase <phase> [--raw]
```

**Options:**
- `--raw` — Return only directory path

---

### Next Decimal Phase

```bash
node ez-tools.cjs phase next-decimal <after-phase> [--raw]
```

**Options:**
- `--raw` — Return only the next phase number

---

### Compare Phases

```bash
node ez-tools.cjs phase compare <phase-a> <phase-b>
```

**Returns:** -1 (a < b), 0 (a == b), 1 (a > b)

---

### Generate Slug

```bash
node ez-tools.cjs generate-slug <text> [--raw]
```

**Options:**
- `--raw` — Return only the slug

---

### List Phases

```bash
node ez-tools.cjs roadmap list-phases [--json]
```

**Options:**
- `--json` — Return JSON array

---

## See Also

- [[git-strategy.md]](./git-strategy.md) — Git commit strategy
- [[checkpoints.md]](./checkpoints.md) — Human-AI interaction protocol
- [[planning-config.md]](./planning-config.md) — Configuration options
- [[roadmap.md]](../templates/roadmap.md) — Roadmap template

---

**Maintained by:** EZ Agents Core Team  
**Feedback:** Open an issue on GitHub
