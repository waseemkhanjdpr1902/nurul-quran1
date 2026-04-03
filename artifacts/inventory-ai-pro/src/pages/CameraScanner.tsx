import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useScanInventoryItem } from "@workspace/api-client-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera as CameraIcon, FlipHorizontal, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddProductModal } from "@/components/AddProductModal";

export default function CameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPrefill, setScannedPrefill] = useState<{ name?: string; sku?: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const scanMutation = useScanInventoryItem();
  const { toast } = useToast();
  const reader = useMemo(() => new BrowserMultiFormatReader(), []);

  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize camera
  const initCamera = useCallback(async (deviceId?: string) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera not available in this environment.");
      return;
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === "videoinput");
      setDevices(videoDevices);
      
      const targetId = deviceId || (videoDevices.length > 0 ? videoDevices[videoDevices.length - 1].deviceId : undefined);
      setCurrentDeviceId(targetId || "");

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: targetId ? { deviceId: { exact: targetId } } : { facingMode: "environment" }
      });
      
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      setCameraError("Camera access denied. Please allow camera permissions.");
    }
  }, [stream]);

  useEffect(() => {
    initCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []); // Only run once on mount

  // Barcode scanning loop
  useEffect(() => {
    if (!videoRef.current || !stream || !isScanning) return;
    
    let isMounted = true;
    
    const scanLoop = async () => {
      if (!isMounted || !videoRef.current) return;
      try {
        const result = await reader.decodeFromVideoElement(videoRef.current);
        if (result && isMounted) {
          handleBarcodeDetected(result.getText());
        }
      } catch (err) {
        // ZXing throws when it doesn't find a barcode, just ignore
      }
      if (isMounted && isScanning) {
        requestAnimationFrame(scanLoop);
      }
    };
    
    scanLoop();
    
    return () => {
      isMounted = false;
    };
  }, [isScanning, stream, reader]);

  const handleBarcodeDetected = (barcode: string) => {
    setIsScanning(false);
    toast({ title: "Barcode Detected!", description: barcode });
    scanMutation.mutate(
      { data: { barcode } },
      {
        onSuccess: (data) => {
          setScannedPrefill({ name: data.suggestedName, sku: barcode });
          setIsModalOpen(true);
        },
        onError: () => {
          setScannedPrefill({ sku: barcode, name: "" });
          setIsModalOpen(true);
        }
      }
    );
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg").split(",")[1];
    
    setIsScanning(false);
    
    scanMutation.mutate(
      { data: { imageBase64: base64 } },
      {
        onSuccess: (data) => {
          setScannedPrefill({ name: data.suggestedName });
          setIsModalOpen(true);
        },
        onError: () => {
          toast({ title: "Failed to analyze image", variant: "destructive" });
        }
      }
    );
  };

  const toggleCamera = () => {
    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    initCamera(devices[nextIndex].deviceId);
  };

  if (cameraError) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
          <CameraIcon className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Camera Unavailable</h2>
          <p className="text-muted-foreground">{cameraError}</p>
          <p className="text-sm text-muted-foreground">You can still add products manually from the Dashboard.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center justify-between p-4 text-white z-10 bg-gradient-to-b from-black/60 to-transparent">
          <h1 className="text-xl font-semibold">Scanner</h1>
          {devices.length > 1 && (
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={toggleCamera}>
              <FlipHorizontal className="w-6 h-6" />
            </Button>
          )}
        </div>
        
        <div className="relative flex-1 overflow-hidden flex items-center justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scanner Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col">
            <div className="flex-1 bg-black/40" />
            <div className="flex">
              <div className="flex-1 bg-black/40" />
              <div className="w-64 h-64 border-2 border-primary/70 rounded-xl relative">
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br-xl" />
                
                {isScanning && (
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/80 shadow-[0_0_8px_rgba(var(--primary),0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                )}
              </div>
              <div className="flex-1 bg-black/40" />
            </div>
            <div className="flex-1 bg-black/40" />
          </div>
          
          {scanMutation.isPending && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="font-medium animate-pulse">Analyzing with AI...</p>
            </div>
          )}
        </div>
        
        <div className="p-6 pb-8 bg-black z-10 flex flex-col items-center justify-center gap-6">
          <div className="flex justify-center gap-8 items-center w-full max-w-sm">
            <Button 
              variant="ghost" 
              className={`flex-col h-auto p-3 text-white ${isScanning ? 'text-primary' : 'text-white/60 hover:text-white'}`}
              onClick={() => setIsScanning(!isScanning)}
            >
              <div className={`p-3 rounded-full mb-2 ${isScanning ? 'bg-primary/20' : 'bg-white/10'}`}>
                <CameraIcon className="w-6 h-6" />
              </div>
              <span className="text-xs">Scan Barcode</span>
            </Button>
            
            <Button 
              className="w-20 h-20 rounded-full border-4 border-white/20 bg-white hover:bg-white/90 shadow-lg shrink-0 p-0"
              onClick={takePhoto}
              disabled={scanMutation.isPending}
            >
              <div className="w-16 h-16 rounded-full border border-black/10 m-auto" />
            </Button>
            
            <Button 
              variant="ghost" 
              className="flex-col h-auto p-3 text-white/60 hover:text-white"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <div className="p-3 rounded-full bg-white/10 mb-2">
                <ImageIcon className="w-6 h-6" />
              </div>
              <span className="text-xs">Gallery</span>
              <input type="file" id="file-upload" className="hidden" accept="image/*" />
            </Button>
          </div>
          <p className="text-white/50 text-xs text-center font-medium max-w-[250px]">
            Scan a barcode automatically or capture a photo for AI product recognition
          </p>
        </div>
      </div>
      
      {isModalOpen && (
        <AddProductModal 
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setScannedPrefill(null);
          }}
          initialValues={scannedPrefill}
        />
      )}
    </AppLayout>
  );
}
