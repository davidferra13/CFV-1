#!/usr/bin/env python3
"""
OpenClaw Price Bridge API
Lightweight HTTP server exposing prices.db over the local network.
Designed for sub-5ms responses over direct ethernet to ChefFlow.

Endpoints:
  GET /health              - Server status + DB stats
  GET /price?name=<>&state=<>  - Single ingredient price lookup
  POST /prices             - Batch ingredient price lookup (JSON body)
  GET /stores?state=<>     - Store locations by state
  GET /search?q=<>         - Search ingredients by partial name
"""

import json
import sqlite3
import os
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

DB_PATH = '/home/davidferra/openclaw-prices/data/prices.db'
PORT = 7700
HOST = '0.0.0.0'

# Chain-to-state mapping for Instacart sources (primary operating states)
# Used when source_registry lacks state data for a chain
CHAIN_STATES = {
    'ic-market-basket': ['MA', 'NH', 'ME'],
    'ic-hannaford': ['ME', 'NH', 'MA', 'VT', 'NY'],
    'ic-stop-and-shop': ['MA', 'CT', 'NJ', 'NY'],
    'ic-star-market': ['MA'],
    'ic-shaws': ['MA', 'NH', 'ME', 'VT'],
    'ic-big-y': ['MA', 'CT'],
    'ic-shoprite': ['NJ', 'NY', 'CT', 'PA', 'DE', 'MD'],
    'ic-wegmans': ['NY', 'PA', 'NJ', 'VA', 'MD', 'MA'],
    'ic-heb': ['TX'],
    'ic-tom-thumb': ['TX'],
    'ic-randalls': ['TX'],
    'ic-jewel-osco': ['IL', 'IN'],
    'ic-safeway': ['CA', 'WA', 'OR', 'MD', 'VA', 'DC'],
    'ic-vons': ['CA'],
    'ic-albertsons': ['CA', 'WA', 'OR', 'TX', 'CO'],
    'ic-fred-meyer': ['WA', 'OR', 'ID'],
    'ic-king-soopers': ['CO'],
    'ic-giant-food': ['DC', 'MD', 'VA', 'DE'],
    'ic-ralphs': ['CA'],
    'ic-publix': ['FL', 'GA', 'SC', 'NC', 'TN', 'AL', 'VA'],
    'ic-meijer': ['OH', 'MI', 'IN', 'IL', 'WI'],
    'ic-aldi': ['MA', 'CT', 'NY', 'NJ', 'PA', 'OH', 'IL', 'TX', 'FL', 'GA'],
    'ic-costco': ['MA', 'CA', 'TX', 'WA', 'NY', 'FL', 'IL', 'PA'],
    'ic-bjs-wholesale-club': ['MA', 'NH', 'CT', 'NY', 'NJ', 'PA', 'FL', 'OH'],
    'ic-price-chopper': ['NY', 'VT', 'NH', 'MA', 'CT', 'PA'],
    'ic-grocery-outlet': ['CA', 'WA', 'OR', 'PA', 'NJ'],
}

# Flipp circular sources with location hints
FLIPP_STATES = {
    'shaws-flipp': ['MA', 'NH', 'ME', 'VT'],
    'stop-shop-flipp': ['MA', 'CT', 'NJ', 'NY'],
    'market-basket-flipp': ['MA', 'NH', 'ME'],
    'hannaford-flipp': ['ME', 'NH', 'MA', 'VT', 'NY'],
}

# Build reverse lookup: source_id -> set of states
_SOURCE_TO_STATES = {}
for src, states in {**CHAIN_STATES, **FLIPP_STATES}.items():
    _SOURCE_TO_STATES[src] = set(s.upper() for s in states)


def sources_for_state(state: str) -> list:
    """Get all source_ids that serve a given state."""
    state_upper = state.upper()
    return [src for src, states in _SOURCE_TO_STATES.items() if state_upper in states]


def get_db():
    """Thread-local DB connection with WAL mode for concurrent reads."""
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA cache_size=-64000')  # 64MB cache
    conn.execute('PRAGMA mmap_size=268435456')  # 256MB mmap
    return conn


class PriceHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default logging for speed

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if parsed.path == '/health':
            self.handle_health()
        elif parsed.path == '/price':
            self.handle_price(params)
        elif parsed.path == '/stores':
            self.handle_stores(params)
        elif parsed.path == '/search':
            self.handle_search(params)
        else:
            self.send_json({'error': 'Not found'}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/prices':
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))
            self.handle_batch_prices(body)
        else:
            self.send_json({'error': 'Not found'}, 404)

    def handle_health(self):
        conn = get_db()
        try:
            row = conn.execute('SELECT COUNT(*) as cnt FROM current_prices').fetchone()
            self.send_json({
                'status': 'ok',
                'db_path': DB_PATH,
                'db_size_mb': round(os.path.getsize(DB_PATH) / 1024 / 1024, 1),
                'total_prices': row['cnt'],
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S')
            })
        finally:
            conn.close()

    def handle_price(self, params):
        """Single ingredient price lookup by name, with optional state filter."""
        name = params.get('name', [None])[0]
        state = params.get('state', [None])[0]
        if not name:
            self.send_json({'error': 'name parameter required'}, 400)
            return

        conn = get_db()
        try:
            start = time.perf_counter()

            # Find canonical ingredient by exact then fuzzy name match
            ingredient = conn.execute(
                'SELECT ingredient_id, name, category, standard_unit '
                'FROM canonical_ingredients WHERE LOWER(name) = LOWER(?) LIMIT 1',
                (name,)
            ).fetchone()

            if not ingredient:
                ingredient = conn.execute(
                    'SELECT ingredient_id, name, category, standard_unit '
                    'FROM canonical_ingredients WHERE LOWER(name) LIKE LOWER(?) '
                    'ORDER BY LENGTH(name) ASC LIMIT 1',
                    (f'%{name}%',)
                ).fetchone()

            if not ingredient:
                self.send_json({'error': 'ingredient not found', 'query': name}, 404)
                return

            # Get best current prices, optionally filtered by state via source chain mapping
            if state:
                valid_sources = sources_for_state(state)
                if valid_sources:
                    placeholders = ','.join('?' * len(valid_sources))
                    prices = conn.execute(
                        'SELECT cp.price_cents, cp.price_unit, cp.price_per_standard_unit_cents, '
                        'cp.standard_unit, cp.confidence, cp.last_confirmed_at, '
                        'cp.price_type, cp.raw_product_name, cp.in_stock, '
                        'cp.source_id as store_name, ? as store_state, NULL as store_city '
                        'FROM current_prices cp '
                        'WHERE cp.canonical_ingredient_id = ? '
                        f'AND cp.source_id IN ({placeholders}) AND cp.in_stock = 1 '
                        'ORDER BY cp.last_confirmed_at DESC LIMIT 10',
                        (state.upper(), ingredient['ingredient_id'], *valid_sources)
                    ).fetchall()
                else:
                    prices = []
            else:
                prices = conn.execute(
                    'SELECT cp.price_cents, cp.price_unit, cp.price_per_standard_unit_cents, '
                    'cp.standard_unit, cp.confidence, cp.last_confirmed_at, '
                    'cp.price_type, cp.raw_product_name, cp.in_stock, '
                    'cp.source_id as store_name, NULL as store_state, NULL as store_city '
                    'FROM current_prices cp '
                    'WHERE cp.canonical_ingredient_id = ? AND cp.in_stock = 1 '
                    'ORDER BY cp.last_confirmed_at DESC LIMIT 10',
                    (ingredient['ingredient_id'],)
                ).fetchall()

            elapsed_ms = (time.perf_counter() - start) * 1000

            result = {
                'ingredient': {
                    'id': ingredient['ingredient_id'],
                    'name': ingredient['name'],
                    'category': ingredient['category'],
                    'standard_unit': ingredient['standard_unit']
                },
                'prices': [{
                    'price_cents': p['price_cents'],
                    'price_unit': p['price_unit'],
                    'price_per_standard_unit_cents': p['price_per_standard_unit_cents'],
                    'standard_unit': p['standard_unit'],
                    'confidence': p['confidence'],
                    'last_confirmed_at': p['last_confirmed_at'],
                    'price_type': p['price_type'],
                    'product_name': p['raw_product_name'],
                    'in_stock': bool(p['in_stock']),
                    'store': p['store_name'],
                    'state': p['store_state'],
                    'city': p['store_city']
                } for p in prices],
                'count': len(prices),
                'query_ms': round(elapsed_ms, 2)
            }
            self.send_json(result)
        finally:
            conn.close()

    def handle_batch_prices(self, body):
        """Batch lookup: {names: [...], state?: '...'} -> aggregated prices."""
        names = body.get('names', [])
        state = body.get('state')

        if not names or len(names) > 100:
            self.send_json({'error': 'names array required (max 100)'}, 400)
            return

        conn = get_db()
        try:
            start = time.perf_counter()
            results = {}

            for name in names:
                ingredient = conn.execute(
                    'SELECT ingredient_id, name, category, standard_unit '
                    'FROM canonical_ingredients WHERE LOWER(name) = LOWER(?) LIMIT 1',
                    (name,)
                ).fetchone()

                if not ingredient:
                    ingredient = conn.execute(
                        'SELECT ingredient_id, name, category, standard_unit '
                        'FROM canonical_ingredients WHERE LOWER(name) LIKE LOWER(?) '
                        'ORDER BY LENGTH(name) ASC LIMIT 1',
                        (f'%{name}%',)
                    ).fetchone()

                if not ingredient:
                    results[name] = None
                    continue

                # Get aggregated price stats (fall back to price_cents when standard not set)
                price_expr = 'COALESCE(cp.price_per_standard_unit_cents, cp.price_cents)'
                if state:
                    valid_sources = sources_for_state(state)
                    if valid_sources:
                        placeholders = ','.join('?' * len(valid_sources))
                        row = conn.execute(
                            f'SELECT COUNT(*) as cnt, '
                            f'AVG({price_expr}) as avg_cents, '
                            f'MIN({price_expr}) as min_cents, '
                            f'MAX({price_expr}) as max_cents, '
                            f'MAX(cp.last_confirmed_at) as freshest '
                            'FROM current_prices cp '
                            'WHERE cp.canonical_ingredient_id = ? '
                            f'AND cp.source_id IN ({placeholders}) AND cp.in_stock = 1 '
                            f'AND {price_expr} > 0',
                            (ingredient['ingredient_id'], *valid_sources)
                        ).fetchone()
                    else:
                        row = None
                else:
                    row = conn.execute(
                        f'SELECT COUNT(*) as cnt, '
                        f'AVG({price_expr}) as avg_cents, '
                        f'MIN({price_expr}) as min_cents, '
                        f'MAX({price_expr}) as max_cents, '
                        f'MAX(cp.last_confirmed_at) as freshest '
                        'FROM current_prices cp '
                        'WHERE cp.canonical_ingredient_id = ? '
                        f'AND cp.in_stock = 1 AND {price_expr} > 0',
                        (ingredient['ingredient_id'],)
                    ).fetchone()

                if row and row['cnt'] > 0:
                    results[name] = {
                        'ingredient_id': ingredient['ingredient_id'],
                        'canonical_name': ingredient['name'],
                        'category': ingredient['category'],
                        'avg_cents': round(row['avg_cents']) if row['avg_cents'] else None,
                        'min_cents': row['min_cents'],
                        'max_cents': row['max_cents'],
                        'observation_count': row['cnt'],
                        'freshest': row['freshest'],
                        'unit': ingredient['standard_unit'] or 'each'
                    }
                else:
                    results[name] = {
                        'ingredient_id': ingredient['ingredient_id'],
                        'canonical_name': ingredient['name'],
                        'category': ingredient['category'],
                        'avg_cents': None,
                        'min_cents': None,
                        'max_cents': None,
                        'observation_count': 0,
                        'freshest': None,
                        'unit': ingredient['standard_unit'] or 'each'
                    }

            elapsed_ms = (time.perf_counter() - start) * 1000
            self.send_json({
                'results': results,
                'query_ms': round(elapsed_ms, 2),
                'count': len(results)
            })
        finally:
            conn.close()

    def handle_stores(self, params):
        """List stores by state."""
        state = params.get('state', [None])[0]
        if not state:
            self.send_json({'error': 'state parameter required'}, 400)
            return

        conn = get_db()
        try:
            stores = conn.execute(
                'SELECT name, brand, city, state, zip, chain_slug '
                'FROM store_locations WHERE state = UPPER(?) '
                'ORDER BY brand, city LIMIT 100',
                (state,)
            ).fetchall()

            self.send_json({
                'stores': [{
                    'name': s['name'],
                    'brand': s['brand'],
                    'city': s['city'],
                    'state': s['state'],
                    'zip': s['zip'],
                    'chain': s['chain_slug']
                } for s in stores],
                'count': len(stores)
            })
        finally:
            conn.close()

    def handle_search(self, params):
        """Search ingredients by partial name."""
        q = params.get('q', [None])[0]
        limit = int(params.get('limit', ['20'])[0])
        if not q:
            self.send_json({'error': 'q parameter required'}, 400)
            return

        conn = get_db()
        try:
            start = time.perf_counter()
            rows = conn.execute(
                'SELECT ingredient_id, name, category, standard_unit '
                'FROM canonical_ingredients WHERE LOWER(name) LIKE LOWER(?) '
                'ORDER BY LENGTH(name) ASC LIMIT ?',
                (f'%{q}%', min(limit, 50))
            ).fetchall()

            elapsed_ms = (time.perf_counter() - start) * 1000
            self.send_json({
                'ingredients': [{
                    'id': r['ingredient_id'],
                    'name': r['name'],
                    'category': r['category'],
                    'unit': r['standard_unit']
                } for r in rows],
                'count': len(rows),
                'query_ms': round(elapsed_ms, 2)
            })
        finally:
            conn.close()


if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), PriceHandler)
    print(f'OpenClaw Price Bridge running on {HOST}:{PORT}')
    print(f'DB: {DB_PATH} ({os.path.getsize(DB_PATH) / 1024 / 1024:.0f} MB)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down...')
        server.shutdown()
