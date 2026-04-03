import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Link, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  useStockswapGetListing, 
  getStockswapGetListingQueryKey,
  useStockswapGetMessages,
  useStockswapSendMessage
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BadgeCheck, ArrowLeft, MapPin, Store, Clock, Send, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ListingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  
  const { data: listing, isLoading: loadingListing } = useStockswapGetListing(id, {
    query: { queryKey: getStockswapGetListingQueryKey(id), enabled: !!id }
  });

  const [chatOpen, setChatOpen] = useState(false);
  const [msgContent, setMsgContent] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const peerId = listing && user ? (listing.shopId === user.id ? undefined : listing.shopId) : undefined;

  const { data: messages, refetch } = useStockswapGetMessages(
    { peerId: listing?.shopId || "" }, 
    { 
      query: { 
        queryKey: ["messages", id, listing?.shopId], 
        enabled: chatOpen && !!listing?.shopId && listing.shopId !== user?.id,
        refetchInterval: 3000
      } 
    }
  );

  const sendMutation = useStockswapSendMessage();

  useEffect(() => {
    if (chatOpen && messages) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatOpen]);

  const handleSend = () => {
    if (!msgContent.trim() || !listing) return;
    
    sendMutation.mutate({
      listingId: id,
      data: { content: msgContent, receiverId: listing.shopId }
    }, {
      onSuccess: () => {
        setMsgContent("");
        refetch();
      }
    });
  };

  if (loadingListing) {
    return (
      <Layout>
        <div className="h-64 bg-gray-200 animate-pulse"></div>
        <div className="p-4 space-y-4">
          <div className="h-8 bg-gray-200 animate-pulse w-3/4 rounded"></div>
          <div className="h-4 bg-gray-200 animate-pulse w-1/2 rounded"></div>
        </div>
      </Layout>
    );
  }

  if (!listing) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold">Listing not found</h2>
          <Link href="/stockswap/" className="text-primary mt-4 inline-block underline">Go back</Link>
        </div>
      </Layout>
    );
  }

  const isOwner = user?.id === listing.shopId;

  return (
    <Layout>
      <div className="relative">
        <Link href="/stockswap/" className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg" data-testid="btn-back">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        
        <div className="w-full aspect-square md:aspect-video bg-gray-100 relative">
          {listing.imageUrl ? (
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Store className="w-16 h-16 opacity-50" />
            </div>
          )}
          {listing.isBoosted && (
            <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-extrabold px-3 py-1 rounded-full shadow-md" data-testid="badge-featured">
              FEATURED
            </div>
          )}
        </div>
      </div>

      <div className="p-5 bg-white rounded-t-3xl -mt-6 relative z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{listing.title}</h1>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 text-green-800 font-extrabold px-3 py-1.5 rounded-lg text-xl">
            ${listing.discountPrice}
          </div>
          <div className="text-gray-400 line-through text-lg font-medium">
            ${listing.originalPrice}
          </div>
          <div className="ml-auto bg-gray-100 text-gray-800 text-sm font-bold px-3 py-1.5 rounded-lg">
            {listing.quantity} units left
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Condition</p>
            <p className="font-bold text-gray-900">{listing.condition}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Category</p>
            <p className="font-bold text-gray-900">{listing.category}</p>
          </div>
          {listing.brand && (
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2">
              <p className="text-xs text-gray-500 font-medium mb-1">Brand</p>
              <p className="font-bold text-gray-900">{listing.brand}</p>
            </div>
          )}
          {listing.expiryDate && (
            <div className="bg-red-50 p-3 rounded-xl border border-red-100 col-span-2 flex items-center">
              <Clock className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <p className="text-xs text-red-500 font-medium mb-0.5">Expires</p>
                <p className="font-bold text-red-700">{new Date(listing.expiryDate).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-b border-gray-100 py-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-gray-900 flex items-center text-lg">
                {listing.shopName}
                {listing.shopVerified && <BadgeCheck className="w-5 h-5 text-blue-500 ml-1" data-testid="badge-verified" />}
              </p>
              {listing.distanceKm !== null && listing.distanceKm !== undefined && (
                <p className="text-sm text-gray-500 flex items-center mt-0.5">
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  {listing.distanceKm.toFixed(1)} km away
                </p>
              )}
            </div>
          </div>
        </div>

        {!isOwner && (
          <div className="pb-8">
            {!chatOpen ? (
              <Button 
                className="w-full h-14 text-lg font-bold rounded-xl shadow-lg" 
                onClick={() => setChatOpen(true)}
                data-testid="btn-start-chat"
              >
                Start Chat with Seller
              </Button>
            ) : (
              <div className="border border-gray-200 rounded-2xl overflow-hidden flex flex-col h-[400px]">
                <div className="bg-gray-100 p-3 border-b border-gray-200 font-bold text-center text-sm flex justify-between items-center">
                  Chatting with {listing.shopName}
                  <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-gray-800">Close</button>
                </div>
                
                <div className="flex-1 p-3 overflow-y-auto bg-gray-50 space-y-3">
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs flex items-start">
                    <Info className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                    Remember: Arrange an in-person inspection before paying. Do not pay in advance.
                  </div>
                  
                  {messages?.map((msg: any) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'}`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
                  <Input 
                    placeholder="Ask about this item..." 
                    className="flex-1 rounded-full h-12" 
                    value={msgContent}
                    onChange={e => setMsgContent(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    data-testid="input-chat-message"
                  />
                  <Button 
                    className="rounded-full w-12 h-12 p-0 flex-shrink-0" 
                    onClick={handleSend}
                    disabled={sendMutation.isPending || !msgContent.trim()}
                    data-testid="btn-send-message"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
