import { Layout } from "@/components/layout";
import { AdBanner } from "@/components/ad-banner";
import { useStockswapGetMyListings, useStockswapBoostListing, getStockswapGetMyListingsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Store, Zap, PackageOpen, Plus, BadgeCheck } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";

export default function MyListingsPage() {
  const { data, isLoading } = useStockswapGetMyListings(undefined, { query: { queryKey: getStockswapGetMyListingsQueryKey() } });
  const boostMutation = useStockswapBoostListing();
  const { toast } = useToast();
  const { shop } = useAuth();

  const handleBoost = (id: string) => {
    boostMutation.mutate(
      { listingId: id, data: { successUrl: window.location.href, cancelUrl: window.location.href } },
      {
        onSuccess: (res) => {
          window.location.href = res.url;
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Could not start boost process." })
      }
    );
  };

  return (
    <Layout>
      <AdBanner />
      
      <div className="p-4 bg-orange-50 border-b border-orange-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-md">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {shop?.name || "My Shop"}
              {shop?.isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" data-testid="badge-verified" />}
            </h1>
            <p className="text-sm text-gray-500">{shop?.address || "No address set"}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">My Deals</h2>
          <Link href="/stockswap/list" className="bg-gray-100 text-gray-900 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center hover:bg-gray-200 transition-colors">
            <Plus className="w-4 h-4 mr-1" />
            New Deal
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <PackageOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No active deals</h3>
            <p className="text-gray-500 mb-6 max-w-[200px] mx-auto text-sm">Clear out your slow-moving stock by listing it here.</p>
            <Link href="/stockswap/list" className="bg-primary text-white font-bold py-3 px-6 rounded-xl shadow-lg inline-block">
              Create First Deal
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map(listing => (
              <div key={listing.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" data-testid={`listing-card-${listing.id}`}>
                <div className="flex p-3 gap-3">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                    {listing.imageUrl ? (
                      <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Store className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                    {listing.isBoosted && (
                      <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg z-10 flex items-center shadow-sm" data-testid="badge-featured">
                        <Zap className="w-3 h-3 mr-0.5" fill="currentColor" />
                        FEATURED
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-gray-900 truncate text-lg leading-tight">{listing.title}</h3>
                    <p className="text-sm text-gray-500 mb-1">{listing.quantity} units • {listing.condition}</p>
                    <div className="flex items-center gap-2 mt-auto">
                      <span className="text-green-600 font-bold text-lg">${listing.discountPrice}</span>
                      <span className="text-gray-400 line-through text-sm">${listing.originalPrice}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-2 flex justify-end gap-2 border-t border-gray-100">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 font-bold border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                    onClick={() => handleBoost(listing.id)}
                    disabled={boostMutation.isPending || listing.isBoosted}
                    data-testid={`btn-boost-${listing.id}`}
                  >
                    <Zap className="w-4 h-4 mr-1" fill={listing.isBoosted ? "currentColor" : "none"} />
                    {listing.isBoosted ? "Boosted" : "Boost for $1"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
