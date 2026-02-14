# ChefFlow V1 - Automated Verification Runner (PowerShell/Windows)
# Exit on first failure

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ChefFlow V1 - Automated Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Supabase CLI
Write-Host "Step 1: Checking Supabase CLI..." -ForegroundColor Yellow
try {
    $version = supabase --version 2>&1
    Write-Host "✓ Supabase CLI found: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ Supabase CLI not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Supabase CLI:" -ForegroundColor Yellow
    Write-Host "  scoop: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase"
    Write-Host "  npm: npm install -g supabase"
    exit 1
}
Write-Host ""

# Step 2: Check if linked to project
Write-Host "Step 2: Checking Supabase project link..." -ForegroundColor Yellow
try {
    supabase projects list 2>&1 | Out-Null
} catch {
    Write-Host "⚠ Not logged in to Supabase" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run these commands ONCE, then re-run this script:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  supabase login"
    Write-Host "  supabase link --project-ref <your-project-ref>"
    Write-Host ""
    exit 1
}

try {
    supabase migration list 2>&1 | Out-Null
    Write-Host "✓ Linked to Supabase project" -ForegroundColor Green
} catch {
    Write-Host "⚠ Not linked to a Supabase project" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run this command ONCE, then re-run this script:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  supabase link --project-ref <your-project-ref>"
    Write-Host ""
    Write-Host "Get your project-ref from: Supabase Dashboard > Settings > General > Project ID"
    Write-Host ""
    exit 1
}
Write-Host ""

# Step 3: Push migrations
Write-Host "Step 3: Applying migrations..." -ForegroundColor Yellow
try {
    supabase db push
    Write-Host "✓ Migrations applied successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Migration push failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Install verification dependencies
Write-Host "Step 4: Installing verification script dependencies..." -ForegroundColor Yellow
Push-Location scripts
try {
    npm install --silent
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "✗ npm install failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host ""

# Step 5: Run Test 1 - Migrations
Write-Host "Step 5: Running Test 1 - Migrations verification..." -ForegroundColor Yellow
try {
    supabase db execute --file scripts/verify-migrations.sql | Out-File -FilePath verification-1-migrations.txt
    Write-Host "✓ Test 1 completed" -ForegroundColor Green
    Get-Content verification-1-migrations.txt
} catch {
    Write-Host "✗ Test 1 failed" -ForegroundColor Red
    Get-Content verification-1-migrations.txt
    exit 1
}
Write-Host ""

# Step 6: Run Test 2 - RLS
Write-Host "Step 6: Running Test 2 - RLS isolation (real client test)..." -ForegroundColor Yellow
Push-Location scripts
try {
    npx tsx verify-rls-harness.ts 2>&1 | Out-File -FilePath ../verification-2-rls.txt
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -eq 0) {
        Write-Host "✓ Test 2 PASSED" -ForegroundColor Green
        Get-Content verification-2-rls.txt
    } else {
        Write-Host "✗ Test 2 FAILED" -ForegroundColor Red
        Get-Content verification-2-rls.txt
        exit 1
    }
} catch {
    Pop-Location
    Write-Host "✗ Test 2 FAILED" -ForegroundColor Red
    Get-Content verification-2-rls.txt
    exit 1
}
Write-Host ""

# Step 7: Run Test 3 - Immutability
Write-Host "Step 7: Running Test 3 - Immutability enforcement..." -ForegroundColor Yellow
try {
    supabase db execute --file scripts/verify-immutability-strict.sql | Out-File -FilePath verification-3-immutability.txt
    Write-Host "✓ Test 3 completed" -ForegroundColor Green
    Get-Content verification-3-immutability.txt
} catch {
    Write-Host "✗ Test 3 failed" -ForegroundColor Red
    Get-Content verification-3-immutability.txt
    exit 1
}
Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✓ All verifications PASSED" -ForegroundColor Green
Write-Host ""
Write-Host "Output files created:"
Write-Host "  - verification-1-migrations.txt"
Write-Host "  - verification-2-rls.txt"
Write-Host "  - verification-3-immutability.txt"
Write-Host ""
Write-Host "✅ READY FOR PHASE 2" -ForegroundColor Green
