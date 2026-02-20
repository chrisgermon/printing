#!/bin/bash
#
# DigitalOcean Full Deployment Script for PrintPress
# This script creates all required DO resources and deploys the app
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="printpress"
REGION="nyc3"
DB_NAME="printpress-db"
SPACES_BUCKET="printpress-proofs"
SPEC_FILE="do/app.platform.yaml"

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    if ! command -v doctl &> /dev/null; then
        print_error "doctl (DigitalOcean CLI) is not installed"
        echo ""
        echo "Install it with Homebrew:"
        echo "  brew install doctl"
        echo ""
        echo "Or download from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        exit 1
    fi
    print_success "doctl is installed"
    
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed"
        echo ""
        echo "Install it with Homebrew:"
        echo "  brew install jq"
        exit 1
    fi
    print_success "jq is installed"
    
    # Check if authenticated with DO
    if ! doctl account get &> /dev/null; then
        print_error "Not authenticated with DigitalOcean"
        echo ""
        echo "Run: doctl auth init"
        exit 1
    fi
    print_success "Authenticated with DigitalOcean"
    
    # Check if in correct directory
    if [ ! -f "$SPEC_FILE" ]; then
        print_error "Cannot find $SPEC_FILE"
        echo "Please run this script from the project root directory"
        exit 1
    fi
    print_success "Found app spec file"
}

# Get user configuration
get_user_config() {
    print_header "Configuration"
    
    echo "This script will create:"
    echo "  • App Platform app: $APP_NAME"
    echo "  • Managed PostgreSQL database: $DB_NAME"
    echo "  • Spaces bucket: $SPACES_BUCKET"
    echo ""
    
    read -p "Do you want to customize these names? (y/N): " customize
    if [[ $customize =~ ^[Yy]$ ]]; then
        read -p "App name [$APP_NAME]: " input
        APP_NAME=${input:-$APP_NAME}
        
        read -p "Database name [$DB_NAME]: " input
        DB_NAME=${input:-$DB_NAME}
        
        read -p "Spaces bucket [$SPACES_BUCKET]: " input
        SPACES_BUCKET=${input:-$SPACES_BUCKET}
    fi
    
    # Get domain
    echo ""
    read -p "Enter your domain (e.g., app.example.com): " DOMAIN
    if [ -z "$DOMAIN" ]; then
        print_warning "No domain provided, will use default placeholder"
        DOMAIN="app.crowdclick.com.au"
    fi
    
    # Confirm
    echo ""
    print_info "Will deploy with:"
    echo "  App name: $APP_NAME"
    echo "  Database: $DB_NAME"
    echo "  Spaces bucket: $SPACES_BUCKET"
    echo "  Domain: $DOMAIN"
    echo ""
    read -p "Continue? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
}

# Generate secrets
generate_secrets() {
    print_header "Generating Secrets"
    
    AUTH_SECRET=$(openssl rand -base64 32)
    INTERNAL_API_TOKEN=$(openssl rand -hex 32)
    
    print_success "Generated AUTH_SECRET"
    print_success "Generated INTERNAL_API_TOKEN"
    
    # Save to temp file for reference
    cat > /tmp/printpress-secrets.txt << EOF
PrintPress Deployment Secrets
=============================
Generated: $(date)

AUTH_SECRET: $AUTH_SECRET
INTERNAL_API_TOKEN: $INTERNAL_API_TOKEN

IMPORTANT: Save these securely! They won't be shown again.
EOF
    
    print_info "Secrets saved to: /tmp/printpress-secrets.txt"
}

# Create Managed PostgreSQL
create_database() {
    print_header "Creating Managed PostgreSQL Database"
    
    # Check if DB already exists
    if doctl databases list --format Name --no-header | grep -q "^${DB_NAME}$"; then
        print_warning "Database '$DB_NAME' already exists"
        DB_ID=$(doctl databases list --format Name,ID --no-header | grep "^${DB_NAME} " | awk '{print $2}')
        print_info "Using existing database ID: $DB_ID"
    else
        print_info "Creating database (this may take a few minutes)..."
        
        DB_OUTPUT=$(doctl databases create \
            $DB_NAME \
            --engine pg \
            --version 16 \
            --region $REGION \
            --size db-s-1vcpu-1gb \
            --num-nodes 1 \
            --wait \
            --output json)
        
        DB_ID=$(echo $DB_OUTPUT | jq -r '.[0].id')
        print_success "Database created with ID: $DB_ID"
    fi
    
    # Get connection string
    print_info "Getting database connection string..."
    sleep 5  # Wait for DB to be fully ready
    
    DB_CONN=$(doctl databases connection $DB_ID)
    DATABASE_URL=$(echo "$DB_CONN" | grep 'postgres://' | head -1)
    
    if [ -z "$DATABASE_URL" ]; then
        print_warning "Could not get full connection string automatically"
    else
        print_success "Got database connection string"
    fi
}

# Create Spaces Bucket
create_spaces_bucket() {
    print_header "Spaces Bucket Setup"
    
    print_info "Note: doctl cannot create Spaces buckets automatically."
    print_info "Please create the bucket manually:"
    echo ""
    echo "  1. Go to: https://cloud.digitalocean.com/spaces"
    echo "  2. Click 'Create Spaces Bucket'"
    echo "  3. Choose datacenter: $REGION"
    echo "  4. Bucket name: $SPACES_BUCKET"
    echo "  5. Select your project"
    echo "  6. Click 'Create Spaces Bucket'"
    echo ""
    echo "After creating the bucket, create an Access Key:"
    echo "  1. Go to: https://cloud.digitalocean.com/account/api/spaces"
    echo "  2. Click 'Generate New Key'"
    echo "  3. Save the Key and Secret"
    echo ""
    
    read -p "Press Enter when you've created the bucket and access key..."
    
    echo ""
    read -p "Spaces Access Key: " SPACES_ACCESS_KEY
    read -s -p "Spaces Secret Key: " SPACES_SECRET_KEY
    echo ""
    
    if [ -z "$SPACES_ACCESS_KEY" ] || [ "$SPACES_ACCESS_KEY" = "REPLACE_ME" ]; then
        print_warning "No valid Spaces Access Key provided"
        print_info "You'll need to add this manually in the DO dashboard later"
        SPACES_ACCESS_KEY="REPLACE_ME"
    fi
    
    if [ -z "$SPACES_SECRET_KEY" ] || [ "$SPACES_SECRET_KEY" = "REPLACE_ME" ]; then
        print_warning "No valid Spaces Secret Key provided"
        print_info "You'll need to add this manually in the DO dashboard later"
        SPACES_SECRET_KEY="REPLACE_ME"
    fi
}

# Get email provider config
get_email_config() {
    print_header "Email Configuration (Postmark)"
    
    print_info "To send emails, you need a Postmark account"
    print_info "Sign up at: https://postmarkapp.com"
    echo ""
    
    read -p "Have you set up Postmark and want to configure it now? (y/N): " setup_postmark
    if [[ $setup_postmark =~ ^[Yy]$ ]]; then
        read -p "Postmark Server Token: " POSTMARK_SERVER_TOKEN
        read -p "From email address [PrintPress <no-reply@$DOMAIN>]: " MAIL_FROM
        MAIL_FROM=${MAIL_FROM:-"PrintPress <no-reply@$DOMAIN>"}
        
        if [ -z "$POSTMARK_SERVER_TOKEN" ]; then
            print_warning "No Postmark token provided"
            POSTMARK_SERVER_TOKEN="REPLACE_ME"
        fi
    else
        print_info "Skipping Postmark config for now"
        POSTMARK_SERVER_TOKEN="REPLACE_ME"
        MAIL_FROM="PrintPress <no-reply@$DOMAIN>"
    fi
}

# Create App Platform app
create_app() {
    print_header "Creating App Platform App"
    
    # Check if app already exists
    if doctl apps list --format Spec.Name,ID --no-header | grep -q "^${APP_NAME} "; then
        print_warning "App '$APP_NAME' already exists"
        APP_ID=$(doctl apps list --format Spec.Name,ID --no-header | grep "^${APP_NAME} " | awk '{print $2}')
        print_info "Using existing app ID: $APP_ID"
        return
    fi
    
    # Create temp spec file with replacements
    TEMP_SPEC=$(mktemp)
    
    cat > $TEMP_SPEC << EOF
name: $APP_NAME
region: nyc
services:
  - name: web
    environment_slug: node-js
    github:
      branch: main
      deploy_on_push: true
      repo: chrisgermon/printing
    source_dir: /
    run_command: npm --workspace @printpress/web run prisma:migrate:deploy && npm run start:web
    build_command: npm install && npm run build:web
    http_port: 3000
    instance_count: 1
    instance_size_slug: apps-s-1vcpu-1gb
    routes:
      - path: /
    envs:
      - key: NODE_ENV
        value: production
        scope: RUN_TIME
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: \${db.DATABASE_URL}
        type: SECRET
      - key: SPACES_REGION
        value: nyc3
        scope: RUN_AND_BUILD_TIME
      - key: SPACES_ENDPOINT
        value: https://nyc3.digitaloceanspaces.com
        scope: RUN_AND_BUILD_TIME
      - key: SPACES_BUCKET
        value: $SPACES_BUCKET
        scope: RUN_AND_BUILD_TIME
      - key: SPACES_ACCESS_KEY
        value: $SPACES_ACCESS_KEY
        type: SECRET
        scope: RUN_TIME
      - key: SPACES_SECRET_KEY
        value: $SPACES_SECRET_KEY
        type: SECRET
        scope: RUN_TIME
      - key: SPACES_CDN_BASE_URL
        value: https://$SPACES_BUCKET.nyc3.cdn.digitaloceanspaces.com
        scope: RUN_AND_BUILD_TIME
      - key: APP_URL
        value: https://$DOMAIN
        scope: RUN_AND_BUILD_TIME
      - key: AUTH_URL
        value: https://$DOMAIN
        scope: RUN_AND_BUILD_TIME
      - key: AUTH_SECRET
        value: $AUTH_SECRET
        type: SECRET
        scope: RUN_TIME
      - key: AUTH_TRUST_HOST
        value: "true"
        scope: RUN_TIME
      - key: INTERNAL_API_TOKEN
        value: $INTERNAL_API_TOKEN
        type: SECRET
        scope: RUN_TIME

workers:
  - name: notifications-worker
    environment_slug: node-js
    github:
      branch: main
      deploy_on_push: true
      repo: chrisgermon/printing
    source_dir: /
    run_command: npm run start:worker
    build_command: npm install && npm run build:worker
    instance_count: 1
    instance_size_slug: apps-s-1vcpu-1gb
    envs:
      - key: NODE_ENV
        value: production
        scope: RUN_TIME
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: \${db.DATABASE_URL}
        type: SECRET
      - key: WORKER_POLL_INTERVAL_MS
        value: "5000"
        scope: RUN_TIME
      - key: MAIL_PROVIDER
        value: postmark
        scope: RUN_TIME
      - key: MAIL_FROM
        value: $MAIL_FROM
        scope: RUN_TIME
      - key: POSTMARK_SERVER_TOKEN
        value: $POSTMARK_SERVER_TOKEN
        type: SECRET
        scope: RUN_TIME
      - key: POSTMARK_MESSAGE_STREAM
        value: outbound
        scope: RUN_TIME

databases:
  - engine: PG
    name: db
    num_nodes: 1
    size: db-s-1vcpu-1gb
    version: "16"
EOF
    
    print_info "Creating app from spec..."
    APP_OUTPUT=$(doctl apps create --spec $TEMP_SPEC --output json)
    APP_ID=$(echo $APP_OUTPUT | jq -r '.[0].id')
    
    rm $TEMP_SPEC
    
    print_success "App created with ID: $APP_ID"
    print_info "This will trigger an initial deployment"
}

# Wait for deployment
wait_for_deployment() {
    print_header "Waiting for Deployment"
    
    print_info "This may take 5-10 minutes..."
    print_info "You can also check progress at: https://cloud.digitalocean.com/apps/$APP_ID"
    echo ""
    
    # Wait for deployment to be active
    while true; do
        DEPLOYMENT=$(doctl apps list-deployments $APP_ID --output json 2>/dev/null | jq -r '.[0] // empty')
        
        if [ -z "$DEPLOYMENT" ]; then
            print_info "Waiting for deployment to start..."
            sleep 10
            continue
        fi
        
        PHASE=$(echo $DEPLOYMENT | jq -r '.phase // "UNKNOWN"')
        PROGRESS=$(echo $DEPLOYMENT | jq -r '.progress.success_steps // "?"')
        TOTAL=$(echo $DEPLOYMENT | jq -r '.progress.total_steps // "?"')
        
        echo -ne "\rStatus: $PHASE (${PROGRESS}/${TOTAL})      "
        
        if [ "$PHASE" = "ACTIVE" ]; then
            echo ""
            print_success "Deployment active!"
            break
        elif [ "$PHASE" = "ERROR" ]; then
            echo ""
            print_error "Deployment failed"
            doctl apps list-deployments $APP_ID
            exit 1
        fi
        
        sleep 15
    done
}

# Print final instructions
print_final_instructions() {
    print_header "Deployment Complete!"
    
    APP_URL=$(doctl apps get $APP_ID --format DefaultIngress --no-header)
    
    echo ""
    echo -e "${GREEN}Your app is deployed!${NC}"
    echo ""
    echo "App URL: https://$APP_URL"
    echo "App ID: $APP_ID"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Add your custom domain in the DO dashboard:"
    echo "   https://cloud.digitalocean.com/apps/$APP_ID/settings/domains"
    echo ""
    echo "2. Configure DNS:"
    echo "   Create a CNAME record: $DOMAIN → $APP_URL"
    echo ""
    echo "3. Run database migrations and seed data:"
    echo "   (Use the DO console or run locally with prod DB URL)"
    echo ""
    echo "   npm --workspace @printpress/web run prisma:migrate:deploy"
    echo "   npm --workspace @printpress/web run seed:org -- \"Your Company\" \"Full Name\" \"ops@$DOMAIN\""
    echo "   npm --workspace @printpress/web run seed:user -- admin@$DOMAIN <password> ADMIN \"Admin Name\" INTERNAL <company_id>"
    echo ""
    echo "4. Configure Spaces CORS (required for file uploads):"
    echo "   Go to: https://cloud.digitalocean.com/spaces/$SPACES_BUCKET/settings/cors"
    echo "   Add your domain to Allowed Origins"
    echo ""
    echo "5. Verify Postmark sender domain (if configured):"
    echo "   Add DNS records from Postmark for SPF/DKIM"
    echo ""
    echo "Important files:"
    echo "  • Secrets saved to: /tmp/printpress-secrets.txt"
    echo "  • App spec: do/app.platform.yaml"
    echo ""
    echo "To update the app later:"
    echo "  git push origin main  # Auto-deploy is enabled"
    echo ""
    
    if [ "$SPACES_ACCESS_KEY" = "REPLACE_ME" ] || [ "$POSTMARK_SERVER_TOKEN" = "REPLACE_ME" ]; then
        print_warning "Some secrets are still set to REPLACE_ME"
        print_info "Update them in the DO dashboard: https://cloud.digitalocean.com/apps/$APP_ID/settings"
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       PrintPress - DigitalOcean Deployment Script         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    check_prerequisites
    get_user_config
    generate_secrets
    create_database
    create_spaces_bucket
    get_email_config
    create_app
    wait_for_deployment
    print_final_instructions
}

# Run main function
main
