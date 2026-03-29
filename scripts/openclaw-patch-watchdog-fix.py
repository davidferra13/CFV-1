#!/usr/bin/env python3
"""Fix watchdog staleness rule to get its own db handle."""

PATH_FILE = '/home/davidferra/openclaw-prices/services/watchdog.mjs'

with open(PATH_FILE, 'r') as f:
    content = f.read()

old = """    const staleResult = db.prepare(`"""
new = """    const db = getDb();
    const staleResult = db.prepare(`"""

if old in content:
    content = content.replace(old, new, 1)
    with open(PATH_FILE, 'w') as f:
        f.write(content)
    print('Fixed: staleness rule now gets its own db handle')
else:
    print('SKIP: Pattern not found')
