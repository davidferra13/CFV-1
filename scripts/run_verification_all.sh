#!/bin/bash
# ChefFlow V1 - Automated Verification Runner (Unix/macOS/Git Bash)
# Exit on first failure

set -e

echo "========================================="
echo "ChefFlow V1 - Automated Verification"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Supabase CLI
echo "Step 1: Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI not found${NC}"
    echo ""
    echo "Install Supabase CLI:"
    echo "  macOS/Linux: brew install supabase/tap/supabase"
    echo "  npm: npm install -g supabase"
    exit 1
fi
echo -e "${GREEN}✓ Supabase CLI found: $(supabase --version)${NC}"
echo ""

# Step 2: Check if linked to project
echo "Step 2: Checking Supabase project link..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠ Not logged in to Supabase${NC}"
    echo ""
    echo "Run these commands ONCE, then re-run this script:"
    echo ""
    echo "  supabase login"
    echo "  supabase link --project-ref <your-project-ref>"
    echo ""
    exit 1
fi

# Check if actually linked
if ! supabase migration list &> /dev/null; then
    echo -e "${YELLOW}⚠ Not linked to a Supabase project${NC}"
    echo ""
    echo "Run this command ONCE, then re-run this script:"
    echo ""
    echo "  supabase link --project-ref <your-project-ref>"
    echo ""
    echo "Get your project-ref from: Supabase Dashboard > Settings > General > Project ID"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Linked to Supabase project${NC}"
echo ""

# Step 3: Push migrations
echo "Step 3: Applying migrations..."
if supabase db push; then
    echo -e "${GREEN}✓ Migrations applied successfully${NC}"
else
    echo -e "${RED}✗ Migration push failed${NC}"
    exit 1
fi
echo ""

# Step 4: Install verification dependencies
echo "Step 4: Installing verification script dependencies..."
cd scripts
if npm install --silent; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ npm install failed${NC}"
    exit 1
fi
cd ..
echo ""

# Step 5: Run Test 1 - Migrations
echo "Step 5: Running Test 1 - Migrations verification..."
if supabase db execute --file scripts/verify-migrations.sql > verification-1-migrations.txt 2>&1; then
    echo -e "${GREEN}✓ Test 1 completed${NC}"
    cat verification-1-migrations.txt
else
    echo -e "${RED}✗ Test 1 failed${NC}"
    cat verification-1-migrations.txt
    exit 1
fi
echo ""

# Step 6: Run Test 2 - RLS
echo "Step 6: Running Test 2 - RLS isolation (real client test)..."
cd scripts
if npx tsx verify-rls-harness.ts > ../verification-2-rls.txt 2>&1; then
    echo -e "${GREEN}✓ Test 2 PASSED${NC}"
    cat ../verification-2-rls.txt
else
    echo -e "${RED}✗ Test 2 FAILED${NC}"
    cat ../verification-2-rls.txt
    exit 1
fi
cd ..
echo ""

# Step 7: Run Test 3 - Immutability
echo "Step 7: Running Test 3 - Immutability enforcement..."
if supabase db execute --file scripts/verify-immutability-strict.sql > verification-3-immutability.txt 2>&1; then
    echo -e "${GREEN}✓ Test 3 completed${NC}"
    cat verification-3-immutability.txt
else
    echo -e "${RED}✗ Test 3 failed${NC}"
    cat verification-3-immutability.txt
    exit 1
fi
echo ""

# Summary
echo "========================================="
echo "VERIFICATION SUMMARY"
echo "========================================="
echo -e "${GREEN}✓ All verifications PASSED${NC}"
echo ""
echo "Output files created:"
echo "  - verification-1-migrations.txt"
echo "  - verification-2-rls.txt"
echo "  - verification-3-immutability.txt"
echo ""
echo -e "${GREEN}✅ READY FOR PHASE 2${NC}"
