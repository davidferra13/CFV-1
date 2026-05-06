#!/usr/bin/env python3
"""
OpenClaw Price Bridge API v2
Lightweight HTTP server exposing prices.db over the local network.
Designed for sub-5ms responses over direct ethernet to ChefFlow.

v2 improvements:
  - Food-only filtering (excludes _NON_FOOD category and is_food=0)
  - Smarter fuzzy matching (word-boundary, not substring)
  - Higher result limits (25 instead of 10)
  - Product relevance scoring in results
  - /cleanup endpoint for data quality stats

Endpoints:
  GET /health              - Server status + DB stats
  GET /price?name=<>&state=<>  - Single ingredient price lookup
  POST /prices             - Batch ingredient price lookup (JSON body)
  GET /stores?state=<>     - Store locations by state
  GET /search?q=<>         - Search ingredients by partial name
  GET /cleanup-stats       - Data quality statistics
"""

import json
import sqlite3
import os
import re
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

DB_PATH = '/home/davidferra/openclaw-prices/data/prices.db'
PORT = 7700
HOST = '0.0.0.0'

# Food-only categories (exclude _NON_FOOD, Other)
FOOD_CATEGORIES = {
    'Dairy', 'Produce', 'Protein', 'Pantry', 'Baking',
    'Oils & Spices', 'Grains & Bakery', 'Beverages', 'Snacks',
    'Prepared & Deli', 'Frozen', 'flipp-circular', 'usda-terminal',
    'suggested'
}

# Chain-to-state mapping for Instacart sources (primary operating states)
# Used when source_registry lacks state data for a chain
CHAIN_STATES = {
    'ic-stop-and-shop': ['MA', 'CT', 'NJ', 'NY', 'RI'],
    'ic-hannaford': ['ME', 'NH', 'VT', 'MA', 'NY'],
    'ic-market-basket': ['MA', 'NH', 'ME'],
    'ic-shaws': ['MA', 'ME', 'NH', 'VT', 'CT', 'RI'],
    'ic-star-market': ['MA'],
    'ic-price-chopper': ['NY', 'VT', 'CT', 'MA', 'NH', 'PA'],
    'ic-wegmans': ['NY', 'PA', 'NJ', 'VA', 'MD', 'MA', 'NC'],
    'ic-giant': ['PA', 'MD', 'VA', 'WV', 'DE'],
    'ic-giant-eagle': ['PA', 'OH', 'WV', 'IN', 'MD'],
    'ic-heb': ['TX'],
    'ic-publix': ['FL', 'GA', 'AL', 'SC', 'TN', 'NC', 'VA'],
    'ic-kroger': ['OH', 'KY', 'IN', 'MI', 'WV', 'GA', 'TX', 'CO', 'AZ', 'NM', 'OR', 'WA'],
    'ic-ralphs': ['CA'],
    'ic-fred-meyer': ['OR', 'WA', 'ID', 'AK'],
    'ic-qfc': ['WA', 'OR'],
    'ic-albertsons': ['CA', 'CO', 'TX', 'WA', 'OR', 'ID', 'MT', 'WY', 'NM', 'NV', 'UT', 'AZ'],
    'ic-safeway': ['CA', 'CO', 'WA', 'OR', 'MD', 'VA', 'DC', 'AK', 'HI'],
    'ic-vons': ['CA', 'NV'],
    'ic-jewel-osco': ['IL', 'IN', 'IA'],
    'ic-marianos': ['IL'],
    'ic-meijer': ['MI', 'OH', 'IN', 'IL', 'KY', 'WI'],
    'ic-hy-vee': ['IA', 'MN', 'NE', 'SD', 'KS', 'MO', 'WI', 'IL'],
    'ic-food-lion': ['NC', 'SC', 'VA', 'MD', 'DE', 'GA', 'TN', 'KY', 'WV', 'PA'],
    'ic-shoprite': ['NJ', 'NY', 'CT', 'PA', 'DE', 'MD'],
    'ic-winn-dixie': ['FL', 'AL', 'GA', 'LA', 'MS'],
    'ic-lucky': ['CA'],
    'ic-pavilions': ['CA'],
    'ic-tom-thumb': ['TX'],
    'ic-randalls': ['TX'],
    'ic-acme': ['PA', 'NJ', 'DE', 'MD', 'NY', 'CT'],
    'ic-bjs': ['MA', 'CT', 'NY', 'NJ', 'PA', 'MD', 'VA', 'FL', 'OH', 'MI', 'GA', 'NC', 'SC', 'NH', 'ME', 'RI'],
    'ic-costco': ['CA', 'WA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'NJ', 'VA', 'GA', 'CO', 'AZ', 'MN', 'MI', 'OR'],
    'ic-grocery-outlet': ['CA', 'OR', 'WA', 'ID', 'NV', 'PA'],
    'ic-price-rite': ['CT', 'MA', 'MD', 'NJ', 'NY', 'PA', 'RI'],
    'ic-seven-eleven': ['TX', 'CA', 'FL', 'VA', 'NY', 'IL', 'OH', 'PA', 'CO', 'AZ'],
}

# Flipp circular sources with location hints
FLIPP_STATES = {
    'flipp-stopandshop': ['MA', 'CT', 'NJ', 'NY', 'RI'],
    'flipp-hannaford': ['ME', 'NH', 'VT', 'MA', 'NY'],
    'flipp-shaws': ['MA', 'ME', 'NH', 'VT', 'CT', 'RI'],
    'flipp-marketbasket': ['MA', 'NH', 'ME'],
    'flipp-wegmans': ['NY', 'PA', 'NJ', 'VA', 'MD', 'MA', 'NC'],
    'flipp-publix': ['FL', 'GA', 'AL', 'SC', 'TN', 'NC', 'VA'],
    'flipp-kroger': ['OH', 'KY', 'IN', 'MI', 'WV', 'GA', 'TX', 'CO'],
    'flipp-heb': ['TX'],
    'flipp-albertsons': ['CA', 'CO', 'TX', 'WA', 'OR'],
    'flipp-safeway': ['CA', 'CO', 'WA', 'OR', 'MD', 'VA'],
    'flipp-meijer': ['MI', 'OH', 'IN', 'IL', 'KY', 'WI'],
    'flipp-foodlion': ['NC', 'SC', 'VA', 'MD', 'DE', 'GA'],
    'flipp-winndixie': ['FL', 'AL', 'GA', 'LA', 'MS'],
    'flipp-jewel': ['IL', 'IN', 'IA'],
    'flipp-acme': ['PA', 'NJ', 'DE', 'MD', 'NY', 'CT'],
    'flipp-shoprite': ['NJ', 'NY', 'CT', 'PA', 'DE', 'MD'],
    'flipp-giantfood': ['PA', 'MD', 'VA', 'WV', 'DE'],
    'flipp-target': ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'MN'],
    'flipp-walmart': ['TX', 'CA', 'FL', 'NY', 'PA', 'OH', 'IL', 'GA', 'NC', 'MI'],
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    return conn


# Build reverse lookup: source_id -> set of states
_SOURCE_STATES = {}
for src, states in {**CHAIN_STATES, **FLIPP_STATES}.items():
    _SOURCE_STATES[src] = set(states)

# Also handle USDA/government sources (nationwide)
_NATIONWIDE_SOURCES = set()


def sources_for_state(state):
    """Return list of source_ids that serve a given state."""
    state = state.upper()
    matching = []
    for src, states in _SOURCE_STATES.items():
        if state in states:
            matching.append(src)
    # Always include USDA/government sources
    matching.extend(_NATIONWIDE_SOURCES)
    return matching


# Non-food product keywords: if raw_product_name contains any of these,
# it's likely not a food product even if linked to a food ingredient
NON_FOOD_PRODUCT_KEYWORDS = [
    # Personal care & cosmetics
    'lotion', 'shampoo', 'conditioner', 'soap', 'detergent',
    'deodorant', 'antiperspirant', 'moisturizer', 'sunscreen',
    'lip gloss', 'lip balm', 'mascara', 'foundation', 'concealer',
    'hair mask', 'body wash', 'body butter', 'petroleum jelly',
    'hand cream', 'face wash', 'cleanser', 'toner', 'serum',
    'makeup', 'cosmetic', 'nail polish', 'perfume', 'cologne',
    'toothpaste', 'mouthwash', 'dental', 'floss',
    # Cosmetic signal words (catches Palmer's Cocoa Butter Formula etc.)
    'heals & softens', 'hydrating', 'anti-aging', 'skin care',
    'deep conditioning', 'hair treatment', 'body oil',
    'after sun', 'spf ', 'uv protection',
    # Household
    'diaper', 'wipe', 'tissue', 'paper towel', 'toilet paper',
    'laundry', 'fabric softener', 'bleach', 'disinfectant',
    'trash bag', 'aluminum foil', 'plastic wrap', 'sponge',
    'steel wool', 'dish wand', 'bowl brush', 'scrubber',
    'battery', 'lightbulb', 'candle',
    # Pet
    'cat food', 'dog food', 'pet treat', 'kitty litter',
    # Health/pharmacy
    'bandage', 'first aid', 'thermometer', 'medicine',
    'vitamin', 'supplement', 'probiotic', 'melatonin',
    'condom', 'lubricant', 'acne', 'benzoyl peroxide',
    # Cosmetic brands appearing in grocery stores
    'physicians formula', 'nyx professional',
    'olay ', 'dove beauty', 'maui moisture',
]

# Compile regex for performance
_NON_FOOD_RE = re.compile(
    '|'.join(re.escape(kw) for kw in NON_FOOD_PRODUCT_KEYWORDS),
    re.IGNORECASE
)


def is_food_product(product_name, ingredient_name):
    """Check if a product is actually a food product relevant to the ingredient."""
    if not product_name:
        return True  # No name = can't filter, keep it
    pn = product_name.lower()
    # Reject non-food products
    if _NON_FOOD_RE.search(pn):
        return False
    return True


def find_ingredient(conn, name):
    """
    Find canonical ingredient with smart matching strategy.

    Strategy (in order):
    1. Exact case-insensitive match
    2. Normalized match (strip common prefixes like "organic", "fresh")
    3. Word-boundary match (ingredient name IS the search term or starts/ends with it)
    4. LIKE substring (last resort, food-only)
    """
    # 1. Exact match
    ingredient = conn.execute(
        'SELECT ingredient_id, name, category, standard_unit '
        'FROM canonical_ingredients WHERE LOWER(name) = LOWER(?) '
        'AND (is_food = 1 OR is_food IS NULL) AND category != ? '
        'LIMIT 1',
        (name, '_NON_FOOD')
    ).fetchone()
    if ingredient:
        return ingredient, 'exact'

    # 2. Normalized: strip "organic", "fresh", "raw", etc.
    stripped = re.sub(
        r'^(organic|fresh|raw|dried|ground|whole|chopped|minced|diced|sliced|frozen|canned)\s+',
        '', name.lower()
    ).strip()
    if stripped != name.lower():
        ingredient = conn.execute(
            'SELECT ingredient_id, name, category, standard_unit '
            'FROM canonical_ingredients WHERE LOWER(name) = LOWER(?) '
            'AND (is_food = 1 OR is_food IS NULL) AND category != ? '
            'LIMIT 1',
            (stripped, '_NON_FOOD')
        ).fetchone()
        if ingredient:
            return ingredient, 'normalized'

    # 3. Word-boundary match: name starts with term, or term starts with name
    # e.g., "butter" matches "Butter (Salted)" or "Unsalted Butter"
    # Use the stripped name if normalization happened, otherwise original
    search_term = stripped if stripped != name.lower() else name
    ingredient = conn.execute(
        'SELECT ingredient_id, name, category, standard_unit '
        'FROM canonical_ingredients '
        'WHERE (LOWER(name) = LOWER(?) '
        '  OR LOWER(name) LIKE LOWER(? || " %") '
        '  OR LOWER(name) LIKE LOWER("% " || ?) '
        '  OR LOWER(name) LIKE LOWER("% " || ? || " %") '
        '  OR LOWER(name) LIKE LOWER(? || " (%") '
        '  OR LOWER(name) LIKE LOWER(? || ",%")) '
        'AND (is_food = 1 OR is_food IS NULL) AND category != ? '
        'ORDER BY LENGTH(name) ASC LIMIT 1',
        (search_term, search_term, search_term, search_term, search_term, search_term, '_NON_FOOD')
    ).fetchone()
    if ingredient:
        return ingredient, 'word_boundary'

    # 4. Substring LIKE (last resort, food categories only)
    ingredient = conn.execute(
        'SELECT ingredient_id, name, category, standard_unit '
        'FROM canonical_ingredients WHERE LOWER(name) LIKE LOWER(?) '
        'AND (is_food = 1 OR is_food IS NULL) AND category != ? '
        'ORDER BY LENGTH(name) ASC LIMIT 1',
        (f'%{name}%', '_NON_FOOD')
    ).fetchone()
    if ingredient:
        return ingredient, 'fuzzy'

    return None, None


class PriceHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default logging for performance

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
        elif parsed.path == '/cleanup-stats':
            self.handle_cleanup_stats()
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
            total = conn.execute('SELECT COUNT(*) as cnt FROM current_prices').fetchone()
            food_only = conn.execute(
                'SELECT COUNT(*) as cnt FROM current_prices cp '
                'JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id '
                'WHERE (ci.is_food = 1 OR ci.is_food IS NULL) AND ci.category != ?',
                ('_NON_FOOD',)
            ).fetchone()
            self.send_json({
                'status': 'ok',
                'version': 'v2',
                'db_path': DB_PATH,
                'db_size_mb': round(os.path.getsize(DB_PATH) / 1024 / 1024, 1),
                'total_prices': total['cnt'],
                'food_prices': food_only['cnt'],
                'non_food_excluded': total['cnt'] - food_only['cnt'],
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

            ingredient, match_type = find_ingredient(conn, name)

            if not ingredient:
                elapsed_ms = (time.perf_counter() - start) * 1000
                self.send_json({
                    'ingredient': None,
                    'prices': [],
                    'count': 0,
                    'match_type': None,
                    'query_ms': round(elapsed_ms, 2)
                })
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
                        'ORDER BY cp.last_confirmed_at DESC LIMIT 25',
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
                    'ORDER BY cp.last_confirmed_at DESC LIMIT 25',
                    (ingredient['ingredient_id'],)
                ).fetchall()

            # Filter out non-food products from results
            ingredient_name = ingredient['name']
            filtered_prices = [p for p in prices if is_food_product(p['raw_product_name'], ingredient_name)]

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
                } for p in filtered_prices],
                'count': len(filtered_prices),
                'unfiltered_count': len(prices),
                'match_type': match_type,
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
                ingredient, match_type = find_ingredient(conn, name)

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
                        'unit': ingredient['standard_unit'] or 'each',
                        'match_type': match_type
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
                        'unit': ingredient['standard_unit'] or 'each',
                        'match_type': match_type
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
        """Search ingredients by partial name, food-only."""
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
                'AND (is_food = 1 OR is_food IS NULL) AND category != ? '
                'ORDER BY LENGTH(name) ASC LIMIT ?',
                (f'%{q}%', '_NON_FOOD', min(limit, 50))
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

    def handle_cleanup_stats(self):
        """Data quality statistics for monitoring."""
        conn = get_db()
        try:
            start = time.perf_counter()

            total_prices = conn.execute('SELECT COUNT(*) FROM current_prices').fetchone()[0]
            non_food = conn.execute(
                'SELECT COUNT(*) FROM current_prices cp '
                'JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id '
                'WHERE ci.is_food = 0 OR ci.category = ?', ('_NON_FOOD',)
            ).fetchone()[0]
            food_prices = total_prices - non_food

            total_ingredients = conn.execute('SELECT COUNT(*) FROM canonical_ingredients').fetchone()[0]
            food_ingredients = conn.execute(
                'SELECT COUNT(*) FROM canonical_ingredients '
                'WHERE (is_food = 1 OR is_food IS NULL) AND category != ?', ('_NON_FOOD',)
            ).fetchone()[0]

            # Standard unit quality for common ingredients
            bad_units = conn.execute(
                "SELECT COUNT(*) FROM canonical_ingredients "
                "WHERE standard_unit = 'each' AND category IN ('Dairy', 'Baking', 'Pantry', 'Produce', 'Protein', 'Oils & Spices', 'Grains & Bakery')"
            ).fetchone()[0]

            elapsed_ms = (time.perf_counter() - start) * 1000

            self.send_json({
                'total_prices': total_prices,
                'food_prices': food_prices,
                'non_food_prices': non_food,
                'non_food_pct': round(non_food / total_prices * 100, 1) if total_prices else 0,
                'total_ingredients': total_ingredients,
                'food_ingredients': food_ingredients,
                'bad_unit_count': bad_units,
                'query_ms': round(elapsed_ms, 2)
            })
        finally:
            conn.close()


if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), PriceHandler)
    print(f'OpenClaw Price Bridge v2 running on {HOST}:{PORT}')
    print(f'DB: {DB_PATH} ({os.path.getsize(DB_PATH) / 1024 / 1024:.0f} MB)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down...')
        server.shutdown()
