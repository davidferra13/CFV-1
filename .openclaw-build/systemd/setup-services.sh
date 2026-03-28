#!/bin/bash
# OpenClaw - Systemd Service Setup Script
# Run this on the Pi to install and enable all services.
# Usage: sudo bash setup-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="/etc/systemd/system"
OPENCLAW_DIR="/home/davidferra/openclaw-prices"

echo "=== OpenClaw Service Setup ==="

# Copy service files
echo "Installing service files..."
cp "$SCRIPT_DIR/openclaw-sync-api.service" "$SERVICE_DIR/"
cp "$SCRIPT_DIR/openclaw-receipt-processor.service" "$SERVICE_DIR/"

# Reload systemd
echo "Reloading systemd..."
systemctl daemon-reload

# Enable and start services
echo "Enabling services..."
systemctl enable openclaw-sync-api
systemctl enable openclaw-receipt-processor

echo "Starting services..."
systemctl start openclaw-sync-api
systemctl start openclaw-receipt-processor

# Set up cron jobs for scrapers
echo "Setting up cron schedule..."
CRON_FILE="/tmp/openclaw-cron"

# Write cron schedule
cat > "$CRON_FILE" << 'CRON'
# OpenClaw Price Intelligence - Scraper Schedule
# All times are server-local (EST/EDT)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
OPENCLAW_DIR=/home/davidferra/openclaw-prices

# Government data (BLS, FRED, USDA) - Weekly on Monday at 2 AM
0 2 * * 1 cd $OPENCLAW_DIR && node services/scraper-government.mjs >> logs/scraper-government.log 2>&1

# Hannaford - Daily at 3 AM
0 3 * * * cd $OPENCLAW_DIR && node services/scraper-hannaford.mjs >> logs/scraper-hannaford.log 2>&1

# Stop & Shop - Daily at 4 AM (stop-and-shop only)
0 4 * * * cd $OPENCLAW_DIR && node services/scraper-stopsandshop.mjs stop-and-shop >> logs/scraper-stopsandshop.log 2>&1

# Shaw's - Daily at 4:30 AM
30 4 * * * cd $OPENCLAW_DIR && node services/scraper-stopsandshop.mjs shaws >> logs/scraper-shaws.log 2>&1

# Whole Foods - Daily at 5 AM
0 5 * * * cd $OPENCLAW_DIR && node services/scraper-wholefoodsapfresh.mjs whole-foods >> logs/scraper-wholefoods.log 2>&1

# Amazon Fresh - Daily at 5:30 AM
30 5 * * * cd $OPENCLAW_DIR && node services/scraper-wholefoodsapfresh.mjs amazon-fresh >> logs/scraper-amazonfresh.log 2>&1

# Instacart: Market Basket - Daily at 6 AM (highest priority store)
0 6 * * * cd $OPENCLAW_DIR && node services/scraper-instacart.mjs market-basket >> logs/scraper-instacart-mb.log 2>&1

# Instacart: Aldi - Tue/Thu/Sat at 6:30 AM
30 6 * * 2,4,6 cd $OPENCLAW_DIR && node services/scraper-instacart.mjs aldi >> logs/scraper-instacart-aldi.log 2>&1

# Instacart: Costco - Mon/Wed/Fri at 7 AM
0 7 * * 1,3,5 cd $OPENCLAW_DIR && node services/scraper-instacart.mjs costco >> logs/scraper-instacart-costco.log 2>&1

# Instacart: BJ's - Tue/Sat at 7:30 AM
30 7 * * 2,6 cd $OPENCLAW_DIR && node services/scraper-instacart.mjs bjs >> logs/scraper-instacart-bjs.log 2>&1

# Weekly flyer scraper - Every Sunday at 8 AM (flyers usually change Sunday)
0 8 * * 0 cd $OPENCLAW_DIR && node services/scraper-flyers.mjs >> logs/scraper-flyers.log 2>&1

# Wholesale catalog index - Weekly on Wednesday at 9 AM
0 9 * * 3 cd $OPENCLAW_DIR && node services/scraper-wholesale.mjs >> logs/scraper-wholesale.log 2>&1

# Aggregator (trends, aging, anomaly detection) - Daily at 10 AM
0 10 * * * cd $OPENCLAW_DIR && node services/aggregator.mjs >> logs/aggregator.log 2>&1

# Watchdog - Every 15 minutes
*/15 * * * * cd $OPENCLAW_DIR && node services/watchdog.mjs >> logs/watchdog.log 2>&1

# Pending receipt processing - Every 30 minutes
*/30 * * * * cd $OPENCLAW_DIR && node services/receipt-processor.mjs batch >> logs/receipt-batch.log 2>&1

# Log rotation - Weekly on Sunday at midnight
0 0 * * 0 find $OPENCLAW_DIR/logs -name "*.log" -size +10M -exec truncate -s 0 {} \;
CRON

# Install crontab for davidferra
crontab -u davidferra "$CRON_FILE"
rm "$CRON_FILE"

# Create logs directory
mkdir -p "$OPENCLAW_DIR/logs"
chown davidferra:davidferra "$OPENCLAW_DIR/logs"

# Create receipts directories
mkdir -p "$OPENCLAW_DIR/data/receipts"
mkdir -p "$OPENCLAW_DIR/data/receipts-processed"
mkdir -p "$OPENCLAW_DIR/data/receipts-failed"
chown -R davidferra:davidferra "$OPENCLAW_DIR/data"

echo ""
echo "=== Setup Complete ==="
echo "Services:"
echo "  openclaw-sync-api:         $(systemctl is-active openclaw-sync-api)"
echo "  openclaw-receipt-processor: $(systemctl is-active openclaw-receipt-processor)"
echo ""
echo "Cron jobs installed. View with: crontab -l -u davidferra"
echo ""
echo "Scraper schedule:"
echo "  2:00 AM - Government data (weekly Mon)"
echo "  3:00 AM - Hannaford (daily)"
echo "  4:00 AM - Stop & Shop (daily)"
echo "  4:30 AM - Shaw's (daily)"
echo "  5:00 AM - Whole Foods (daily)"
echo "  5:30 AM - Amazon Fresh (daily)"
echo "  6:00 AM - Market Basket via Instacart (daily)"
echo "  6:30 AM - Aldi via Instacart (Tue/Thu/Sat)"
echo "  7:00 AM - Costco via Instacart (Mon/Wed/Fri)"
echo "  7:30 AM - BJ's via Instacart (Tue/Sat)"
echo "  8:00 AM - Weekly flyers (Sunday)"
echo "  9:00 AM - Wholesale catalogs (Wednesday)"
echo "  10:00 AM - Aggregator (daily)"
echo "  Every 15 min - Watchdog"
echo "  Every 30 min - Receipt batch processing"
