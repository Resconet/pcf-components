#!/bin/bash

# Exit on error except for specific steps like npm outdated
set -e

# File to store the last successful step
STEP_FILE=".nx_upgrade_step"

# Function to save the current step
save_step() {
  echo "$1" > $STEP_FILE
}

# Get the step to resume from, if any
if [ -f "$STEP_FILE" ]; then
  LAST_STEP=$(cat $STEP_FILE)
else
  LAST_STEP=0
fi

# Allow manual override of step with an argument
if [ -n "$1" ]; then
  LAST_STEP=$1
fi

# Ensure NX_VER and TICKET are set, even when continuing from a step
if [ -z "$2" ]; then
  if [ "$LAST_STEP" -lt 1 ]; then
    read -p "Enter NX version (e.g. 19.3.1): " NX_VER
  else
    echo "Error: NX version must be provided to continue from step $LAST_STEP"
    exit 1
  fi
else
  NX_VER=$2
fi

if [ -z "$3" ]; then
  if [ "$LAST_STEP" -lt 1 ]; then
    read -p "Enter ticket number (e.g. ART-464): " TICKET
  else
    echo "Error: Ticket number must be provided to continue from step $LAST_STEP"
    exit 1
  fi
else
  TICKET=$3
fi

# Set environment variables
export NX_VER=$NX_VER
export TICKET=$TICKET

# Step 0: Get NX_VER and TICKET as inputs or prompt the user
if [ "$LAST_STEP" -lt 1 ]; then
  save_step 1
fi

# Step 1: Run Nx migrations and install packages
if [ "$LAST_STEP" -lt 2 ]; then
  echo "Running Nx migrations for $NX_VER..."
  npx nx migrate latest || { echo "Error: nx migrate latest failed"; exit 1; }
  npm install || { echo "Error: npm install failed"; exit 1; }
  npx nx migrate --run-migrations || { echo "Error: run migrations failed"; exit 1; }
  npx nx migrate @ziacik/upgrade-verify || { echo "Error: upgrade-verify migration failed"; exit 1; }
  npx nx migrate @ziacik/azure-func || { echo "Error: azure-func migration failed"; exit 1; }

  save_step 2
fi

# Step 2: Install and format
if [ "$LAST_STEP" -lt 3 ]; then
  npm install || { echo "Error: npm install failed"; exit 1; }
  npx nx format || { echo "Error: nx format failed"; exit 1; }
  save_step 3
fi

# Step 3: Check for old @nx packages in package-lock.json
if [ "$LAST_STEP" -lt 4 ]; then
  echo "Checking package-lock.json for mismatched @nx package versions..."
  if command -v jq &> /dev/null; then
    if jq -e --arg NX_VER "$NX_VER" '
      .packages[]? 
      | select(.version and (.version != $NX_VER) and (.resolved and (.resolved | type == "string") and (.resolved | test("@nx/"))))
    ' package-lock.json; then
      echo "Error: Some @nx packages in package-lock.json are not at version $NX_VER. Please fix manually."
      exit 1
    else
      echo "All @nx packages are at the correct version $NX_VER."
    fi
  else
    echo "Error: jq is not installed. Please install jq or manually check package-lock.json for old @nx versions."
    exit 1
  fi

  save_step 4
fi

# Step 4: Review git changes and commit Nx upgrade
if [ "$LAST_STEP" -lt 5 ]; then
  echo "Please review the git changes."
  read -p "Press 'C' to continue and commit the Nx upgrade: " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Cc]$ ]]; then
    git add . && git commit -am "$TICKET: Nx: upgrade to $NX_VER" || { echo "Error: git commit failed"; exit 1; }
  else
    echo "Script aborted by user."
    exit 1
  fi

  save_step 5
fi

# Step 5: Inspect outdated packages, update, and review breaking changes
if [ "$LAST_STEP" -lt 6 ]; then
  npm outdated || echo "npm outdated found some outdated packages. Please review above."
  read -p "Press 'C' to continue after reviewing outdated packages: " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Cc]$ ]]; then
    echo "Script aborted by user."
    exit 1
  fi

  npm update || { echo "Error: npm update failed"; exit 1; }
  npm audit fix || { echo "Error: npm audit fix failed"; exit 1; }
  save_step 6
fi

# Step 6: Commit dependency updates
if [ "$LAST_STEP" -lt 7 ]; then
  echo "Please review updates for any breaking changes."
  read -p "Press 'C' to continue after reviewing updates: " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Cc]$ ]]; then
    echo "Script aborted by user."
    exit 1
  fi

  git add . && git commit -am "$TICKET: Nx: deps updated" || { echo "Error: git commit failed"; exit 1; }
  save_step 7
fi

# Step 7: Lint, test, e2e, and format
if [ "$LAST_STEP" -lt 8 ]; then
  npx nx affected:lint --fix || { echo "Error: linting failed"; exit 1; }
  npx nx affected:test || { echo "Error: tests failed"; exit 1; }
  npx nx affected:e2e --parallel=1 || { echo "Error: e2e tests failed"; exit 1; }
  npx nx format || { echo "Error: nx format failed"; exit 1; }
  save_step 8
fi

# Step 8: Review git changes and commit lint and test fixes
if [ "$LAST_STEP" -lt 9 ]; then
  echo "Please review the git changes."
  read -p "Press 'C' to continue and commit lint and test fixes: " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Cc]$ ]]; then
    git add . && git commit -am "$TICKET: Nx: fix lint and tests" || { echo "Error: git commit failed"; exit 1; }
  else
    echo "Script aborted by user."
    exit 1
  fi
  save_step 9
fi

# Step 9: Verify build, review stat file changes, and commit
if [ "$LAST_STEP" -lt 10 ]; then
  npx nx affected --target=verify-build --parallel=1 || { echo "Error: verify-build failed"; exit 1; }
  save_step 10
fi

# Step 10: Review stat files and commit
if [ "$LAST_STEP" -lt 11 ]; then
  echo "Please review changes to stat files. If the changes are too wild, investigate why."
  read -p "Press 'C' to continue and commit build stat updates: " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Cc]$ ]]; then
    git add . && git commit -am "$TICKET: Nx: update build stats" || { echo "Error: git commit failed"; exit 1; }
  else
    echo "Script aborted by user."
    exit 1
  fi
  save_step 11
fi

# Step 11: Check for closed issues and review ISSUES.md
if [ "$LAST_STEP" -lt 12 ]; then
  npx nx check-issues || { echo "Error: check-issues failed"; exit 1; }
  echo "Please review the output of nx check-issues for closed issues and update ISSUES.md as necessary."
  read -p "Press 'C' to continue after reviewing ISSUES.md: " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Cc]$ ]]; then
    echo "Script aborted by user."
    exit 1
  fi
  save_step 12
fi

# Clear step file when done
rm -f $STEP_FILE
echo "Nx migration and verification process completed successfully!"
