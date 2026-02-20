#!/bin/bash
#
# Update environment variables for an existing PrintPress app
# Use this after initial deployment to update secrets
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Check doctl
if ! command -v doctl &> /dev/null; then
    echo "Error: doctl not installed. Run: brew install doctl"
    exit 1
fi

# List apps
print_header "Select App"
echo "Available apps:"
doctl apps list --format ID,Spec.Name,DefaultIngress --no-header | nl
echo ""
read -p "Enter the number of your app: " app_num

APP_INFO=$(doctl apps list --format ID,Spec.Name --no-header | sed -n "${app_num}p")
APP_ID=$(echo $APP_INFO | awk '{print $1}')
APP_NAME=$(echo $APP_INFO | awk '{print $2}')

if [ -z "$APP_ID" ]; then
    echo "Invalid selection"
    exit 1
fi

print_info "Selected: $APP_NAME ($APP_ID)"
echo ""

# Get current spec
print_header "Fetching Current Configuration"
SPEC_FILE=$(mktemp)
doctl apps spec get $APP_ID > $SPEC_FILE
print_success "Got current app spec"

# Show current env vars
echo ""
echo "Current environment variables:"
grep -A 2 "key:" $SPEC_FILE | grep -E "(key:|value:)" | paste - - | sed 's/key:/  /g; s/value:/=/g'
echo ""

# Menu
while true; do
    print_header "Update Menu"
    echo "1. Update Spaces Access Key"
    echo "2. Update Spaces Secret Key"
    echo "3. Update Auth Secret"
    echo "4. Update Internal API Token"
    echo "5. Update Postmark Server Token"
    echo "6. Update Domain (APP_URL, AUTH_URL)"
    echo "7. Deploy changes"
    echo "8. Exit"
    echo ""
    read -p "Choose an option: " choice
    
    case $choice in
        1)
            read -p "Enter Spaces Access Key: " val
            sed -i.bak "s/SPACES_ACCESS_KEY:.*/SPACES_ACCESS_KEY: $val/" $SPEC_FILE
            print_success "Updated SPACES_ACCESS_KEY"
            ;;
        2)
            read -s -p "Enter Spaces Secret Key: " val
            echo ""
            sed -i.bak "s/SPACES_SECRET_KEY:.*/SPACES_SECRET_KEY: $val/" $SPEC_FILE
            print_success "Updated SPACES_SECRET_KEY"
            ;;
        3)
            read -p "Generate new Auth Secret? (y/N): " gen
            if [[ $gen =~ ^[Yy]$ ]]; then
                val=$(openssl rand -base64 32)
                echo "Generated: $val"
            else
                read -p "Enter Auth Secret: " val
            fi
            sed -i.bak "s/AUTH_SECRET:.*/AUTH_SECRET: $val/" $SPEC_FILE
            print_success "Updated AUTH_SECRET"
            ;;
        4)
            read -p "Generate new Internal API Token? (y/N): " gen
            if [[ $gen =~ ^[Yy]$ ]]; then
                val=$(openssl rand -hex 32)
                echo "Generated: $val"
            else
                read -p "Enter Internal API Token: " val
            fi
            sed -i.bak "s/INTERNAL_API_TOKEN:.*/INTERNAL_API_TOKEN: $val/" $SPEC_FILE
            print_success "Updated INTERNAL_API_TOKEN"
            ;;
        5)
            read -p "Enter Postmark Server Token: " val
            sed -i.bak "s/POSTMARK_SERVER_TOKEN:.*/POSTMARK_SERVER_TOKEN: $val/" $SPEC_FILE
            print_success "Updated POSTMARK_SERVER_TOKEN"
            ;;
        6)
            read -p "Enter new domain (e.g., app.example.com): " domain
            sed -i.bak "s|APP_URL:.*|APP_URL: https://$domain|" $SPEC_FILE
            sed -i.bak "s|AUTH_URL:.*|AUTH_URL: https://$domain|" $SPEC_FILE
            sed -i.bak "s|value: PrintPress <no-reply@.*>|value: PrintPress <no-reply@$domain>|" $SPEC_FILE
            print_success "Updated domain to $domain"
            ;;
        7)
            print_header "Deploying Changes"
            print_info "Updating app..."
            doctl apps update $APP_ID --spec $SPEC_FILE
            print_success "Update submitted! Check DO dashboard for progress."
            break
            ;;
        8)
            rm $SPEC_FILE
            echo "Exiting without changes."
            exit 0
            ;;
        *)
            echo "Invalid option"
            ;;
    esac
done

rm $SPEC_FILE
