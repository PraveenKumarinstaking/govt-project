/**
 * Haversine Formula — calculate distance between two GPS coordinates
 * Returns distance in kilometers
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

/**
 * Find nearest available resource from a list
 * @param {{ lat: number, lng: number }} target - incident coordinates
 * @param {Array} resources - array of resource docs with location.lat, location.lng
 * @returns {{ resource: object, distance: number } | null}
 */
function findNearest(target, resources) {
  if (!resources || resources.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const res of resources) {
    if (!res.location || res.location.lat == null || res.location.lng == null) continue;
    const dist = haversine(target.lat, target.lng, res.location.lat, res.location.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = res;
    }
  }

  return nearest ? { resource: nearest, distance: minDist } : null;
}

/**
 * Find nearest N resources sorted by distance
 */
function findNearestN(target, resources, n = 3) {
  if (!resources || resources.length === 0) return [];

  const withDist = resources
    .filter((r) => r.location && r.location.lat != null && r.location.lng != null)
    .map((r) => ({
      resource: r,
      distance: haversine(target.lat, target.lng, r.location.lat, r.location.lng),
    }))
    .sort((a, b) => a.distance - b.distance);

  return withDist.slice(0, n);
}

module.exports = { haversine, findNearest, findNearestN };
