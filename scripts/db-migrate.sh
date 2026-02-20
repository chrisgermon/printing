#!/bin/bash
#
# Database migration script for PrintPress
# Can run against local or production database
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
print_error() { echo -e "${RED}✗ $1${NC}"; }

# Check if in correct directory
if [ ! -f "apps/web/package.json" ]; then
    print_error "Please run this script from the project root"
    exit 1
fi

# Menu
print_header "PrintPress Database Migration"
echo ""
echo "This script will run database migrations and optionally seed data."
echo ""
echo "Current DATABASE_URL:"
if [ -f "apps/web/.env.local" ]; then
    grep "DATABASE_URL" apps/web/.env.local | head -1 || echo "  (not set in .env.local)"
elif [ -f "apps/web/.env" ]; then
    grep "DATABASE_URL" apps/web/.env | head -1 || echo "  (not set in .env)"
else
    echo "  (no env file found)"
fi
echo ""
echo "Options:"
echo "  1. Run migrations (local development)"
echo "  2. Run migrations (production - will ask for confirmation)"
echo "  3. Seed organization"
echo "  4. Seed admin user"
echo "  5. Full setup (migrations + seed org + seed admin)"
echo "  6. Reset database (DANGER - drops all data)"
echo "  7. Exit"
echo ""
read -p "Choose an option: " choice

run_migrations() {
    print_info "Running Prisma migrations..."
    npm --workspace @printpress/web run prisma:migrate:deploy
    print_success "Migrations complete"
}

run_migrations_dev() {
    print_info "Running Prisma migrations (development mode)..."
    npm --workspace @printpress/web run prisma:migrate:dev
    print_success "Migrations complete"
}

seed_org() {
    print_header "Seed Organization"
    read -p "Company name: " company_name
    read -p "Full legal name: " legal_name
    read -p "Email: " email
    
    npm --workspace @printpress/web run seed:org -- "$company_name" "$legal_name" "$email"
}

seed_admin() {
    print_header "Seed Admin User"
    read -p "Admin email: " email
    read -s -p "Password: " password
    echo ""
    read -p "Name: " name
    
    # Get company ID
    print_info "Note: You need the company ID from the seeded organization"
    read -p "Company ID: " company_id
    
    npm --workspace @printpress/web run seed:user -- "$email" "$password" ADMIN "$name" INTERNAL "$company_id"
}

reset_db() {
    print_warning "This will DROP ALL DATA in the database!"
    read -p "Type 'DELETE' to confirm: " confirm
    if [ "$confirm" = "DELETE" ]; then
        print_info "Resetting database..."
        npm --workspace @printpress/web run prisma:migrate:reset
        print_success "Database reset"
    else
        print_info "Cancelled"
    fi
}

case $choice in
    1)
        run_migrations_dev
        ;;
    2)
        print_warning "You are about to run migrations on PRODUCTION"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            run_migrations
        else
            print_info "Cancelled"
        fi
        ;;
    3)
        seed_org
        ;;
    4)
        seed_admin
        ;;
    5)
        run_migrations_dev
        seed_org
        seed_admin
        print_success "Full setup complete!"
        ;;
    6)
        reset_db
        ;;
    7)
        echo "Exiting"
        exit 0
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac
