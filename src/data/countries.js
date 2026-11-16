// ISO-2 country code -> continent, plus display names via Intl.DisplayNames.
// Names come from the browser, so no table of 240 names is needed.

const CONTINENTS = {
  Africa:
    'DZ AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW EH YT RE SH',
  Asia:
    'AF AM AZ BH BD BT BN KH CN CY GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE IO CC CX',
  Europe:
    'AL AD AT BY BE BA BG HR CZ DK EE FO FI FR DE GI GR GG HU IS IE IM IT JE XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA',
  'North America':
    'AG BS BB BZ CA CR CU DM DO SV GD GT HT HN JM MX NI PA KN LC VC TT US AI AW BM BQ VG KY CW GL GP MQ MS PM PR BL MF SX TC VI',
  'South America': 'AR BO BR CL CO EC GY PY PE SR UY VE FK GF',
  Oceania:
    'AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU AS CK PF GU MP NC NU NF WF UM',
  Antarctica: 'AQ',
}

const CONTINENT_OF = {}
for (const [continent, codes] of Object.entries(CONTINENTS)) {
  for (const code of codes.split(' ')) CONTINENT_OF[code] = continent
}

export const CONTINENT_COUNT = 6 // excluding Antarctica
export const WORLD_COUNTRIES = 195

export function continentOf(code) {
  return CONTINENT_OF[code] || null
}

let displayNames = null
export function countryName(code) {
  try {
    displayNames ??= new Intl.DisplayNames(['en'], { type: 'region' })
    return displayNames.of(code) || code
  } catch {
    return code
  }
}
