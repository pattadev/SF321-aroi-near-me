export interface Restaurant {
  id: string;
  name: string;
  image: string;
  lat: number;
  lng: number;
  avgRating: number;   // R
  reviewCount: number; // v
  category: string;
  priceLevel: number;
  bayesianScore?: number;
  distance?: number;
  geohash?: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
}
