import { useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ShimmerLoader from "@/components/ShimmerLoader";
import BottomNav from "@/components/BottomNav";
import { useAppState } from "@/context/AppStateContext";
import { analyzeIngredients } from "@/lib/analysis";
import { TesseractOcrAdapter } from "@/lib/ocr";
import { Camera, LoaderCircle, X, Image as ImageIcon, ScanText, Sparkles, ScanSearch, Crop, Expand } from "lucide-react";

const demoIngredients =
  "Oats, High Fructose Corn Syrup, Whey Protein Concentrate, Soy Lecithin, Sodium Benzoate, Natural Flavors, INS 621.";

const createUuidFallback = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

const createScanId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : createUuidFallback());

const ocrAdapter = new TesseractOcrAdapter();

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FULL_IMAGE_SELECTION: SelectionRect = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

const ScanScreen = () => {
  const navigate = useNavigate();
  const { draft, profile, updateDraft, resetDraft, saveScan } = useAppState();
  const [scanning, setScanning] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [ocrStatus, setOcrStatus] = useState<"idle" | "extracting" | "success" | "error">(draft.ocrStatus ?? "idle");
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>(draft.ocrConfidence);
  const [ocrError, setOcrError] = useState<string>(draft.ocrError ?? "");
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [ocrSource, setOcrSource] = useState<"camera" | "upload" | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [saveError, setSaveError] = useState("");
  const ingredientTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const imageCanvasRef = useRef<HTMLDivElement>(null);

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>, source: "camera" | "upload") => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Could not read the selected image."));
        reader.readAsDataURL(file);
      });

      updateDraft({
        imageName: file.name,
        imagePreviewUrl: preview,
        ocrStatus: "idle",
        ocrError: "",
        ocrConfidence: undefined,
        ocrSourceImageName: file.name,
        ocrText: "",
      });
      setUploadError("");
      setSelectedFile(file);
      setSelection(FULL_IMAGE_SELECTION);
      setOcrStatus("idle");
      setOcrError("");
      setOcrWarnings([]);
      setOcrConfidence(undefined);
      setOcrSource(source);
    } catch {
      setUploadError("We could not load that image. Please try another one or paste the ingredients manually.");
      setOcrStatus("error");
      setOcrError("OCR could not process this image. Please try another photo or paste the ingredients manually.");
      setOcrWarnings([]);
      updateDraft({
        ocrStatus: "error",
        ocrError: "OCR could not process this image. Please try another photo or paste the ingredients manually.",
        ocrConfidence: undefined,
      });
    } finally {
      event.target.value = "";
    }
  };

  const clamp = (value: number) => Math.max(0, Math.min(1, value));

  const getRelativePoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = imageCanvasRef.current?.getBoundingClientRect();
    if (!bounds) return null;

    const x = clamp((event.clientX - bounds.left) / bounds.width);
    const y = clamp((event.clientY - bounds.top) / bounds.height);
    return { x, y };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draft.imagePreviewUrl) return;
    const point = getRelativePoint(event);
    if (!point) return;

    event.preventDefault();
    setDragStart(point);
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const point = getRelativePoint(event);
    if (!point) return;

    event.preventDefault();
    const nextSelection = {
      x: Math.min(dragStart.x, point.x),
      y: Math.min(dragStart.y, point.y),
      width: Math.abs(point.x - dragStart.x),
      height: Math.abs(point.y - dragStart.y),
    };
    setSelection(nextSelection);
  };

  const handlePointerUp = () => {
    setDragStart(null);
  };

  const cropSelectedRegion = async (file: File, region: SelectionRect) => {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new window.Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Could not load the selected image for cropping."));
        element.src = imageUrl;
      });

      const sx = Math.max(0, Math.floor(region.x * image.width));
      const sy = Math.max(0, Math.floor(region.y * image.height));
      const sw = Math.max(1, Math.floor(region.width * image.width));
      const sh = Math.max(1, Math.floor(region.height * image.height));

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not prepare the selected region for OCR.");
      }

      context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not crop the selected region."));
        }, "image/jpeg", 0.95);
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const runOcr = async (input: Blob | File, emptyMessage: string) => {
    const ocrResult = await ocrAdapter.extractText(input);
    const extractedText = ocrResult.text.trim();

    updateDraft({
      ingredientText: extractedText || draft.ingredientText,
      ocrText: extractedText,
      ocrStatus: extractedText ? "success" : "error",
      ocrConfidence: ocrResult.confidence,
      ocrError: extractedText ? "" : emptyMessage,
    });

    setOcrStatus(extractedText ? "success" : "error");
    setOcrConfidence(ocrResult.confidence);
    setOcrWarnings(ocrResult.warnings ?? []);
    setOcrError(extractedText ? "" : emptyMessage);

    window.setTimeout(() => ingredientTextareaRef.current?.focus(), 50);
  };

  const handleExtractSelectedText = async () => {
    if (!selectedFile) {
      setOcrError("Add a photo before extracting text.");
      setOcrStatus("error");
      return;
    }

    if (!selection || selection.width < 0.04 || selection.height < 0.04) {
      setOcrError("Drag over the ingredients area, or use the full-image OCR option.");
      setOcrStatus("error");
      return;
    }

    try {
      setOcrStatus("extracting");
      setOcrError("");
      setOcrWarnings([]);
      updateDraft({
        ocrStatus: "extracting",
        ocrError: "",
        ocrConfidence: undefined,
      });

      const croppedImage = await cropSelectedRegion(selectedFile, selection);
      await runOcr(croppedImage, "We could not read enough text from the selected area. Try a tighter selection or use the full image.");
    } catch {
      setOcrStatus("error");
      setOcrError("OCR could not process the selected area. Try another selection or paste the ingredients manually.");
      setOcrWarnings([]);
      updateDraft({
        ocrStatus: "error",
        ocrError: "OCR could not process the selected area. Try another selection or paste the ingredients manually.",
        ocrConfidence: undefined,
      });
    }
  };

  const handleExtractFullImageText = async () => {
    if (!selectedFile) {
      setOcrError("Add a photo before extracting text.");
      setOcrStatus("error");
      return;
    }

    try {
      setSelection(FULL_IMAGE_SELECTION);
      setOcrStatus("extracting");
      setOcrError("");
      setOcrWarnings([]);
      updateDraft({
        ocrStatus: "extracting",
        ocrError: "",
        ocrConfidence: undefined,
      });

      await runOcr(selectedFile, "We could not read enough text from the full image. You can still paste or edit the ingredients manually.");
    } catch {
      setOcrStatus("error");
      setOcrError("OCR could not process the full image. Try selecting just the ingredients area or paste the text manually.");
      setOcrWarnings([]);
      updateDraft({
        ocrStatus: "error",
        ocrError: "OCR could not process the full image. Try selecting just the ingredients area or paste the text manually.",
        ocrConfidence: undefined,
      });
    }
  };

  const handleAnalyze = async () => {
    setScanning(true);
    setSaveError("");

    const analysis = analyzeIngredients(draft.ingredientText, profile);

    await new Promise((resolve) => window.setTimeout(resolve, 900));

    const record = {
      id: createScanId(),
      productName: draft.productName.trim() || "Untitled Product",
      brandName: draft.brandName.trim() || undefined,
      ingredientText: draft.ingredientText.trim(),
      imageName: draft.imageName,
      createdAt: new Date().toISOString(),
      ocrText: draft.ocrText,
      ocrConfidence: draft.ocrConfidence,
      ocrSource,
      ocrStatusAtSave: draft.ocrStatus,
      analysis,
      profileSnapshot: profile,
      folderId: undefined,
      userNote: undefined,
    };

    const result = await saveScan(record);
    if (!result.ok) {
      setScanning(false);
      setSaveError(result.error ?? "We could not save this scan to your account.");
      return;
    }

    resetDraft();
    navigate("/results");
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
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleImageSelection(event, "camera")}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleImageSelection(event, "upload")}
      />

      <div className="flex-1 relative px-[24px] pt-[96px] pb-[32px]">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-[48px] left-[24px] w-[44px] h-[44px] rounded-full bg-primary-foreground/10 flex items-center justify-center"
        >
          <X size={20} className="text-primary-foreground" />
        </button>

        <div className="mx-auto max-w-md space-y-[20px]">
          <div className="rounded-[28px] border border-primary-foreground/10 bg-primary-foreground/5 p-[20px]">
            <div className="mb-[16px] flex items-center gap-[10px]">
              <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-accent/20">
                <ScanText size={18} className="text-accent" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-primary-foreground">Scan or upload a label</h1>
                <p className="text-sm text-primary-foreground/65">
                  Upload the label, drag over just the ingredients, then extract text.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[12px]">
              <Button variant="lime" size="lg" className="w-full" onClick={() => cameraInputRef.current?.click()}>
                <Camera size={18} /> Camera
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => uploadInputRef.current?.click()}
              >
                <ImageIcon size={18} /> Upload
              </Button>
            </div>

            <div className="mt-[16px] rounded-2xl border border-dashed border-primary-foreground/20 bg-primary-foreground/5 p-[12px]">
              {draft.imagePreviewUrl ? (
                <div className="space-y-[10px]">
                  <div
                    ref={imageCanvasRef}
                    className="relative overflow-hidden rounded-xl bg-primary-foreground/5 touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  >
                    <img
                      src={draft.imagePreviewUrl}
                      alt="Selected food label"
                      className="max-h-[320px] w-full rounded-xl object-contain"
                    />
                    {selection && (
                      <div
                        className="absolute border-2 border-accent bg-accent/20 rounded-[8px] pointer-events-none"
                        style={{
                          left: `${selection.x * 100}%`,
                          top: `${selection.y * 100}%`,
                          width: `${selection.width * 100}%`,
                          height: `${selection.height * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-primary-foreground/70">{draft.imageName}</p>
                  <p className="text-xs text-primary-foreground/70">
                    The whole image is selected by default. Drag a smaller box only if you want to focus on the ingredients block.
                  </p>
                  <div className="grid gap-[10px] sm:grid-cols-2">
                    <Button
                      variant="lime"
                      size="lg"
                      className="w-full"
                      onClick={handleExtractFullImageText}
                      disabled={ocrStatus === "extracting"}
                    >
                      {ocrStatus === "extracting" ? (
                        <>
                          <LoaderCircle size={16} className="animate-spin" /> Reading image...
                        </>
                      ) : (
                        <>
                          <Expand size={18} /> Use Full Image
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                      onClick={handleExtractSelectedText}
                      disabled={!selection || selection.width < 0.04 || selection.height < 0.04 || ocrStatus === "extracting"}
                    >
                      <Crop size={18} /> Extract Selection
                    </Button>
                  </div>
                  <button
                    onClick={() => setSelection(FULL_IMAGE_SELECTION)}
                    className="text-xs font-medium text-accent"
                    type="button"
                  >
                    Reset selection to the full image
                  </button>
                  {ocrStatus === "extracting" && (
                    <div className="rounded-xl bg-primary-foreground/10 p-[12px] text-sm text-primary-foreground">
                      <div className="flex items-center gap-[8px]">
                        <LoaderCircle size={16} className="animate-spin" />
                        Reading the label image...
                      </div>
                    </div>
                  )}
                  {ocrStatus === "success" && (
                    <div className="rounded-xl bg-primary-foreground/10 p-[12px] text-sm text-primary-foreground space-y-[4px]">
                      <p>Text extracted. Please review before analysis.</p>
                      {typeof ocrConfidence === "number" && (
                        <p className="text-xs text-primary-foreground/75">OCR confidence: {Math.round(ocrConfidence)}%</p>
                      )}
                    </div>
                  )}
                  {ocrStatus === "error" && ocrError && (
                    <div className="rounded-xl bg-primary-foreground/10 p-[12px] text-sm text-primary-foreground">
                      {ocrError}
                    </div>
                  )}
                  {ocrWarnings.length > 0 && (
                    <div className="rounded-xl bg-primary-foreground/10 p-[12px] text-xs text-primary-foreground/80 space-y-[4px]">
                      {ocrWarnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[220px] flex-col items-center justify-center text-center">
                  <Camera size={36} className="text-primary-foreground/35" />
                  <p className="mt-[12px] text-sm text-primary-foreground/70">No image selected yet</p>
                  <p className="mt-[6px] text-xs text-primary-foreground/55">
                    The demo still works if you skip the image and paste ingredients directly.
                  </p>
                </div>
              )}
            </div>

            {uploadError && <p className="mt-[12px] text-sm text-primary-foreground">{uploadError}</p>}
          </div>

          <div className="rounded-[28px] bg-background p-[20px] shadow-elevated">
            <div className="grid gap-[12px] sm:grid-cols-2">
              <div>
                <label className="mb-[8px] block text-sm font-medium text-foreground">Product name</label>
                <Input
                  value={draft.productName}
                  placeholder="e.g. Masala Oats"
                  onChange={(event) => updateDraft({ productName: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-[8px] block text-sm font-medium text-foreground">Brand (optional)</label>
                <Input
                  value={draft.brandName}
                  placeholder="e.g. MTR"
                  onChange={(event) => updateDraft({ brandName: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-[16px]">
              <div className="mb-[8px] flex items-center justify-between gap-[12px]">
                <label className="block text-sm font-medium text-foreground">Ingredient list</label>
                <button
                  onClick={() =>
                    updateDraft({
                      productName: draft.productName || "Demo Snack",
                      brandName: draft.brandName || "Sample",
                      ingredientText: demoIngredients,
                    })
                  }
                  className="inline-flex items-center gap-[6px] text-sm font-medium text-accent"
                >
                  <Sparkles size={14} /> Use demo ingredients
                </button>
              </div>
              <Textarea
                ref={ingredientTextareaRef}
                className="min-h-[180px] rounded-2xl border-input bg-secondary/35 px-[16px] py-[14px]"
                value={draft.ingredientText}
                placeholder="Paste the ingredient list here. Example: oats, maltodextrin, soy lecithin, sodium benzoate..."
                onChange={(event) =>
                  updateDraft({
                    ingredientText: event.target.value,
                    ocrText: event.target.value,
                  })
                }
              />
              <p className="mt-[8px] text-xs text-muted-foreground">
                After you select the ingredients area, OCR will fill this field. You can edit the text before analysis.
              </p>
            </div>

            <Button
              variant="lime"
              size="lg"
              className="mt-[20px] w-full"
              onClick={handleAnalyze}
              disabled={!draft.ingredientText.trim()}
            >
              Analyze Ingredients
            </Button>
            {saveError && <p className="mt-[10px] text-sm text-destructive">{saveError}</p>}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ScanScreen;
