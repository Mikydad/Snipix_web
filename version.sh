#!/bin/bash
# Snipix Version Management Script

echo "🎬 Snipix Version Manager"
echo "========================"

case "$1" in
    "current")
        echo "Current Version: $(git describe --tags --always)"
        echo "Commit: $(git rev-parse HEAD)"
        echo "Date: $(git log -1 --format=%cd)"
        ;;
    "rollback")
        if [ -z "$2" ]; then
            echo "Usage: $0 rollback <version>"
            echo "Available versions:"
            git tag -l
            exit 1
        fi
        echo "Rolling back to version $2..."
        git checkout $2
        echo "✅ Rolled back to $2"
        ;;
    "list")
        echo "Available versions:"
        git tag -l --sort=-version:refname
        ;;
    "deploy")
        echo "Deploying current version..."
        echo "Version: $(git describe --tags --always)"
        echo "Commit: $(git rev-parse HEAD)"
        echo "✅ Ready for deployment"
        ;;
    *)
        echo "Usage: $0 {current|rollback|list|deploy}"
        echo ""
        echo "Commands:"
        echo "  current  - Show current version info"
        echo "  rollback - Rollback to specific version"
        echo "  list     - List all available versions"
        echo "  deploy   - Show deployment info"
        echo ""
        echo "Examples:"
        echo "  $0 current"
        echo "  $0 rollback v1.2.0"
        echo "  $0 list"
        echo "  $0 deploy"
        ;;
esac
