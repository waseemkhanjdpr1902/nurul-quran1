import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useStockswapCreateShop } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation as useGeoLocation } from "@/hooks/use-location";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, Navigation } from "lucide-react";

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (p: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { setShop, shop } = useAuth();
  const { toast } = useToast();
  const geo = useGeoLocation();
  
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [markerPos, setMarkerPos] = useState<L.LatLng | null>(null);

  const createShopMutation = useStockswapCreateShop();

  const handleUseCurrentLocation = () => {
    if (geo.lat && geo.lng) {
      setMarkerPos(new L.LatLng(geo.lat, geo.lng));
      toast({ title: "Location updated", description: "Using your current GPS location." });
    } else {
      geo.retry();
      toast({ title: "Fetching location", description: "Please wait..." });
    }
  };

  const onSubmit = () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Shop name is required." });
      return;
    }
    
    createShopMutation.mutate(
      {
        data: {
          name,
          address,
          lat: markerPos?.lat || geo.lat || undefined,
          lng: markerPos?.lng || geo.lng || undefined,
        },
      },
      {
        onSuccess: (data) => {
          setShop(data);
          setLocation("/stockswap/");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Setup failed",
            description: error?.response?.data?.error || "Could not setup shop",
          });
        },
      }
    );
  };

  if (shop) {
    setLocation("/stockswap/");
    return null;
  }

  const center = markerPos || (geo.lat && geo.lng ? new L.LatLng(geo.lat, geo.lng) : new L.LatLng(40.7128, -74.0060));

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col max-w-md mx-auto shadow-xl">
      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Set Up Your Shop</h1>
          <p className="text-lg text-gray-500 mt-2 font-medium">Where are your deals located?</p>
        </div>

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <Label className="text-base font-bold">Shop Name</Label>
            <Input 
              placeholder="e.g. Mike's Electronics" 
              className="h-14 text-lg" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-shop-name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-bold">Shop Address (Optional)</Label>
            <Input 
              placeholder="123 Main St" 
              className="h-14 text-lg" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              data-testid="input-shop-address"
            />
          </div>

          <div className="space-y-2 flex-1 min-h-[300px] flex flex-col">
            <div className="flex justify-between items-center">
              <Label className="text-base font-bold">Map Location</Label>
              <Button variant="outline" size="sm" onClick={handleUseCurrentLocation} data-testid="btn-use-gps">
                <Navigation className="w-4 h-4 mr-2" />
                Use GPS
              </Button>
            </div>
            <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative z-0">
              <MapContainer center={center} zoom={13} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={markerPos || (geo.lat && geo.lng ? new L.LatLng(geo.lat, geo.lng) : null)} setPosition={setMarkerPos} />
              </MapContainer>
            </div>
            <p className="text-xs text-gray-500 text-center">Tap the map to set your exact location</p>
          </div>
        </div>

        <div className="pt-6 pb-8">
          <Button 
            className="w-full h-14 text-lg font-bold rounded-xl shadow-md" 
            onClick={onSubmit}
            disabled={createShopMutation.isPending}
            data-testid="btn-create-shop"
          >
            {createShopMutation.isPending ? "Saving..." : "Start Selling"}
          </Button>
        </div>
      </div>
    </div>
  );
}
