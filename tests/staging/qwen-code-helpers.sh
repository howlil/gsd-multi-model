#!/bin/sh
# Qwen Code CLI - Shared Helper Functions
# Common functions used by battle test scripts

# ============================================================================
# CONFIGURATION
# ============================================================================
QWEN_RESULTS_DIR="${QWEN_RESULTS_DIR:-/app/tests/staging/results}"
QWEN_TOKEN_PATH="${QWEN_TOKEN_PATH:-/root/.qwen/oauth_creds.json}"
QWEN_AUTH_TYPE="${QWEN_AUTH_TYPE:-qwen-oauth}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Check if OAuth token exists
# Returns: 0 if token exists, 1 if not
check_token() {
    if [ ! -f "$QWEN_TOKEN_PATH" ]; then
        echo "❌ Token file not found at $QWEN_TOKEN_PATH" >&2
        return 1
    fi
    echo "✓ Token file found"
    return 0
}

# Configure Qwen Code OAuth settings
# Creates /root/.qwen/settings.json with proper auth config
configure_qwen_settings() {
    mkdir -p /root/.qwen
    cat > /root/.qwen/settings.json << EOF
{
  "authType": "$QWEN_AUTH_TYPE",
  "oauth": {
    "tokenPath": "$QWEN_TOKEN_PATH"
  }
}
EOF
    echo "✓ Qwen Code settings configured"
}

# Run a Qwen Code CLI command with timing
# Arguments:
#   $1 - Prompt text
#   $2 - Timeout in seconds (default: 60)
# Output: JSON with durationMs, exitCode, output
# Example:
#   result=$(run_qwen_test "What is 2+2?" 60)
run_qwen_test() {
    prompt="$1"
    timeout_sec="${2:-60}"

    START=$(date +%s%3N)

    # Run Qwen Code with timeout
    timeout "$timeout_sec" qwen --auth-type "$QWEN_AUTH_TYPE" -p "$prompt" > /tmp/qwen_output.txt 2>&1
    EXIT_CODE=$?

    END=$(date +%s%3N)
    DURATION=$((END - START))

    # Read output
    OUTPUT=$(cat /tmp/qwen_output.txt 2>/dev/null | tr -d '\n' | cut -c1-100)

    # Return JSON
    echo "{\"durationMs\":$DURATION,\"exitCode\":$EXIT_CODE,\"output\":\"$OUTPUT\"}"
}

# Install ez-agents version
# Arguments:
#   $1 - Version ("4.0.0", "current", etc.)
#   $2 - Installation path (optional, default: /app)
install_ez_agents() {
    version="$1"
    install_path="${2:-/app}"

    if [ "$version" = "current" ]; then
        # Install from local source
        cd "$install_path"
        node bin/install.ts --qwen --global > /dev/null 2>&1
        echo "✓ Current version installed from local" >&2
    else
        # Install from npm
        npm install -g "@howlil/ez-agents@$version" > /dev/null 2>&1
        echo "✓ Version $version installed from npm" >&2
    fi
}

# Parse duration from JSON result
# Arguments:
#   $1 - JSON string
parse_duration() {
    echo "$1" | grep -o '"durationMs":[0-9]*' | grep -o '[0-9]*'
}

# Parse exit code from JSON result
# Arguments:
#   $1 - JSON string
parse_exit_code() {
    echo "$1" | grep -o '"exitCode":[0-9]*' | grep -o '[0-9]*'
}

# Calculate average from list of numbers
# Arguments: numbers separated by space
# Example: calculate_average 10 20 30
calculate_average() {
    sum=0
    count=0
    for num in $@; do
        sum=$((sum + num))
        count=$((count + 1))
    done

    if [ $count -gt 0 ]; then
        echo $((sum / count))
    else
        echo 0
    fi
}

# Generate timestamp in ISO format
get_timestamp() {
    date -Iseconds
}

# Ensure results directory exists
ensure_results_dir() {
    mkdir -p "$QWEN_RESULTS_DIR"
}

# Save JSON result to file
# Arguments:
#   $1 - Filename (relative to results dir)
#   $2 - JSON content
save_result() {
    filename="$1"
    json_content="$2"
    echo "$json_content" > "$QWEN_RESULTS_DIR/$filename"
}
