import { Restaurant, UserLocation } from '../types';

/**
 * 1. Haversine Algorithm: Calculates real distance between two points on Earth
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 2. Bayesian Average Score
 * Formula: W = (vR + mC) / (v + m)
 * v: number of reviews
 * m: minimum reviews required to be considered (threshold)
 * R: average rating of the restaurant
 * C: global average rating of all restaurants
 */
export function calculateBayesianScore(
  v: number, 
  R: number, 
  m: number = 10, 
  C: number = 3.5
): number {
  return (v * R + m * C) / (v + m);
}

/**
 * 3. Weighted Random Algorithm
 * Gives higher probability to higher bayesian scores
 */
export function weightedRandomSelect(restaurants: Restaurant[]): Restaurant | null {
  if (restaurants.length === 0) return null;

  // We use Bayesian score squared to increase the probability gap between good and mediocre
  const totalWeight = restaurants.reduce((sum, r) => sum + Math.pow(r.bayesianScore || 0, 3), 0);
  let random = Math.random() * totalWeight;

  for (const restaurant of restaurants) {
    const weight = Math.pow(restaurant.bayesianScore || 0, 3);
    if (random < weight) return restaurant;
    random -= weight;
  }

  return restaurants[0];
}

/**
 * 4. Full Pipeline: Filter -> Score -> Distance -> Sort
 */
export function processRestaurants(
  userLoc: UserLocation,
  allRestaurants: Restaurant[],
  radiusKm: number = 5
): Restaurant[] {
  // Global stats for Bayesian
  const validRestaurants = allRestaurants.filter(r => r.reviewCount > 0);
  const C = validRestaurants.length > 0 
    ? validRestaurants.reduce((sum, r) => sum + r.avgRating, 0) / validRestaurants.length 
    : 3.5;
  const m = 5; // Minimum reviews for our small demo dataset

  return allRestaurants
    .map(res => {
      const distance = calculateDistance(userLoc.lat, userLoc.lng, res.lat, res.lng);
      const bayesianScore = calculateBayesianScore(res.reviewCount, res.avgRating, m, C);
      return { ...res, distance, bayesianScore };
    })
    .filter(res => res.distance! <= radiusKm)
    .sort((a, b) => (b.bayesianScore || 0) - (a.bayesianScore || 0));
}
