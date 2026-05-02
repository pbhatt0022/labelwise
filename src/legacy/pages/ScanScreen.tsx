import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ShimmerLoader from "@/components/ShimmerLoader";
import BottomNav from "@/components/BottomNav";
import { Camera, X, Image } from "lucide-react";

const ScanScreen = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => navigate("/results"), 2000);
  };

  if (scanning) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <ShimmerLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col pb-[80px]">
      {/* Camera viewport mock */}
      <div className="flex-1 relative flex flex-col items-center justify-center px-[24px]">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-[48px] left-[24px] w-[44px] h-[44px] rounded-full bg-primary-foreground/10 flex items-center justify-center"
        >
          <X size={20} className="text-primary-foreground" />
        </button>

        {/* Viewfinder */}
        <div className="w-[280px] h-[200px] border-2 border-accent/50 rounded-2xl flex items-center justify-center mb-[32px]">
          <div className="text-center">
            <Camera size={40} className="text-primary-foreground/40 mx-auto mb-[8px]" />
            <p className="text-sm text-primary-foreground/50">Position the label here</p>
          </div>
        </div>

        <p className="text-sm text-primary-foreground/60 text-center mb-[24px]">
          Align the ingredients list within the frame
        </p>

        <div className="flex gap-[16px] w-full max-w-xs">
          <Button variant="lime" size="lg" className="flex-1" onClick={handleScan}>
            <Camera size={20} /> Capture
          </Button>
          <Button variant="outline" size="icon" className="border-primary-foreground/20 text-primary-foreground">
            <Image size={20} />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ScanScreen;
