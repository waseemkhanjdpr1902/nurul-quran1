import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useCamera } from "@/hooks/use-camera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Camera, X, UploadCloud, RefreshCw } from "lucide-react";
import { useStockswapUploadImage, useStockswapAISuggest, useStockswapCreateListing } from "@workspace/api-client-react";

export default function ListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { videoRef, startCamera, stopCamera, capturePhoto, isReady, error: camError } = useCamera();
  
  const [step, setStep] = useState<"camera" | "form">("camera");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  const uploadMutation = useStockswapUploadImage();
  const aiSuggestMutation = useStockswapAISuggest();
  const createListingMutation = useStockswapCreateListing();

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [brand, setBrand] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [condition, setCondition] = useState("New");

  useEffect(() => {
    if (step === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, startCamera, stopCamera]);

  const handleCapture = async () => {
    const base64 = capturePhoto();
    if (!base64) {
      toast({ variant: "destructive", title: "Error", description: "Failed to capture photo." });
      return;
    }
    setImageBase64(base64);
    setStep("form");

    // Upload image
    uploadMutation.mutate({ data: { imageBase64: base64, fileName: "capture.jpg" } }, {
      onSuccess: (data) => setImageUrl(data.url),
      onError: () => toast({ variant: "destructive", title: "Upload failed" })
    });

    // AI Suggest
    aiSuggestMutation.mutate({ data: { imageBase64: base64 } }, {
      onSuccess: (data) => {
        setTitle(data.title);
        setCategory(data.category);
        if (data.brand) setBrand(data.brand);
        toast({ title: "AI Analysis Complete", description: "Form pre-filled based on the image!" });
      }
    });
  };

  const handleSubmit = () => {
    if (!title || !originalPrice || !discountPrice || !quantity) {
      toast({ variant: "destructive", title: "Error", description: "Please fill all required fields." });
      return;
    }

    createListingMutation.mutate({
      data: {
        title,
        category,
        brand,
        originalPrice: Number(originalPrice),
        discountPrice: Number(discountPrice),
        expiryDate: expiryDate || undefined,
        quantity: Number(quantity),
        condition,
        imageUrl,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Listing created!" });
        setLocation("/stockswap/my-listings");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.response?.data?.error || "Failed to create listing" });
      }
    });
  };

  if (step === "camera") {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col max-w-md mx-auto relative">
        <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
          {camError ? (
            <div className="text-white p-4 text-center">
              <p className="mb-4 text-red-400">{camError}</p>
              <Button onClick={() => setStep("form")} variant="secondary">Skip Camera</Button>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          )}
          
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <Button variant="ghost" size="icon" className="text-white bg-black/20 rounded-full" onClick={() => setLocation("/stockswap/")}>
              <X className="w-6 h-6" />
            </Button>
            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">Fast List</div>
            <div className="w-10"></div>
          </div>
        </div>

        <div className="h-32 bg-black flex items-center justify-center pb-safe">
          <button 
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-50"
            onClick={handleCapture}
            disabled={!isReady}
            data-testid="btn-capture"
          >
            <div className="w-16 h-16 bg-white rounded-full transition-transform active:scale-90" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">New Listing</h1>
          <Button variant="ghost" size="icon" onClick={() => setStep("camera")}>
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        <div className="mb-6 rounded-xl overflow-hidden bg-gray-100 aspect-video relative flex items-center justify-center border border-gray-200">
          {imageBase64 ? (
            <img src={`data:image/jpeg;base64,${imageBase64}`} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-400 flex flex-col items-center">
              <Camera className="w-10 h-10 mb-2" />
              <span>No image captured</span>
            </div>
          )}
          
          {uploadMutation.isPending && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-white animate-bounce" />
            </div>
          )}
        </div>

        {aiSuggestMutation.isPending && (
          <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-lg mb-6 flex items-center text-sm font-medium">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            AI is analyzing your item...
          </div>
        )}

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="font-bold">Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="h-12 text-lg" data-testid="input-title" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12" data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Food & Beverage">Food & Bev</SelectItem>
                  <SelectItem value="Tools">Tools</SelectItem>
                  <SelectItem value="Furniture">Furniture</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="h-12" data-testid="select-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Like New">Like New</SelectItem>
                  <SelectItem value="Used">Used</SelectItem>
                  <SelectItem value="Damaged Packaging">Damaged Pkg</SelectItem>
                  <SelectItem value="Near Expiry">Near Expiry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Brand (Optional)</Label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} className="h-12" data-testid="input-brand" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold text-gray-500">Retail Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="h-12 pl-8 text-lg bg-gray-50 text-gray-500 line-through" data-testid="input-original-price" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-green-600">Your Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">$</span>
                <Input type="number" value={discountPrice} onChange={e => setDiscountPrice(e.target.value)} className="h-12 pl-8 text-lg font-bold border-green-300 focus-visible:ring-green-500" data-testid="input-discount-price" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">Quantity *</Label>
              <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-12 text-lg" data-testid="input-quantity" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Expiry (Optional)</Label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-12" data-testid="input-expiry" />
            </div>
          </div>

          <Button 
            className="w-full h-14 text-lg font-bold rounded-xl mt-6" 
            onClick={handleSubmit}
            disabled={createListingMutation.isPending || uploadMutation.isPending}
            data-testid="btn-submit-listing"
          >
            {createListingMutation.isPending ? "Publishing..." : "Publish Deal"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
