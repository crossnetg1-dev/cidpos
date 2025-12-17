#!/bin/bash

# Script to push code to GitHub
# Usage: ./push-to-github.sh <github-repo-url>

if [ -z "$1" ]; then
    echo "❌ Error: Please provide GitHub repository URL"
    echo "Usage: ./push-to-github.sh https://github.com/yourusername/pos-js.git"
    exit 1
fi

REPO_URL=$1

echo "🚀 Setting up GitHub remote and pushing code..."
echo "Repository URL: $REPO_URL"

# Add remote origin
git remote add origin $REPO_URL 2>/dev/null || git remote set-url origin $REPO_URL

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin $CURRENT_BRANCH

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 View your repository at: $REPO_URL"
else
    echo "❌ Failed to push. Please check your repository URL and permissions."
    exit 1
fi

