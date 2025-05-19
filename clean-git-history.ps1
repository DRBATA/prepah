# Script to completely remove a file with sensitive data from git history
# Make sure all changes are committed before running this script

# The file that contains sensitive data
$fileToRemove = "src/api/test-responses-api.ps1"

# Create a branch for cleanup
git checkout --orphan temp_branch

# Add all files except the sensitive one
git add --all -- ":!$fileToRemove"

# Commit the current state without the sensitive file
git commit -m "Clean repository - removed sensitive data"

# Delete the main branch 
git branch -D main

# Rename the current branch to main
git branch -m main

# Force push to remote
git push -f origin main
