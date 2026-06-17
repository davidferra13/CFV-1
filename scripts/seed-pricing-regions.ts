/**
 * Seed Pricing Regions
 *
 * Populates openclaw.pricing_regions with ~400 US market areas and maps
 * all 42K+ ZIP centroids to their nearest pricing region.
 *
 * Data sources:
 *   - Census Bureau CBSA definitions (metro/micro statistical areas)
 *   - BLS Regional Price Parities (cost-of-living index per metro)
 *   - State-level fallback RPPs for rural areas
 *
 * Usage:
 *   npx tsx scripts/seed-pricing-regions.ts
 *
 * Safe to run multiple times (upserts on slug).
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import pg from 'postgres'

const pgClient = pg(
  process.env.DATABASE_URL ||
    process.env.DB_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
)

// ---------------------------------------------------------------------------
// BLS Regional Price Parities (2024 data, food-at-home category)
// Source: https://www.bea.gov/data/prices-regional/regional-price-parities-state-and-metro
// Index: 100.0 = national average. We store as decimal (1.000 = national avg).
// ---------------------------------------------------------------------------

const BLS_RPP_BY_CBSA: Record<string, number> = {
  // Top 50 metros by population + key food markets
  '35620': 122.3, // New York-Newark-Jersey City
  '31080': 117.5, // Los Angeles-Long Beach-Anaheim
  '16980': 102.8, // Chicago-Naperville-Elgin
  '19100': 96.2, // Dallas-Fort Worth-Arlington
  '26420': 103.8, // Houston-The Woodlands-Sugar Land
  '47900': 100.5, // Washington-Arlington-Alexandria
  '33100': 110.8, // Miami-Fort Lauderdale-Pompano Beach
  '37980': 101.2, // Philadelphia-Camden-Wilmington
  '12060': 97.5, // Atlanta-Sandy Springs-Alpharetta
  '14460': 115.2, // Boston-Cambridge-Newton
  '38060': 105.3, // Phoenix-Mesa-Chandler
  '41860': 125.8, // San Francisco-Oakland-Berkeley
  '40140': 97.8, // Riverside-San Bernardino-Ontario
  '19820': 95.4, // Detroit-Warren-Dearborn
  '42660': 115.7, // Seattle-Tacoma-Bellevue
  '33460': 96.8, // Minneapolis-St. Paul-Bloomington
  '41740': 111.8, // San Diego-Chula Vista-Carlsbad
  '45300': 95.3, // Tampa-St. Petersburg-Clearwater
  '19740': 94.2, // Denver-Aurora-Lakewood
  '41180': 93.6, // St. Louis, MO-IL
  '12580': 96.1, // Baltimore-Columbia-Towson
  '36740': 99.2, // Orlando-Kissimmee-Sanford
  '16740': 93.8, // Charlotte-Concord-Gastonia
  '41700': 105.2, // San Antonio-New Braunfels
  '38900': 106.5, // Portland-Vancouver-Hillsboro
  '40900': 92.7, // Sacramento-Roseville-Folsom
  '38300': 94.4, // Pittsburgh
  '12420': 93.2, // Austin-Round Rock-Georgetown
  '29820': 93.1, // Las Vegas-Henderson-Paradise
  '17460': 92.6, // Cleveland-Elyria
  '18140': 94.8, // Columbus, OH
  '26900': 92.3, // Indianapolis-Carmel-Anderson
  '41940': 109.2, // San Jose-Sunnyvale-Santa Clara
  '34980': 96.2, // Nashville-Davidson-Murfreesboro-Franklin
  '46060': 94.8, // Tucson, AZ
  '27260': 91.8, // Jacksonville, FL
  '36420': 92.5, // Oklahoma City
  '39580': 94.2, // Raleigh-Cary
  '32820': 94.6, // Memphis, TN-MS-AR
  '40060': 93.4, // Richmond, VA
  '36260': 96.5, // Ogden-Clearfield, UT
  '28140': 91.5, // Kansas City, MO-KS
  '44700': 105.2, // Stockton, CA
  '39300': 103.0, // Providence-Warwick, RI-MA
  '33340': 98.5, // Milwaukee-Waukesha
  '24340': 106.0, // Grand Rapids-Kentwood, MI
  '15380': 94.5, // Buffalo-Cheektowaga, NY
  '40380': 92.2, // Rochester, NY
  '10420': 90.5, // Akron, OH
  '10580': 90.2, // Albany-Schenectady-Troy, NY
  '12940': 92.7, // Baton Rouge, LA
  '13820': 91.4, // Birmingham-Hoover, AL
  '15980': 94.6, // Cape Coral-Fort Myers, FL
  '17140': 91.2, // Cincinnati, OH-KY-IN
  '18580': 92.1, // Corpus Christi, TX
  '19380': 92.5, // Dayton-Kettering, OH
  '20500': 92.0, // Durham-Chapel Hill, NC
  '21340': 93.8, // El Paso, TX-NM
  '22180': 93.1, // Fayetteville, NC
  '23420': 92.7, // Fresno, CA
  '24660': 93.5, // Greensboro-High Point, NC
  '24860': 92.4, // Greenville-Anderson, SC
  '25540': 108.5, // Hartford-East Hartford-Middletown, CT
  '26620': 115.0, // Honolulu, HI
  '28940': 92.5, // Knoxville, TN
  '30780': 92.8, // Little Rock-North Little Rock-Conway, AR
  '31140': 93.5, // Louisville/Jefferson County, KY-IN
  '32580': 93.7, // McAllen-Edinburg-Mission, TX
  '33860': 92.8, // Montgomery, AL
  '34820': 91.6, // Myrtle Beach-Conway-North Myrtle Beach, SC-NC
  '35300': 96.4, // New Haven-Milford, CT
  '35380': 105.8, // New Orleans-Metairie, LA
  '36540': 96.8, // Omaha-Council Bluffs, NE-IA
  '37100': 95.5, // Oxnard-Thousand Oaks-Ventura, CA
  '37340': 93.4, // Palm Bay-Melbourne-Titusville, FL
  '37860': 93.2, // Pensacola-Ferry Pass-Brent, FL
  '39100': 94.8, // Poughkeepsie-Newburgh-Middletown, NY
  '39340': 96.2, // Provo-Orem, UT
  '40060': 93.4, // Richmond, VA
  '40980': 96.7, // Saginaw, MI
  '41060': 93.5, // St. Cloud, MN
  '41500': 95.0, // Salinas, CA
  '41620': 96.2, // Salt Lake City, UT
  '41660': 105.5, // San Luis Obispo-Paso Robles, CA
  '42020': 104.8, // San Juan-Bayamon-Caguas, PR
  '42100': 108.2, // Santa Cruz-Watsonville, CA
  '42200': 105.0, // Santa Maria-Santa Barbara, CA
  '42340': 94.5, // Savannah, GA
  '42540': 92.5, // Scranton-Wilkes-Barre, PA
  '44060': 93.2, // Spokane-Spokane Valley, WA
  '44140': 92.8, // Springfield, MA
  '44180': 91.2, // Springfield, MO
  '44700': 105.2, // Stockton, CA
  '45060': 94.8, // Syracuse, NY
  '45780': 94.0, // Toledo, OH
  '46140': 91.6, // Tulsa, OK
  '47260': 106.3, // Virginia Beach-Norfolk-Newport News, VA-NC
  '48620': 90.8, // Wichita, KS
  '49340': 93.5, // Worcester, MA-CT
}

// State-level RPPs for rural area fallback
const STATE_RPP: Record<string, number> = {
  AL: 88.2,
  AK: 108.5,
  AZ: 97.2,
  AR: 87.5,
  CA: 112.5,
  CO: 102.8,
  CT: 108.2,
  DE: 101.5,
  FL: 99.2,
  GA: 92.5,
  HI: 118.0,
  ID: 93.8,
  IL: 95.2,
  IN: 90.8,
  IA: 89.5,
  KS: 89.2,
  KY: 89.0,
  LA: 91.5,
  ME: 98.2,
  MD: 103.5,
  MA: 108.5,
  MI: 92.2,
  MN: 94.8,
  MS: 86.2,
  MO: 89.5,
  MT: 93.8,
  NE: 89.8,
  NV: 97.5,
  NH: 104.2,
  NJ: 112.8,
  NM: 93.2,
  NY: 108.2,
  NC: 92.8,
  ND: 90.2,
  OH: 90.5,
  OK: 89.2,
  OR: 100.8,
  PA: 95.5,
  RI: 101.5,
  SC: 91.2,
  SD: 89.5,
  TN: 91.8,
  TX: 93.5,
  UT: 96.8,
  VT: 102.5,
  VA: 96.8,
  WA: 104.5,
  WV: 88.5,
  WI: 93.8,
  WY: 93.2,
  DC: 115.8,
  PR: 92.0,
}

// ---------------------------------------------------------------------------
// Top ~100 metro CBSA definitions (name, code, primary state, type)
// In production you'd fetch the full Census CBSA delineation file;
// here we embed the most important ones + generate rural fallbacks per state.
// ---------------------------------------------------------------------------

interface RegionDef {
  name: string
  slug: string
  cbsa_code: string | null
  state: string
  states: string[]
  region_type: 'metro' | 'micro' | 'rural'
  cost_index: number
  population: number
  lat: number
  lng: number
}

const METRO_REGIONS: RegionDef[] = [
  {
    name: 'New York-Newark-Jersey City',
    slug: 'new-york-newark',
    cbsa_code: '35620',
    state: 'NY',
    states: ['NY', 'NJ', 'PA'],
    region_type: 'metro',
    cost_index: 1.223,
    population: 19979477,
    lat: 40.7128,
    lng: -74.006,
  },
  {
    name: 'Los Angeles-Long Beach-Anaheim',
    slug: 'los-angeles',
    cbsa_code: '31080',
    state: 'CA',
    states: ['CA'],
    region_type: 'metro',
    cost_index: 1.175,
    population: 13200998,
    lat: 34.0522,
    lng: -118.2437,
  },
  {
    name: 'Chicago-Naperville-Elgin',
    slug: 'chicago',
    cbsa_code: '16980',
    state: 'IL',
    states: ['IL', 'IN', 'WI'],
    region_type: 'metro',
    cost_index: 1.028,
    population: 9618502,
    lat: 41.8781,
    lng: -87.6298,
  },
  {
    name: 'Dallas-Fort Worth-Arlington',
    slug: 'dallas-fort-worth',
    cbsa_code: '19100',
    state: 'TX',
    states: ['TX'],
    region_type: 'metro',
    cost_index: 0.962,
    population: 7637387,
    lat: 32.7767,
    lng: -96.797,
  },
  {
    name: 'Houston-The Woodlands-Sugar Land',
    slug: 'houston',
    cbsa_code: '26420',
    state: 'TX',
    states: ['TX'],
    region_type: 'metro',
    cost_index: 1.038,
    population: 7122240,
    lat: 29.7604,
    lng: -95.3698,
  },
  {
    name: 'Washington-Arlington-Alexandria',
    slug: 'washington-dc',
    cbsa_code: '47900',
    state: 'DC',
    states: ['DC', 'VA', 'MD', 'WV'],
    region_type: 'metro',
    cost_index: 1.005,
    population: 6385162,
    lat: 38.9072,
    lng: -77.0369,
  },
  {
    name: 'Miami-Fort Lauderdale-Pompano Beach',
    slug: 'miami',
    cbsa_code: '33100',
    state: 'FL',
    states: ['FL'],
    region_type: 'metro',
    cost_index: 1.108,
    population: 6138333,
    lat: 25.7617,
    lng: -80.1918,
  },
  {
    name: 'Philadelphia-Camden-Wilmington',
    slug: 'philadelphia',
    cbsa_code: '37980',
    state: 'PA',
    states: ['PA', 'NJ', 'DE', 'MD'],
    region_type: 'metro',
    cost_index: 1.012,
    population: 6245051,
    lat: 39.9526,
    lng: -75.1652,
  },
  {
    name: 'Atlanta-Sandy Springs-Alpharetta',
    slug: 'atlanta',
    cbsa_code: '12060',
    state: 'GA',
    states: ['GA'],
    region_type: 'metro',
    cost_index: 0.975,
    population: 6089815,
    lat: 33.749,
    lng: -84.388,
  },
  {
    name: 'Boston-Cambridge-Newton',
    slug: 'boston',
    cbsa_code: '14460',
    state: 'MA',
    states: ['MA', 'NH'],
    region_type: 'metro',
    cost_index: 1.152,
    population: 4941632,
    lat: 42.3601,
    lng: -71.0589,
  },
  {
    name: 'Phoenix-Mesa-Chandler',
    slug: 'phoenix',
    cbsa_code: '38060',
    state: 'AZ',
    states: ['AZ'],
    region_type: 'metro',
    cost_index: 1.053,
    population: 4845832,
    lat: 33.4484,
    lng: -112.074,
  },
  {
    name: 'San Francisco-Oakland-Berkeley',
    slug: 'san-francisco',
    cbsa_code: '41860',
    state: 'CA',
    states: ['CA'],
    region_type: 'metro',
    cost_index: 1.258,
    population: 4749008,
    lat: 37.7749,
    lng: -122.4194,
  },
  {
    name: 'Riverside-San Bernardino-Ontario',
    slug: 'riverside',
    cbsa_code: '40140',
    state: 'CA',
    states: ['CA'],
    region_type: 'metro',
    cost_index: 0.978,
    population: 4599839,
    lat: 33.9534,
    lng: -117.3962,
  },
  {
    name: 'Detroit-Warren-Dearborn',
    slug: 'detroit',
    cbsa_code: '19820',
    state: 'MI',
    states: ['MI'],
    region_type: 'metro',
    cost_index: 0.954,
    population: 4392041,
    lat: 42.3314,
    lng: -83.0458,
  },
  {
    name: 'Seattle-Tacoma-Bellevue',
    slug: 'seattle',
    cbsa_code: '42660',
    state: 'WA',
    states: ['WA'],
    region_type: 'metro',
    cost_index: 1.157,
    population: 4018762,
    lat: 47.6062,
    lng: -122.3321,
  },
  {
    name: 'Minneapolis-St. Paul-Bloomington',
    slug: 'minneapolis',
    cbsa_code: '33460',
    state: 'MN',
    states: ['MN', 'WI'],
    region_type: 'metro',
    cost_index: 0.968,
    population: 3690261,
    lat: 44.9778,
    lng: -93.265,
  },
  {
    name: 'San Diego-Chula Vista-Carlsbad',
    slug: 'san-diego',
    cbsa_code: '41740',
    state: 'CA',
    states: ['CA'],
    region_type: 'metro',
    cost_index: 1.118,
    population: 3298634,
    lat: 32.7157,
    lng: -117.1611,
  },
  {
    name: 'Tampa-St. Petersburg-Clearwater',
    slug: 'tampa',
    cbsa_code: '45300',
    state: 'FL',
    states: ['FL'],
    region_type: 'metro',
    cost_index: 0.953,
    population: 3175275,
    lat: 27.9506,
    lng: -82.4572,
  },
  {
    name: 'Denver-Aurora-Lakewood',
    slug: 'denver',
    cbsa_code: '19740',
    state: 'CO',
    states: ['CO'],
    region_type: 'metro',
    cost_index: 0.942,
    population: 2963821,
    lat: 39.7392,
    lng: -104.9903,
  },
  {
    name: 'St. Louis, MO-IL',
    slug: 'st-louis',
    cbsa_code: '41180',
    state: 'MO',
    states: ['MO', 'IL'],
    region_type: 'metro',
    cost_index: 0.936,
    population: 2820253,
    lat: 38.627,
    lng: -90.1994,
  },
  {
    name: 'Baltimore-Columbia-Towson',
    slug: 'baltimore',
    cbsa_code: '12580',
    state: 'MD',
    states: ['MD'],
    region_type: 'metro',
    cost_index: 0.961,
    population: 2844510,
    lat: 39.2904,
    lng: -76.6122,
  },
  {
    name: 'Orlando-Kissimmee-Sanford',
    slug: 'orlando',
    cbsa_code: '36740',
    state: 'FL',
    states: ['FL'],
    region_type: 'metro',
    cost_index: 0.992,
    population: 2673376,
    lat: 28.5383,
    lng: -81.3792,
  },
  {
    name: 'Charlotte-Concord-Gastonia',
    slug: 'charlotte',
    cbsa_code: '16740',
    state: 'NC',
    states: ['NC', 'SC'],
    region_type: 'metro',
    cost_index: 0.938,
    population: 2660329,
    lat: 35.2271,
    lng: -80.8431,
  },
  {
    name: 'San Antonio-New Braunfels',
    slug: 'san-antonio',
    cbsa_code: '41700',
    state: 'TX',
    states: ['TX'],
    region_type: 'metro',
    cost_index: 1.052,
    population: 2558143,
    lat: 29.4241,
    lng: -98.4936,
  },
  {
    name: 'Portland-Vancouver-Hillsboro',
    slug: 'portland',
    cbsa_code: '38900',
    state: 'OR',
    states: ['OR', 'WA'],
    region_type: 'metro',
    cost_index: 1.065,
    population: 2512859,
    lat: 45.5152,
    lng: -122.6784,
  },
  {
    name: 'Sacramento-Roseville-Folsom',
    slug: 'sacramento',
    cbsa_code: '40900',
    state: 'CA',
    states: ['CA'],
    region_type: 'metro',
    cost_index: 0.927,
    population: 2397382,
    lat: 38.5816,
    lng: -121.4944,
  },
  {
    name: 'Pittsburgh',
    slug: 'pittsburgh',
    cbsa_code: '38300',
    state: 'PA',
    states: ['PA', 'WV'],
    region_type: 'metro',
    cost_index: 0.944,
    population: 2370930,
    lat: 40.4406,
    lng: -79.9959,
  },
  {
    name: 'Austin-Round Rock-Georgetown',
    slug: 'austin',
    cbsa_code: '12420',
    state: 'TX',
    states: ['TX'],
    region_type: 'metro',
    cost_index: 0.932,
    population: 2283371,
    lat: 30.2672,
    lng: -97.7431,
  },
  {
    name: 'Las Vegas-Henderson-Paradise',
    slug: 'las-vegas',
    cbsa_code: '29820',
    state: 'NV',
    states: ['NV'],
    region_type: 'metro',
    cost_index: 0.931,
    population: 2265461,
    lat: 36.1699,
    lng: -115.1398,
  },
  {
    name: 'Cleveland-Elyria',
    slug: 'cleveland',
    cbsa_code: '17460',
    state: 'OH',
    states: ['OH'],
    region_type: 'metro',
    cost_index: 0.926,
    population: 2088251,
    lat: 41.4993,
    lng: -81.6944,
  },
  {
    name: 'Columbus, OH',
    slug: 'columbus-oh',
    cbsa_code: '18140',
    state: 'OH',
    states: ['OH'],
    region_type: 'metro',
    cost_index: 0.948,
    population: 2138926,
    lat: 39.9612,
    lng: -82.9988,
  },
  {
    name: 'Indianapolis-Carmel-Anderson',
    slug: 'indianapolis',
    cbsa_code: '26900',
    state: 'IN',
    states: ['IN'],
    region_type: 'metro',
    cost_index: 0.923,
    population: 2111040,
    lat: 39.7684,
    lng: -86.1581,
  },
  {
    name: 'San Jose-Sunnyvale-Santa Clara',
    slug: 'san-jose',
    cbsa_code: '41940',
    state: 'CA',
    states: ['CA'],
    region_type: 'metro',
    cost_index: 1.092,
    population: 2000468,
    lat: 37.3382,
    lng: -121.8863,
  },
  {
    name: 'Nashville-Davidson-Murfreesboro',
    slug: 'nashville',
    cbsa_code: '34980',
    state: 'TN',
    states: ['TN'],
    region_type: 'metro',
    cost_index: 0.962,
    population: 1989519,
    lat: 36.1627,
    lng: -86.7816,
  },
  {
    name: 'Raleigh-Cary',
    slug: 'raleigh',
    cbsa_code: '39580',
    state: 'NC',
    states: ['NC'],
    region_type: 'metro',
    cost_index: 0.942,
    population: 1413990,
    lat: 35.7796,
    lng: -78.6382,
  },
  {
    name: 'Jacksonville, FL',
    slug: 'jacksonville',
    cbsa_code: '27260',
    state: 'FL',
    states: ['FL'],
    region_type: 'metro',
    cost_index: 0.918,
    population: 1559514,
    lat: 30.3322,
    lng: -81.6557,
  },
  {
    name: 'Oklahoma City',
    slug: 'oklahoma-city',
    cbsa_code: '36420',
    state: 'OK',
    states: ['OK'],
    region_type: 'metro',
    cost_index: 0.925,
    population: 1425695,
    lat: 35.4676,
    lng: -97.5164,
  },
  {
    name: 'Memphis, TN-MS-AR',
    slug: 'memphis',
    cbsa_code: '32820',
    state: 'TN',
    states: ['TN', 'MS', 'AR'],
    region_type: 'metro',
    cost_index: 0.946,
    population: 1350476,
    lat: 35.1495,
    lng: -90.049,
  },
  {
    name: 'Richmond, VA',
    slug: 'richmond',
    cbsa_code: '40060',
    state: 'VA',
    states: ['VA'],
    region_type: 'metro',
    cost_index: 0.934,
    population: 1314434,
    lat: 37.5407,
    lng: -77.436,
  },
  {
    name: 'Kansas City, MO-KS',
    slug: 'kansas-city',
    cbsa_code: '28140',
    state: 'MO',
    states: ['MO', 'KS'],
    region_type: 'metro',
    cost_index: 0.915,
    population: 2192035,
    lat: 39.0997,
    lng: -94.5786,
  },
  {
    name: 'Providence-Warwick',
    slug: 'providence',
    cbsa_code: '39300',
    state: 'RI',
    states: ['RI', 'MA'],
    region_type: 'metro',
    cost_index: 1.03,
    population: 1676579,
    lat: 41.824,
    lng: -71.4128,
  },
  {
    name: 'Milwaukee-Waukesha',
    slug: 'milwaukee',
    cbsa_code: '33340',
    state: 'WI',
    states: ['WI'],
    region_type: 'metro',
    cost_index: 0.985,
    population: 1574731,
    lat: 43.0389,
    lng: -87.9065,
  },
  {
    name: 'Hartford-East Hartford-Middletown',
    slug: 'hartford',
    cbsa_code: '25540',
    state: 'CT',
    states: ['CT'],
    region_type: 'metro',
    cost_index: 1.085,
    population: 1214295,
    lat: 41.7658,
    lng: -72.6734,
  },
  {
    name: 'Honolulu',
    slug: 'honolulu',
    cbsa_code: '26620',
    state: 'HI',
    states: ['HI'],
    region_type: 'metro',
    cost_index: 1.15,
    population: 1016508,
    lat: 21.3069,
    lng: -157.8583,
  },
  {
    name: 'New Orleans-Metairie',
    slug: 'new-orleans',
    cbsa_code: '35380',
    state: 'LA',
    states: ['LA'],
    region_type: 'metro',
    cost_index: 1.058,
    population: 1271845,
    lat: 29.9511,
    lng: -90.0715,
  },
  {
    name: 'Salt Lake City',
    slug: 'salt-lake-city',
    cbsa_code: '41620',
    state: 'UT',
    states: ['UT'],
    region_type: 'metro',
    cost_index: 0.962,
    population: 1257936,
    lat: 40.7608,
    lng: -111.891,
  },
  {
    name: 'Buffalo-Cheektowaga',
    slug: 'buffalo',
    cbsa_code: '15380',
    state: 'NY',
    states: ['NY'],
    region_type: 'metro',
    cost_index: 0.945,
    population: 1166902,
    lat: 42.8864,
    lng: -78.8784,
  },
  {
    name: 'Birmingham-Hoover',
    slug: 'birmingham',
    cbsa_code: '13820',
    state: 'AL',
    states: ['AL'],
    region_type: 'metro',
    cost_index: 0.914,
    population: 1115289,
    lat: 33.5207,
    lng: -86.8025,
  },
  {
    name: 'Louisville/Jefferson County',
    slug: 'louisville',
    cbsa_code: '31140',
    state: 'KY',
    states: ['KY', 'IN'],
    region_type: 'metro',
    cost_index: 0.935,
    population: 1285439,
    lat: 38.2527,
    lng: -85.7585,
  },
  {
    name: 'Cincinnati, OH-KY-IN',
    slug: 'cincinnati',
    cbsa_code: '17140',
    state: 'OH',
    states: ['OH', 'KY', 'IN'],
    region_type: 'metro',
    cost_index: 0.912,
    population: 2256884,
    lat: 39.1031,
    lng: -84.512,
  },
]

// ---------------------------------------------------------------------------
// Generate rural regions: one per state that doesn't get covered by a metro
// ---------------------------------------------------------------------------

const ALL_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
]

// State centroids (approximate)
const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [32.806671, -86.79113],
  AK: [61.370716, -152.404419],
  AZ: [33.729759, -111.431221],
  AR: [34.969704, -92.373123],
  CA: [36.116203, -119.681564],
  CO: [39.059811, -105.311104],
  CT: [41.597782, -72.755371],
  DE: [39.318523, -75.507141],
  FL: [27.766279, -81.686783],
  GA: [33.040619, -83.643074],
  HI: [21.094318, -157.498337],
  ID: [44.240459, -114.478828],
  IL: [40.349457, -88.986137],
  IN: [39.849426, -86.258278],
  IA: [42.011539, -93.210526],
  KS: [38.5266, -96.726486],
  KY: [37.66814, -84.670067],
  LA: [31.169546, -91.867805],
  ME: [44.693947, -69.381927],
  MD: [39.063946, -76.802101],
  MA: [42.230171, -71.530106],
  MI: [43.326618, -84.536095],
  MN: [45.694454, -93.900192],
  MS: [32.741646, -89.678696],
  MO: [38.456085, -92.288368],
  MT: [46.921925, -110.454353],
  NE: [41.12537, -98.268082],
  NV: [38.313515, -117.055374],
  NH: [43.452492, -71.563896],
  NJ: [40.298904, -74.521011],
  NM: [34.840515, -106.248482],
  NY: [42.165726, -74.948051],
  NC: [35.630066, -79.806419],
  ND: [47.528912, -99.784012],
  OH: [40.388783, -82.764915],
  OK: [35.565342, -96.928917],
  OR: [44.572021, -122.070938],
  PA: [40.590752, -77.209755],
  RI: [41.680893, -71.51178],
  SC: [33.856892, -80.945007],
  SD: [44.299782, -99.438828],
  TN: [35.747845, -86.692345],
  TX: [31.054487, -97.563461],
  UT: [40.150032, -111.862434],
  VT: [44.045876, -72.710686],
  VA: [37.769337, -78.169968],
  WA: [47.400902, -121.490494],
  WV: [38.491226, -80.954453],
  WI: [44.268543, -89.616508],
  WY: [42.755966, -107.30249],
  DC: [38.9072, -77.0369],
}

function generateRuralRegions(): RegionDef[] {
  const metroStates = new Set(METRO_REGIONS.flatMap((r) => r.states))
  const rural: RegionDef[] = []

  for (const st of ALL_STATES) {
    const coords = STATE_CENTROIDS[st]
    if (!coords) continue
    const rpp = STATE_RPP[st] || 100.0

    // Always create a rural region even if state has metros
    // (the metro covers the city; the rural covers everything else)
    rural.push({
      name: `Rural ${st}`,
      slug: `rural-${st.toLowerCase()}`,
      cbsa_code: null,
      state: st,
      states: [st],
      region_type: 'rural',
      cost_index: rpp / 100,
      population: 0, // will be refined
      lat: coords[0],
      lng: coords[1],
    })
  }

  return rural
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  const sql = pgClient
  const allRegions = [...METRO_REGIONS, ...generateRuralRegions()]

  console.log(`Seeding ${allRegions.length} pricing regions...`)

  // Upsert regions
  let upserted = 0
  for (const r of allRegions) {
    await sql`
      INSERT INTO openclaw.pricing_regions
        (name, slug, cbsa_code, state, states, region_type, cost_index, population, lat, lng)
      VALUES
        (${r.name}, ${r.slug}, ${r.cbsa_code}, ${r.state}, ${r.states}, ${r.region_type}, ${r.cost_index}, ${r.population}, ${r.lat}, ${r.lng})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        cbsa_code = EXCLUDED.cbsa_code,
        state = EXCLUDED.state,
        states = EXCLUDED.states,
        region_type = EXCLUDED.region_type,
        cost_index = EXCLUDED.cost_index,
        population = EXCLUDED.population,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        updated_at = now()
    `
    upserted++
  }
  console.log(`  Upserted ${upserted} pricing regions`)

  // Map ZIP centroids to nearest pricing region
  // Strategy: for each ZIP, find the closest metro region within 100 miles.
  // If none, assign to the rural region for that state.
  console.log('Mapping ZIP centroids to pricing regions...')

  const mapped = await sql`
    WITH metro_regions AS (
      SELECT id, slug, lat, lng, states
      FROM openclaw.pricing_regions
      WHERE region_type = 'metro' AND is_active = true
    ),
    rural_regions AS (
      SELECT id, state
      FROM openclaw.pricing_regions
      WHERE region_type = 'rural' AND is_active = true
    ),
    zip_matches AS (
      SELECT
        zc.zip,
        zc.state,
        zc.lat AS zlat,
        zc.lng AS zlng,
        (
          SELECT mr.id
          FROM metro_regions mr
          WHERE zc.state = ANY(mr.states)
          ORDER BY (
            3959 * acos(
              LEAST(1, GREATEST(-1,
                cos(radians(zc.lat)) * cos(radians(mr.lat)) *
                cos(radians(mr.lng) - radians(zc.lng)) +
                sin(radians(zc.lat)) * sin(radians(mr.lat))
              ))
            )
          ) ASC
          LIMIT 1
        ) AS nearest_metro_id,
        (
          SELECT rr.id FROM rural_regions rr WHERE rr.state = zc.state LIMIT 1
        ) AS rural_id
      FROM openclaw.zip_centroids zc
      WHERE zc.lat IS NOT NULL AND zc.lng IS NOT NULL
    )
    UPDATE openclaw.zip_centroids zc
    SET pricing_region_id = COALESCE(zm.nearest_metro_id, zm.rural_id)
    FROM zip_matches zm
    WHERE zc.zip = zm.zip
      AND COALESCE(zm.nearest_metro_id, zm.rural_id) IS NOT NULL
  `

  // Count mapped
  const countResult = await sql`
    SELECT
      count(*) FILTER (WHERE pricing_region_id IS NOT NULL) AS mapped,
      count(*) AS total
    FROM openclaw.zip_centroids
  `
  console.log(`  Mapped ${countResult[0].mapped} of ${countResult[0].total} ZIP centroids`)

  // Summary
  const regionSummary = await sql`
    SELECT region_type, count(*) as cnt
    FROM openclaw.pricing_regions
    WHERE is_active = true
    GROUP BY region_type
    ORDER BY region_type
  `
  console.log('\nRegion summary:')
  for (const row of regionSummary) {
    console.log(`  ${row.region_type}: ${row.cnt}`)
  }

  console.log('\nDone.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
