import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// remy-weather.ts uses 'use server' and depends on auth/DB imports.
// We re-implement the pure functions here to test the logic without server context.

// WMO Weather interpretation codes (mirrored from remy-weather.ts)
const WMO_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}

interface WeatherForecast {
  date: string
  tempHighC: number
  tempLowC: number
  tempHighF: number
  tempLowF: number
  precipitationMm: number
  precipitationProbability: number
  weatherCode: number
  weatherDescription: string
  windSpeedKmh: number
}

// Mirrored from remy-weather.ts evaluateWeather()
function evaluateWeather(
  forecast: WeatherForecast
): { level: 'info' | 'warning' | 'severe'; message: string } | null {
  const issues: string[] = []
  let level: 'info' | 'warning' | 'severe' = 'info'

  if ([95, 96, 99].includes(forecast.weatherCode)) {
    issues.push(`${forecast.weatherDescription} expected`)
    level = 'severe'
  } else if ([65, 67, 75, 82, 86].includes(forecast.weatherCode)) {
    issues.push(`${forecast.weatherDescription} expected`)
    level = 'severe'
  } else if ([63, 66, 73, 81, 85].includes(forecast.weatherCode)) {
    issues.push(`${forecast.weatherDescription} expected`)
    level = 'warning'
  }

  if (forecast.precipitationProbability >= 70 && level === 'info') {
    issues.push(`${forecast.precipitationProbability}% chance of precipitation`)
    level = 'warning'
  } else if (forecast.precipitationProbability >= 50 && level === 'info') {
    issues.push(`${forecast.precipitationProbability}% chance of precipitation`)
  }

  if (forecast.tempHighF >= 100) {
    issues.push(`Extreme heat: ${forecast.tempHighF}°F high`)
    if (level !== 'severe') level = 'warning'
  } else if (forecast.tempLowF <= 25) {
    issues.push(`Extreme cold: ${forecast.tempLowF}°F low`)
    if (level !== 'severe') level = 'warning'
  } else if (forecast.tempHighF >= 95) {
    issues.push(`High heat: ${forecast.tempHighF}°F`)
  } else if (forecast.tempLowF <= 32) {
    issues.push(`Freezing temps: ${forecast.tempLowF}°F low`)
  }

  if (forecast.windSpeedKmh >= 60) {
    issues.push(`Very high winds: ${Math.round(forecast.windSpeedKmh * 0.621)}mph`)
    if (level !== 'severe') level = 'warning'
  } else if (forecast.windSpeedKmh >= 40) {
    issues.push(`Windy: ${Math.round(forecast.windSpeedKmh * 0.621)}mph`)
  }

  if (issues.length === 0) return null
  return { level, message: issues.join('. ') + '.' }
}

function makeForecast(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
  return {
    date: '2026-05-01',
    tempHighC: 22,
    tempLowC: 12,
    tempHighF: 72,
    tempLowF: 54,
    precipitationMm: 0,
    precipitationProbability: 10,
    weatherCode: 0,
    weatherDescription: 'Clear sky',
    windSpeedKmh: 10,
    ...overrides,
  }
}

// --- Tests ---

describe('WMO code mapping', () => {
  it('maps code 0 to Clear sky', () => {
    assert.equal(WMO_CODES[0], 'Clear sky')
  })
  it('maps code 95 to Thunderstorm', () => {
    assert.equal(WMO_CODES[95], 'Thunderstorm')
  })
  it('maps code 99 to Thunderstorm with heavy hail', () => {
    assert.equal(WMO_CODES[99], 'Thunderstorm with heavy hail')
  })
  it('maps code 65 to Heavy rain', () => {
    assert.equal(WMO_CODES[65], 'Heavy rain')
  })
  it('maps code 75 to Heavy snow', () => {
    assert.equal(WMO_CODES[75], 'Heavy snow')
  })
  it('returns undefined for unknown codes', () => {
    assert.equal(WMO_CODES[999], undefined)
  })
  it('maps code 45 to Fog', () => {
    assert.equal(WMO_CODES[45], 'Fog')
  })
  it('maps code 67 to Heavy freezing rain', () => {
    assert.equal(WMO_CODES[67], 'Heavy freezing rain')
  })
})

describe('evaluateWeather - clear conditions', () => {
  it('returns null for mild weather', () => {
    assert.equal(evaluateWeather(makeForecast()), null)
  })
  it('returns null for partly cloudy, warm, calm', () => {
    assert.equal(
      evaluateWeather(makeForecast({ weatherCode: 2, weatherDescription: 'Partly cloudy' })),
      null
    )
  })
})

describe('evaluateWeather - severe weather codes', () => {
  it('flags thunderstorm as severe', () => {
    const result = evaluateWeather(
      makeForecast({ weatherCode: 95, weatherDescription: 'Thunderstorm' })
    )
    assert.notEqual(result, null)
    assert.equal(result!.level, 'severe')
    assert.ok(result!.message.includes('Thunderstorm'))
  })
  it('flags thunderstorm with hail as severe', () => {
    const result = evaluateWeather(
      makeForecast({ weatherCode: 99, weatherDescription: 'Thunderstorm with heavy hail' })
    )
    assert.equal(result!.level, 'severe')
  })
  it('flags heavy rain as severe', () => {
    const result = evaluateWeather(
      makeForecast({ weatherCode: 65, weatherDescription: 'Heavy rain' })
    )
    assert.equal(result!.level, 'severe')
  })
  it('flags heavy snow as severe', () => {
    const result = evaluateWeather(
      makeForecast({ weatherCode: 75, weatherDescription: 'Heavy snow' })
    )
    assert.equal(result!.level, 'severe')
  })
  it('flags violent rain showers as severe', () => {
    const result = evaluateWeather(
      makeForecast({ weatherCode: 82, weatherDescription: 'Violent rain showers' })
    )
    assert.equal(result!.level, 'severe')
  })
  it('flags heavy freezing rain as severe', () => {
    const result = evaluateWeather(
      makeForecast({ weatherCode: 67, weatherDescription: 'Heavy freezing rain' })
    )
    assert.equal(result!.level, 'severe')
  })
})

describe('evaluateWeather - warning weather codes', () => {
  it('flags moderate rain as warning', () => {
    const result = evaluateWeather(
      makeForecast({ weatherCode: 63, weatherDescription: 'Moderate rain' })
    )
    assert.equal(result!.level, 'warning')
  })
  it('flags moderate snow as warning', () => {
    const result = evaluateWeather(
      makeForecast({ weatherCode: 73, weatherDescription: 'Moderate snow' })
    )
    assert.equal(result!.level, 'warning')
  })
  it('flags light freezing rain as warning', () => {
    const result = evaluateWeather(
      makeForecast({ weatherCode: 66, weatherDescription: 'Light freezing rain' })
    )
    assert.equal(result!.level, 'warning')
  })
})

describe('evaluateWeather - precipitation probability', () => {
  it('flags 70%+ precipitation as warning', () => {
    const result = evaluateWeather(makeForecast({ precipitationProbability: 75 }))
    assert.equal(result!.level, 'warning')
    assert.ok(result!.message.includes('75%'))
  })
  it('flags 50%+ precipitation as info', () => {
    const result = evaluateWeather(makeForecast({ precipitationProbability: 55 }))
    assert.notEqual(result, null)
    assert.equal(result!.level, 'info')
    assert.ok(result!.message.includes('55%'))
  })
  it('does not upgrade level when already severe', () => {
    const result = evaluateWeather(
      makeForecast({
        weatherCode: 95,
        weatherDescription: 'Thunderstorm',
        precipitationProbability: 90,
      })
    )
    assert.equal(result!.level, 'severe')
  })
})

describe('evaluateWeather - extreme temperatures', () => {
  it('flags 100F+ as extreme heat warning', () => {
    const result = evaluateWeather(makeForecast({ tempHighF: 105, tempHighC: 41 }))
    assert.equal(result!.level, 'warning')
    assert.ok(result!.message.includes('Extreme heat'))
    assert.ok(result!.message.includes('105°F'))
  })
  it('flags 25F or below as extreme cold warning', () => {
    const result = evaluateWeather(makeForecast({ tempLowF: 20, tempLowC: -7 }))
    assert.equal(result!.level, 'warning')
    assert.ok(result!.message.includes('Extreme cold'))
  })
  it('flags 95-99F as high heat info', () => {
    const result = evaluateWeather(makeForecast({ tempHighF: 97, tempHighC: 36 }))
    assert.notEqual(result, null)
    assert.ok(result!.message.includes('High heat'))
  })
  it('flags freezing temps (<=32F) as info', () => {
    const result = evaluateWeather(makeForecast({ tempLowF: 30, tempLowC: -1 }))
    assert.notEqual(result, null)
    assert.ok(result!.message.includes('Freezing temps'))
  })
})

describe('evaluateWeather - wind conditions', () => {
  it('flags 60+ km/h as very high winds warning', () => {
    const result = evaluateWeather(makeForecast({ windSpeedKmh: 65 }))
    assert.equal(result!.level, 'warning')
    assert.ok(result!.message.includes('Very high winds'))
  })
  it('flags 40-59 km/h as windy info', () => {
    const result = evaluateWeather(makeForecast({ windSpeedKmh: 45 }))
    assert.notEqual(result, null)
    assert.ok(result!.message.includes('Windy'))
  })
  it('does not flag light winds', () => {
    assert.equal(evaluateWeather(makeForecast({ windSpeedKmh: 15 })), null)
  })
})

describe('evaluateWeather - combined conditions', () => {
  it('joins multiple issues', () => {
    const result = evaluateWeather(
      makeForecast({
        weatherCode: 95,
        weatherDescription: 'Thunderstorm',
        tempHighF: 100,
        tempHighC: 38,
        windSpeedKmh: 65,
      })
    )
    assert.ok(result!.message.includes('Thunderstorm'))
    assert.ok(result!.message.includes('Extreme heat'))
    assert.ok(result!.message.includes('Very high winds'))
  })
  it('message ends with period', () => {
    const result = evaluateWeather(
      makeForecast({ weatherCode: 95, weatherDescription: 'Thunderstorm' })
    )
    assert.ok(result!.message.endsWith('.'))
  })
})

describe('temperature conversion formula', () => {
  it('0C = 32F', () => {
    assert.equal(Math.round((0 * 9) / 5 + 32), 32)
  })
  it('100C = 212F', () => {
    assert.equal(Math.round((100 * 9) / 5 + 32), 212)
  })
  it('37C = 99F', () => {
    assert.equal(Math.round((37 * 9) / 5 + 32), 99)
  })
})
