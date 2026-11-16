const R = 6371 // Earth radius in km

export function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Returns n+1 points along the great-circle between two lat/lon coords.
// Uses spherical linear interpolation (slerp).
export function greatCirclePoints(lat1, lon1, lat2, lon2, n = 80) {
  const toRad = (x) => (x * Math.PI) / 180
  const toDeg = (x) => (x * 180) / Math.PI

  const φ1 = toRad(lat1), λ1 = toRad(lon1)
  const φ2 = toRad(lat2), λ2 = toRad(lon2)

  // Convert to Cartesian
  const x1 = Math.cos(φ1) * Math.cos(λ1)
  const y1 = Math.cos(φ1) * Math.sin(λ1)
  const z1 = Math.sin(φ1)

  const x2 = Math.cos(φ2) * Math.cos(λ2)
  const y2 = Math.cos(φ2) * Math.sin(λ2)
  const z2 = Math.sin(φ2)

  // Angle between vectors
  const dot = x1 * x2 + y1 * y2 + z1 * z2
  const omega = Math.acos(Math.min(Math.max(dot, -1), 1))

  const points = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    let x, y, z

    if (Math.abs(omega) < 1e-10) {
      // Points are essentially the same
      x = x1; y = y1; z = z1
    } else {
      const sinO = Math.sin(omega)
      const a = Math.sin((1 - t) * omega) / sinO
      const b = Math.sin(t * omega) / sinO
      x = a * x1 + b * x2
      y = a * y1 + b * y2
      z = a * z1 + b * z2
    }

    const lat = toDeg(Math.asin(Math.min(Math.max(z, -1), 1)))
    const lon = toDeg(Math.atan2(y, x))
    points.push([lat, lon])
  }

  return points
}
