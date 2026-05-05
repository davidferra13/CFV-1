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
  GET /coverage?state=<>   - State-level coverage stats
"""

import json
import re
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
    # Nationwide chains (covers remaining gaps in state coverage)
    'ic-walmart': [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    ],
    'ic-kroger': [
        'AL', 'AZ', 'AR', 'CO', 'DE', 'GA', 'ID', 'IL', 'IN', 'KS',
        'KY', 'LA', 'MI', 'MS', 'MO', 'MT', 'NE', 'NV', 'NM', 'NC',
        'OH', 'OK', 'OR', 'SC', 'TN', 'TX', 'UT', 'VA', 'WA', 'WV',
        'WI', 'WY',
    ],
    'ic-target': [
        'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI',
        'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
        'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM',
        'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD',
        'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    ],
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

# ---------------------------------------------------------------------------
# Common food abbreviations and aliases (expand before matching)
# ---------------------------------------------------------------------------
FOOD_ALIASES = {
    'evoo': 'extra virgin olive oil',
    'oo': 'olive oil',
    'ap flour': 'all purpose flour',
    'ap': 'all purpose flour',
    'gp': 'garlic powder',
    'op': 'onion powder',
    'cp': 'cayenne pepper',
    'pb': 'peanut butter',
    'oj': 'orange juice',
    'cs': 'cornstarch',
    'parm': 'parmesan',
    'parmigiano': 'parmesan',
    'mozz': 'mozzarella',
    'chx': 'chicken',
    'broc': 'broccoli',
    'cauli': 'cauliflower',
    'zuke': 'zucchini',
    'zucc': 'zucchini',
    'cukes': 'cucumbers',
    'cuke': 'cucumber',
    'taters': 'potatoes',
    'shallot': 'shallots',
    'scallion': 'green onion',
    'spring onion': 'green onion',
    'rocket': 'arugula',
    'aubergine': 'eggplant',
    'courgette': 'zucchini',
    'capsicum': 'bell pepper',
    'coriander': 'cilantro',
    'chickpeas': 'garbanzo beans',
    'snow peas': 'snap peas',
    'rapeseed oil': 'canola oil',
    'bicarbonate of soda': 'baking soda',
    'bicarb': 'baking soda',
    'double cream': 'heavy cream',
    'single cream': 'light cream',
    'caster sugar': 'granulated sugar',
    'icing sugar': 'powdered sugar',
    'confectioners sugar': 'powdered sugar',
    'plain flour': 'all purpose flour',
    'self raising flour': 'self rising flour',
    'mince': 'ground beef',
    'minced beef': 'ground beef',
    'minced pork': 'ground pork',
    'minced turkey': 'ground turkey',
    'streaky bacon': 'bacon',
    'rasher': 'bacon',
    'prawn': 'shrimp',
    'prawns': 'shrimp',
    'king prawn': 'jumbo shrimp',
    'gammon': 'ham',
    'cling film': 'plastic wrap',
    'tinned tomatoes': 'canned tomatoes',
    'tin of tomatoes': 'canned tomatoes',
    'passata': 'tomato puree',
    'tomato paste': 'tomato paste',
    'semi skimmed milk': '2% milk',
    'skimmed milk': 'skim milk',
    'full fat milk': 'whole milk',
    'double cream cheese': 'cream cheese',
    'natural yoghurt': 'plain yogurt',
    'greek style yoghurt': 'greek yogurt',
}

# Prefixes to strip for normalization (mirrors ChefFlow name-normalizer.ts)
_STRIP_PREFIXES = re.compile(
    r'^(fresh|organic|homemade|dried|frozen|canned|raw|cooked|roasted|'
    r'grilled|steamed|boiled|fried|baked|smoked|pickled|marinated|'
    r'minced|diced|chopped|sliced|shredded|grated|crushed|ground|whole|'
    r'large|medium|small|extra|fine|coarse|thick|thin|boneless|skinless|'
    r'trimmed|peeled|deveined|pitted|seeded|hulled|toasted|blanched|'
    r'unsweetened|sweetened|salted|unsalted)\s+',
    re.IGNORECASE
)


def normalize_ingredient_name(name):
    """Normalize ingredient name for matching. Mirrors ChefFlow name-normalizer.ts."""
    n = name.lower().strip()

    # Expand known abbreviations first
    if n in FOOD_ALIASES:
        return FOOD_ALIASES[n]

    # Strip prefixes (up to 5 passes for stacked prefixes)
    for _ in range(5):
        stripped = _STRIP_PREFIXES.sub('', n)
        if stripped == n:
            break
        n = stripped

    # Strip parenthetical qualifiers
    n = re.sub(r'\s*\([^)]*\)\s*', ' ', n)

    # Strip bracket recipe suffixes
    n = re.sub(r'\s*\[[^\]]*\]\s*', ' ', n)

    # Normalize whitespace
    n = re.sub(r'\s+', ' ', n).strip()

    # Strip trailing brand/qualifier clauses
    n = re.sub(r',\s*(brand|store|generic|organic|local|imported|domestic).*$', '', n, flags=re.IGNORECASE)

    # Check aliases after normalization too
    if n in FOOD_ALIASES:
        return FOOD_ALIASES[n]

    return n.strip()


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
        elif parsed.path == '/coverage':
            self.handle_coverage(params)
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
            normalized = normalize_ingredient_name(name)

            # Find canonical ingredient: exact -> normalized exact -> fuzzy
            ingredient = conn.execute(
                'SELECT ingredient_id, name, category, standard_unit '
                'FROM canonical_ingredients WHERE LOWER(name) = LOWER(?) LIMIT 1',
                (name,)
            ).fetchone()

            if not ingredient:
                ingredient = conn.execute(
                    'SELECT ingredient_id, name, category, standard_unit '
                    'FROM canonical_ingredients WHERE LOWER(name) = LOWER(?) LIMIT 1',
                    (normalized,)
                ).fetchone()

            if not ingredient:
                ingredient = conn.execute(
                    'SELECT ingredient_id, name, category, standard_unit '
                    'FROM canonical_ingredients WHERE LOWER(name) LIKE LOWER(?) '
                    'ORDER BY LENGTH(name) ASC LIMIT 1',
                    (f'%{normalized}%',)
                ).fetchone()

            if not ingredient:
                self.send_json({'error': 'ingredient not found', 'query': name, 'normalized': normalized}, 404)
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
        """Batch lookup: {names: [...], state?: '...'} -> normalized per-unit prices.

        Normalization strategy:
          1. ONLY use price_per_standard_unit_cents (pre-normalized to ingredient's standard_unit)
          2. If zero normalized prices exist, fall back to raw price_cents for same-unit rows only
          3. Apply IQR filtering to remove outliers (e.g., per-clove vs per-pound mixing)
          4. Return median (robust to skew) alongside mean
        """
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
                normalized = normalize_ingredient_name(name)

                # Exact -> normalized exact -> fuzzy
                ingredient = conn.execute(
                    'SELECT ingredient_id, name, category, standard_unit '
                    'FROM canonical_ingredients WHERE LOWER(name) = LOWER(?) LIMIT 1',
                    (name,)
                ).fetchone()

                if not ingredient:
                    ingredient = conn.execute(
                        'SELECT ingredient_id, name, category, standard_unit '
                        'FROM canonical_ingredients WHERE LOWER(name) = LOWER(?) LIMIT 1',
                        (normalized,)
                    ).fetchone()

                if not ingredient:
                    ingredient = conn.execute(
                        'SELECT ingredient_id, name, category, standard_unit '
                        'FROM canonical_ingredients WHERE LOWER(name) LIKE LOWER(?) '
                        'ORDER BY LENGTH(name) ASC LIMIT 1',
                        (f'%{normalized}%',)
                    ).fetchone()

                if not ingredient:
                    results[name] = None
                    continue

                std_unit = ingredient['standard_unit'] or 'each'
                ing_id = ingredient['ingredient_id']

                # Step 1: Try normalized prices only (price_per_standard_unit_cents)
                prices = self._get_normalized_prices(conn, ing_id, state)

                # Step 2: If no normalized prices, fall back to raw prices with same unit
                if not prices:
                    prices = self._get_raw_same_unit_prices(conn, ing_id, std_unit, state)

                if prices:
                    # Step 3: IQR filter to remove outliers
                    filtered = self._iqr_filter(prices)
                    if not filtered:
                        filtered = prices  # If IQR removes everything, keep originals

                    filtered.sort()
                    cnt = len(filtered)
                    median = filtered[cnt // 2] if cnt % 2 == 1 else round((filtered[cnt // 2 - 1] + filtered[cnt // 2]) / 2)
                    avg = round(sum(filtered) / cnt)

                    # Get freshest date
                    freshest = self._get_freshest(conn, ing_id, state)

                    results[name] = {
                        'ingredient_id': ing_id,
                        'canonical_name': ingredient['name'],
                        'category': ingredient['category'],
                        'avg_cents': avg,
                        'median_cents': median,
                        'min_cents': filtered[0],
                        'max_cents': filtered[-1],
                        'observation_count': cnt,
                        'freshest': freshest,
                        'unit': std_unit,
                        'normalized': True
                    }
                else:
                    results[name] = {
                        'ingredient_id': ing_id,
                        'canonical_name': ingredient['name'],
                        'category': ingredient['category'],
                        'avg_cents': None,
                        'median_cents': None,
                        'min_cents': None,
                        'max_cents': None,
                        'observation_count': 0,
                        'freshest': None,
                        'unit': std_unit,
                        'normalized': False
                    }

            elapsed_ms = (time.perf_counter() - start) * 1000
            self.send_json({
                'results': results,
                'query_ms': round(elapsed_ms, 2),
                'count': len(results)
            })
        finally:
            conn.close()

    def _get_normalized_prices(self, conn, ing_id, state):
        """Get all price_per_standard_unit_cents values (already normalized)."""
        if state:
            valid_sources = sources_for_state(state)
            if valid_sources:
                placeholders = ','.join('?' * len(valid_sources))
                rows = conn.execute(
                    'SELECT cp.price_per_standard_unit_cents '
                    'FROM current_prices cp '
                    'WHERE cp.canonical_ingredient_id = ? '
                    f'AND cp.source_id IN ({placeholders}) '
                    'AND cp.in_stock = 1 '
                    'AND cp.price_per_standard_unit_cents > 0',
                    (ing_id, *valid_sources)
                ).fetchall()
            else:
                return []
        else:
            rows = conn.execute(
                'SELECT cp.price_per_standard_unit_cents '
                'FROM current_prices cp '
                'WHERE cp.canonical_ingredient_id = ? '
                'AND cp.in_stock = 1 '
                'AND cp.price_per_standard_unit_cents > 0',
                (ing_id,)
            ).fetchall()
        return [r['price_per_standard_unit_cents'] for r in rows]

    def _get_raw_same_unit_prices(self, conn, ing_id, std_unit, state):
        """Fallback: get raw price_cents only from rows whose price_unit matches standard_unit."""
        if state:
            valid_sources = sources_for_state(state)
            if valid_sources:
                placeholders = ','.join('?' * len(valid_sources))
                rows = conn.execute(
                    'SELECT cp.price_cents '
                    'FROM current_prices cp '
                    'WHERE cp.canonical_ingredient_id = ? '
                    f'AND cp.source_id IN ({placeholders}) '
                    'AND cp.in_stock = 1 '
                    'AND cp.price_cents > 0 '
                    'AND LOWER(cp.price_unit) = LOWER(?)',
                    (ing_id, *valid_sources, std_unit)
                ).fetchall()
            else:
                return []
        else:
            rows = conn.execute(
                'SELECT cp.price_cents '
                'FROM current_prices cp '
                'WHERE cp.canonical_ingredient_id = ? '
                'AND cp.in_stock = 1 '
                'AND cp.price_cents > 0 '
                'AND LOWER(cp.price_unit) = LOWER(?)',
                (ing_id, std_unit)
            ).fetchall()
        return [r['price_cents'] for r in rows]

    def _get_freshest(self, conn, ing_id, state):
        """Get the most recent confirmation date for an ingredient."""
        if state:
            valid_sources = sources_for_state(state)
            if valid_sources:
                placeholders = ','.join('?' * len(valid_sources))
                row = conn.execute(
                    'SELECT MAX(cp.last_confirmed_at) as freshest '
                    'FROM current_prices cp '
                    'WHERE cp.canonical_ingredient_id = ? '
                    f'AND cp.source_id IN ({placeholders}) AND cp.in_stock = 1',
                    (ing_id, *valid_sources)
                ).fetchone()
                return row['freshest'] if row else None
        row = conn.execute(
            'SELECT MAX(cp.last_confirmed_at) as freshest '
            'FROM current_prices cp '
            'WHERE cp.canonical_ingredient_id = ? AND cp.in_stock = 1',
            (ing_id,)
        ).fetchone()
        return row['freshest'] if row else None

    @staticmethod
    def _iqr_filter(prices):
        """Remove outliers using 1.5x IQR method. Returns filtered list."""
        if len(prices) < 4:
            return prices  # Too few to filter meaningfully
        sorted_p = sorted(prices)
        n = len(sorted_p)
        q1 = sorted_p[n // 4]
        q3 = sorted_p[3 * n // 4]
        iqr = q3 - q1
        if iqr == 0:
            return prices  # All same value or very tight cluster
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        return [p for p in sorted_p if lower <= p <= upper]

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


    def handle_coverage(self, params):
        """State-level coverage stats: how many ingredients have prices in a state."""
        state = params.get('state', [None])[0]
        conn = get_db()
        try:
            start = time.perf_counter()

            if state:
                state = state.upper()
                valid_sources = sources_for_state(state)
                if not valid_sources:
                    self.send_json({
                        'state': state,
                        'error': 'No sources mapped to this state',
                        'sources': [],
                        'total_ingredients': 0,
                        'ingredients_with_price': 0,
                        'coverage_pct': 0,
                    })
                    return

                placeholders = ','.join('?' * len(valid_sources))

                # Total canonical ingredients
                total_row = conn.execute(
                    'SELECT COUNT(*) as cnt FROM canonical_ingredients'
                ).fetchone()
                total = total_row['cnt']

                # Ingredients with at least one in-stock price from this state's sources
                covered_row = conn.execute(
                    'SELECT COUNT(DISTINCT cp.canonical_ingredient_id) as cnt '
                    'FROM current_prices cp '
                    f'WHERE cp.source_id IN ({placeholders}) '
                    'AND cp.in_stock = 1 AND cp.price_cents > 0',
                    valid_sources
                ).fetchone()
                covered = covered_row['cnt']

                # Store count for this state
                store_row = conn.execute(
                    'SELECT COUNT(DISTINCT name) as cnt FROM store_locations WHERE state = ?',
                    (state,)
                ).fetchone()

                # Source breakdown
                source_rows = conn.execute(
                    'SELECT cp.source_id, COUNT(DISTINCT cp.canonical_ingredient_id) as ingredient_count, '
                    'COUNT(*) as price_count, MAX(cp.last_confirmed_at) as freshest '
                    'FROM current_prices cp '
                    f'WHERE cp.source_id IN ({placeholders}) AND cp.in_stock = 1 '
                    'GROUP BY cp.source_id ORDER BY ingredient_count DESC',
                    valid_sources
                ).fetchall()

                elapsed_ms = (time.perf_counter() - start) * 1000

                self.send_json({
                    'state': state,
                    'total_ingredients': total,
                    'ingredients_with_price': covered,
                    'coverage_pct': round(covered / max(total, 1) * 100, 1),
                    'store_count': store_row['cnt'],
                    'sources': [{
                        'source_id': s['source_id'],
                        'ingredients': s['ingredient_count'],
                        'prices': s['price_count'],
                        'freshest': s['freshest'],
                    } for s in source_rows],
                    'query_ms': round(elapsed_ms, 2),
                })
            else:
                # National summary: coverage by state
                total_row = conn.execute(
                    'SELECT COUNT(*) as cnt FROM canonical_ingredients'
                ).fetchone()
                total = total_row['cnt']

                # Per-state coverage using chain mapping
                states_data = []
                all_states = sorted(set(
                    s for states in _SOURCE_TO_STATES.values() for s in states
                ))
                for st in all_states:
                    valid = sources_for_state(st)
                    if not valid:
                        states_data.append({'state': st, 'coverage_pct': 0, 'sources': 0})
                        continue
                    placeholders = ','.join('?' * len(valid))
                    row = conn.execute(
                        'SELECT COUNT(DISTINCT cp.canonical_ingredient_id) as cnt '
                        'FROM current_prices cp '
                        f'WHERE cp.source_id IN ({placeholders}) '
                        'AND cp.in_stock = 1 AND cp.price_cents > 0',
                        valid
                    ).fetchone()
                    states_data.append({
                        'state': st,
                        'coverage_pct': round(row['cnt'] / max(total, 1) * 100, 1),
                        'sources': len(valid),
                    })

                elapsed_ms = (time.perf_counter() - start) * 1000

                # Overall stats
                total_prices_row = conn.execute(
                    'SELECT COUNT(*) as cnt FROM current_prices WHERE in_stock = 1'
                ).fetchone()
                total_stores_row = conn.execute(
                    'SELECT COUNT(DISTINCT name) as cnt FROM store_locations'
                ).fetchone()

                self.send_json({
                    'total_ingredients': total,
                    'total_prices': total_prices_row['cnt'],
                    'total_stores': total_stores_row['cnt'],
                    'states_covered': len(all_states),
                    'by_state': states_data,
                    'query_ms': round(elapsed_ms, 2),
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
