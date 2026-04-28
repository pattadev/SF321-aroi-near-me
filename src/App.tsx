import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Star,
  MessageSquare,
  Navigation,
  Dices,
  Search,
  ChefHat,
  Filter,
  ArrowUpRight,
  Loader2,
  RefreshCcw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Restaurant, UserLocation } from './types.ts';
import { fetchNearbyRestaurants } from './lib/placesApi.ts';
import {
  processRestaurants,
  weightedRandomSelect,
} from './lib/algorithms.ts';

const DEFAULT_LOCATION: UserLocation = { lat: 13.7468, lng: 100.535 };

export default function App() {
  const [userLocation, setUserLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [radius, setRadius] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedRandom, setSelectedRandom] = useState<Restaurant | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const [rawRestaurants, setRawRestaurants] = useState<Restaurant[]>([]);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [fetchErrorMsg, setFetchErrorMsg] = useState('');
  const [debouncedRadius, setDebouncedRadius] = useState(radius);

  const requestLocation = useCallback(() => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocating(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  }, []);

  // Debounce radius to avoid excessive API calls while dragging the slider
  useEffect(() => {
    const t = setTimeout(() => setDebouncedRadius(radius), 600);
    return () => clearTimeout(t);
  }, [radius]);

  // Fetch real data from Google Places API
  useEffect(() => {
    let cancelled = false;
    setIsFetchingPlaces(true);
    setFetchError(false);
    setFetchErrorMsg('');

    fetchNearbyRestaurants(userLocation.lat, userLocation.lng, debouncedRadius)
      .then((places) => {
        if (cancelled) return;
        setRawRestaurants(places);
        if (places.length === 0) {
          setFetchError(true);
          setFetchErrorMsg('No restaurants found in this area. Try increasing the radius.');
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setRawRestaurants([]);
        setFetchError(true);
        setFetchErrorMsg(
          err.message === 'MISSING_API_KEY'
            ? 'Google Places API key not configured. Add VITE_GOOGLE_PLACES_API_KEY to your .env.local file.'
            : `Couldn't load nearby restaurants: ${err.message}`
        );
      })
      .finally(() => {
        if (!cancelled) setIsFetchingPlaces(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation, debouncedRadius]);

  const nearbyRestaurants = useMemo(
    () => processRestaurants(userLocation, rawRestaurants, radius),
    [userLocation, rawRestaurants, radius]
  );

  const filteredRestaurants = useMemo(
    () =>
      nearbyRestaurants.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.category.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [nearbyRestaurants, searchQuery]
  );

  const handleRandomize = () => {
    setIsSpinning(true);
    setSelectedRandom(null);
    setTimeout(() => {
      const winner = weightedRandomSelect(filteredRestaurants);
      setSelectedRandom(winner);
      setIsSpinning(false);
    }, 1500);
  };

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [userLocation, radius]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-2 rounded-xl">
              <ChefHat className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Aroi Near Me
            </h1>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span>
              {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </span>
            <button
              onClick={requestLocation}
              disabled={isLocating}
              className="ml-1 p-1 hover:bg-white rounded-full transition-colors disabled:opacity-50"
              title="Detect My Location"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Search + Filter + Random Button */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or category (e.g. Som Tum, Japanese)..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl">
                <div className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                  <Filter className="w-4 h-4" />
                  <span>Radius:</span>
                  <span className="font-bold text-orange-600 w-12 text-right">{radius}km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>

            <button
              onClick={handleRandomize}
              disabled={isSpinning || filteredRestaurants.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:bg-slate-300 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
            >
              {isSpinning ? (
                <Dices className="w-5 h-5 animate-bounce" />
              ) : (
                <Dices className="w-5 h-5" />
              )}
              <span>Random Lucky Draw (Weighted)</span>
            </button>
          </div>

          {/* Randomized Result — directly below Search */}
          <AnimatePresence>
            {(isSpinning || selectedRandom) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="bg-orange-200 rounded-3xl relative overflow-hidden shadow-2xl">
                  <AnimatePresence mode="wait">
                    {isSpinning ? (
                      <motion.div
                        key="spinning"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10 p-6 flex items-center gap-6"
                      >
                        <div className="relative w-14 h-14 flex-shrink-0">
                          <div className="w-14 h-14 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin" />
                          <Dices className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">Spinning the Wheel...</h3>
                          <p className="text-slate-800 text-sm">Weighting by score & reliability</p>
                        </div>
                      </motion.div>
                    ) : selectedRandom ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10"
                      >
                        {/* Photo — full width, tall */}
                        <div className="relative w-full h-56 overflow-hidden rounded-t-3xl">
                          <img
                            src={selectedRandom.image}
                            alt={selectedRandom.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                          <div className="absolute top-4 left-4">
                            <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                              Lucky Pick
                            </span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="px-6 pb-6 pt-4 space-y-4">
                          <div>
                            <h3 className="text-white text-2xl font-bold leading-tight">
                              {selectedRandom.name}
                            </h3>
                            <p className="text-slate-800 text-sm mt-1">
                              {selectedRandom.category} · {selectedRandom.distance?.toFixed(1)} km away
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                              <span className="text-white font-bold">
                                {selectedRandom.reviewCount > 0
                                  ? (selectedRandom.bayesianScore ?? 0).toFixed(2)
                                  : '--'}
                              </span>
                              <span className="text-slate-400 text-xs">score</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl">
                              <MessageSquare className="w-4 h-4 text-blue-400 fill-blue-400" />
                              <span className="text-white font-bold">
                                {selectedRandom.reviewCount > 0
                                  ? selectedRandom.reviewCount.toLocaleString()
                                  : 'New'}
                              </span>
                              <span className="text-slate-400 text-xs">reviews</span>
                            </div>
                          </div>

                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedRandom.lat},${selectedRandom.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-white text-slate-900 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors shadow-lg"
                          >
                            <Navigation className="w-5 h-5 fill-slate-900" />
                            Get Directions
                          </a>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Restaurant List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Smart Recommendations
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  Sorted by Bayesian Average
                </span>
              </h2>
              <div className="flex items-center gap-3">
                {isFetchingPlaces && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Finding nearby...</span>
                  </div>
                )}
                <div className="text-sm text-slate-500">
                  Found {filteredRestaurants.length} restaurants
                </div>
              </div>
            </div>

            {fetchError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{fetchErrorMsg}</span>
              </div>
            )}

            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p>Processing algorithms...</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredRestaurants.map((res, index) => (
                    <RestaurantCard key={res.id} restaurant={res} delay={index * 0.04} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {!loading && filteredRestaurants.length === 0 && !fetchError && (
              <div className="bg-white p-12 rounded-3xl text-center space-y-4 border border-dashed border-slate-300">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">No restaurants found</p>
                  <p className="text-sm text-slate-500">
                    Try increasing the radius or checking your search query.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  delay: number;
  key?: React.Key;
}

const RestaurantCard = ({ restaurant, delay }: RestaurantCardProps) => {
  const priceRange = Array(restaurant.priceLevel).fill('฿').join('');
  const hasRating = restaurant.reviewCount > 0;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      layout
      className="group bg-white rounded-3xl overflow-hidden border border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 hover:border-orange-500/20 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="absolute top-3 left-3 flex gap-2">
          <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
            {restaurant.category}
          </div>
          <div className="bg-orange-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm">
            {priceRange}
          </div>
        </div>

        <div className="absolute bottom-3 left-3">
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg shadow-lg">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            {hasRating ? (
              <>
                <span className="text-xs font-bold text-slate-800">{restaurant.avgRating.toFixed(1)}</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  ({restaurant.reviewCount.toLocaleString()})
                </span>
              </>
            ) : (
              <span className="text-xs font-medium text-slate-500">New</span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors flex items-start justify-between gap-2">
            <span className="line-clamp-1">{restaurant.name}</span>
            <ArrowUpRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-orange-500" />
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-xs font-medium">
            <MapPin className="w-3 h-3" />
            {restaurant.distance?.toFixed(1)} km away
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 leading-none">
              Bayesian Avg
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((restaurant.bayesianScore ?? 0) / 5) * 100}%` }}
                  className="h-full bg-orange-500"
                />
              </div>
              <span className="text-sm font-bold text-slate-800">
                {(restaurant.bayesianScore ?? 0).toFixed(2)}
              </span>
            </div>
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-slate-50 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
            title="Get Directions"
          >
            <Navigation className="w-4 h-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};
