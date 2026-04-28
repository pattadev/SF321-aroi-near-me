/// <reference types="vite/client" /> 

import { Restaurant } from '../types';

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.photos',
  'places.primaryTypeDisplayName',
].join(',');  

function mapPriceLevel(priceLevel: string | undefined): number {
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 1,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[priceLevel ?? ''] ?? 2;
}

export async function fetchNearbyRestaurants(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<Restaurant[]> {
  const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined;
  if (!API_KEY) throw new Error('MISSING_API_KEY');

  const response = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: [
        'restaurant',
        'fast_food_restaurant',
        'cafe',
        'food_court',
        'bakery',
        'bar',
        'ice_cream_shop',
        'coffee_shop',
        'juice_shop',
        'american_restaurant',
        'barbecue_restaurant',
        'brazilian_restaurant',
        'breakfast_restaurant',
        'brunch_restaurant',
        'chinese_restaurant',
        'fine_dining_restaurant',
        'french_restaurant',
        'greek_restaurant',
        'hamburger_restaurant',
        'indian_restaurant',
        'indonesian_restaurant',
        'italian_restaurant',
        'japanese_restaurant',
        'korean_restaurant',
        'lebanese_restaurant',
        'mediterranean_restaurant',
        'mexican_restaurant',
        'middle_eastern_restaurant',
        'pizza_restaurant',
        'ramen_restaurant',
        'sandwich_shop',
        'seafood_restaurant',
        'spanish_restaurant',
        'steak_house',
        'sushi_restaurant',
        'thai_restaurant',
        'turkish_restaurant',
        'vegan_restaurant',
        'vegetarian_restaurant',
        'vietnamese_restaurant',
      ],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(radiusKm * 1000, 50000),
        },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Places API error: ${response.status}`);
  }

  const data = await response.json();
  const places: any[] = data.places ?? [];

  return places.map((place): Restaurant => {
    const photoName: string | undefined = place.photos?.[0]?.name;
    const image = photoName
      ? `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=480&maxWidthPx=720&key=${API_KEY}`
      : DEFAULT_IMAGE;

    return {
      id: place.id,
      name: place.displayName?.text ?? 'Unknown',
      image,
      lat: place.location.latitude,
      lng: place.location.longitude,
      avgRating: place.rating ?? 0,
      reviewCount: place.userRatingCount ?? 0,
      category: place.primaryTypeDisplayName?.text ?? 'Restaurant',
      priceLevel: mapPriceLevel(place.priceLevel),
    };
  });
}
