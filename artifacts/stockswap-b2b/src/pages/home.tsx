import { useState } from "react";
import { Layout } from "@/components/layout";
import { AdBanner } from "@/components/ad-banner";
import { useStockswapGetListings, getStockswapGetListingsQueryKey } from "@workspace/api-client-react";
import { useLocation as useWouterLocation, Link } from "wouter";
import { useLocation as useGeoLocation } from "@/hooks/use-location";
import { Input } from "@/components/ui/input";
import { BadgeCheck, Map as MapIcon, List, Search, Zap, Clock, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function HomePage() {
  const geo = useGeoLocation();
  const [, setLocation] = useWouterLocation();
  const [view, setView] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  
  const { data, isLoading } = useStockswapGetListings({
    lat: geo.lat,
    lng: geo.lng,
    search: search || undefined,
    category,
    radiusKm: 50
  }, { 
    query: { 
      queryKey: getStockswapGetListingsQueryKey({ lat: geo.lat, lng: geo.lng, search, category, radiusKm: 50 }),
      enabled: !geo.loading
    } 
  });

  const categories = ["All", "Electronics", "Clothing", "Food & Beverage", "Tools", "Furniture"];

  return (
    <Layout>
      <AdBanner />
      
      <div className="bg-primary pt-12 pb-6 px-4 rounded-b-3xl shadow-md z-10 relative">
        <h1 className="text-3xl font-extrabold text-white mb-1">Deals Near Me</h1>
        <p className="text-primary-foreground/80 font-medium mb-6 flex items-center text-sm">
          <Navigation className="w-4 h-4 mr-1" />
          {geo.loading ? "Finding location..." : geo.error ? "Location disabled" : "Local businesses around you"}
        </p>
        
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder="Search surplus inventory..." 
            className="h-14 pl-12 rounded-xl text-lg bg-white border-0 shadow-inner" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x">
          {categories.map(c => (
            <button
              key={c}
              className={`snap-center whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                (c === "All" && !category) || category === c
                  ? "bg-white text-primary shadow-sm"
                  : "bg-primary-foreground/20 text-white hover:bg-primary-foreground/30"
              }`}
              onClick={() => setCategory(c === "All" ? undefined : c)}
              data-testid={`filter-${c}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center -mt-5 relative z-20 mb-6">
        <div className="bg-white rounded-full p-1 shadow-lg border border-gray-100 flex gap-1">
          <button 
            className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition-colors ${view === "list" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            onClick={() => setView("list")}
            data-testid="btn-view-list"
          >
            <List className="w-4 h-4 mr-2" /> List
          </button>
          <button 
            className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition-colors ${view === "map" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            onClick={() => setView("map")}
            data-testid="btn-view-map"
          >
            <MapIcon className="w-4 h-4 mr-2" /> Map
          </button>
        </div>
      </div>

      <div className="px-4 pb-4">
        {isLoading || geo.loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : !data?.listings || data.listings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No deals found</h3>
            <p className="text-gray-500">Try adjusting your filters or search radius.</p>
          </div>
        ) : view === "list" ? (
          <div className="space-y-4">
            {data.listings.map(listing => (
              <Link key={listing.id} href={`/stockswap/listing/${listing.id}`}>
                <a className="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform" data-testid={`listing-card-${listing.id}`}>
                  <div className="flex p-3 gap-4">
                    <div className="w-28 h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {listing.imageUrl ? (
                        <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <PackageOpen className="w-8 h-8 opacity-50" />
                        </div>
                      )}
                      {listing.isBoosted && (
                        <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-br-lg z-10 flex items-center shadow-sm" data-testid="badge-featured">
                          <Zap className="w-3 h-3 mr-1" fill="currentColor" /> FEATURED
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 py-1 flex flex-col">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-900 truncate text-lg">{listing.title}</h3>
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500 mb-2">
                        <span className="truncate flex items-center">
                          {listing.shopName}
                          {listing.shopVerified && <BadgeCheck className="w-3 h-3 text-blue-500 ml-1 inline" data-testid="badge-verified" />}
                        </span>
                        {listing.distanceKm !== null && listing.distanceKm !== undefined && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="whitespace-nowrap" data-testid="badge-distance">{listing.distanceKm.toFixed(1)} km away</span>
                          </>
                        )}
                      </div>

                      <div className="mt-auto flex items-end justify-between">
                        <div>
                          <p className="text-gray-400 line-through text-xs">${listing.originalPrice}</p>
                          <p className="text-green-600 font-extrabold text-xl leading-none">${listing.discountPrice}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold bg-gray-100 px-2 py-1 rounded-md text-gray-700">{listing.quantity} left</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              </Link>
            ))}
          </div>
        ) : (
          <div className="h-[60vh] rounded-2xl overflow-hidden border border-gray-200 shadow-inner z-0">
            {geo.lat && geo.lng ? (
              <MapContainer center={[geo.lat, geo.lng]} zoom={12} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {data.listings.filter(l => l.lat && l.lng).map(listing => (
                  <Marker key={listing.id} position={[listing.lat!, listing.lng!]}>
                    <Popup>
                      <Link href={`/stockswap/listing/${listing.id}`}>
                        <a className="block text-center p-1">
                          <p className="font-bold text-base mb-1">{listing.title}</p>
                          <p className="text-green-600 font-bold">${listing.discountPrice}</p>
                          <p className="text-xs text-blue-600 underline mt-1">View Deal</p>
                        </a>
                      </Link>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 font-medium">
                Map unavailable (Location access needed)
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

// Temporary icon for placeholder
function PackageOpen(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
}
