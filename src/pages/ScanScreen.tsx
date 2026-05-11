import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import ShimmerLoader from "@/components/ShimmerLoader";
import { useAppState } from "@/context/AppStateContext";
import { demoScanExamples } from "@/data/demoScans";
import { analyzeLabel } from "@/lib/labelAnalysis";
import { hasMeaningfulNutritionFacts, nutritionFieldDefinitions, parseNutritionFactsFromText } from "@/lib/nutrition";
import { TesseractOcrAdapter } from "@/lib/ocr";
import type { NutritionFacts, OcrStatus } from "@/lib/types";
import { Camera, LoaderCircle, X, Image as ImageIcon, Sparkles, Crop, Expand } from "lucide-react";

const createUuidFallback = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

const createScanId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : createUuidFallback());

const ocrAdapter = new TesseractOcrAdapter();

const normalizeDisplayedOcrWarnings = (warnings: string[]) =>
  warnings.map((warning) =>
    warning.includes("tried Gemini Vision instead")
      ? warning.replace("tried Gemini Vision instead.", "used local OCR instead.")
      : warning,
  );

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

const readImagePreview = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });

const ScanScreen = () => {
  const navigate = useNavigate();
  const { draft, profile, updateDraft, resetDraft, saveScan } = useAppState();
  const [scanning, setScanning] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>(draft.ocrStatus ?? "idle");
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>(draft.ocrConfidence);
  const [ocrError, setOcrError] = useState<string>(draft.ocrError ?? "");
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [ocrProvider, setOcrProvider] = useState<string | undefined>(undefined);
  const [ocrSource, setOcrSource] = useState<"camera" | "upload" | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [nutritionUploadError, setNutritionUploadError] = useState("");
  const [nutritionOcrStatus, setNutritionOcrStatus] = useState<OcrStatus>(draft.nutritionOcrStatus ?? "idle");
  const [nutritionOcrConfidence, setNutritionOcrConfidence] = useState<number | undefined>(draft.nutritionOcrConfidence);
  const [nutritionOcrError, setNutritionOcrError] = useState<string>(draft.nutritionOcrError ?? "");
  const [nutritionOcrWarnings, setNutritionOcrWarnings] = useState<string[]>([]);
  const [nutritionPrefillCount, setNutritionPrefillCount] = useState(0);
  const [selectedNutritionFile, setSelectedNutritionFile] = useState<File | null>(null);
  const [nutritionSelection, setNutritionSelection] = useState<SelectionRect | null>(null);
  const [nutritionDragStart, setNutritionDragStart] = useState<{ x: number; y: number } | null>(null);
  const [saveError, setSaveError] = useState("");
  const ingredientTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const nutritionCameraInputRef = useRef<HTMLInputElement>(null);
  const nutritionUploadInputRef = useRef<HTMLInputElement>(null);
  const imageCanvasRef = useRef<HTMLDivElement>(null);
  const nutritionImageCanvasRef = useRef<HTMLDivElement>(null);
  const nutritionFacts = draft.nutritionFacts ?? {};
  const nutritionSectionEnabled =
    draft.includeNutritionDetails ?? Boolean(draft.nutritionImagePreviewUrl || draft.nutritionOcrText || hasMeaningfulNutritionFacts(draft.nutritionFacts));

  useEffect(() => {
    resetDraft();
    setSelectedFile(null);
    setSelection(null);
    setDragStart(null);
    setUploadError("");
    setOcrStatus("idle");
    setOcrConfidence(undefined);
    setOcrError("");
    setOcrWarnings([]);
    setOcrSource(undefined);
    setSelectedNutritionFile(null);
    setNutritionSelection(null);
    setNutritionDragStart(null);
    setNutritionUploadError("");
    setNutritionOcrStatus("idle");
    setNutritionOcrConfidence(undefined);
    setNutritionOcrError("");
    setNutritionOcrWarnings([]);
    setNutritionPrefillCount(0);
    setSaveError("");
  }, []);

  const enableNutritionSection = () => {
    updateDraft({ includeNutritionDetails: true });
    if (!nutritionSelection && (draft.nutritionImagePreviewUrl || selectedNutritionFile)) {
      setNutritionSelection(FULL_IMAGE_SELECTION);
    }
  };

  const skipNutritionSection = () => {
    updateDraft({ includeNutritionDetails: false });
    setNutritionUploadError("");
    setNutritionOcrStatus("idle");
    setNutritionOcrError("");
    setNutritionOcrWarnings([]);
    setNutritionOcrConfidence(undefined);
    setNutritionPrefillCount(0);
    setNutritionSelection(draft.nutritionImagePreviewUrl || selectedNutritionFile ? FULL_IMAGE_SELECTION : null);
  };

  const updateNutritionFact = (key: keyof NutritionFacts, value: string) => {
    const nextNutritionFacts: NutritionFacts = { ...nutritionFacts };

    if (key === "servingSize") {
      nextNutritionFacts.servingSize = value;
    } else {
      const parsed = Number(value);
      nextNutritionFacts[key] = value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    }

    updateDraft({ includeNutritionDetails: true, nutritionFacts: nextNutritionFacts });
  };

  const applyDemoExample = (exampleId: string) => {
    const example = demoScanExamples.find((candidate) => candidate.id === exampleId);
    if (!example) return;

    updateDraft({
      ...example.draft,
      includeNutritionDetails: Boolean(example.draft.nutritionFacts),
      imageName: undefined,
      imagePreviewUrl: undefined,
      ocrStatus: "idle",
      ocrText: example.draft.ingredientText,
      ocrConfidence: undefined,
      ocrError: "",
      ocrSourceImageName: undefined,
      nutritionImageName: undefined,
      nutritionImagePreviewUrl: undefined,
      nutritionOcrStatus: "idle",
      nutritionOcrText: "",
      nutritionOcrConfidence: undefined,
      nutritionOcrError: "",
      nutritionOcrSourceImageName: undefined,
    });
    setSelectedFile(null);
    setSelection(null);
    setDragStart(null);
    setSelectedNutritionFile(null);
    setNutritionSelection(null);
    setNutritionDragStart(null);
    setUploadError("");
    setOcrStatus("idle");
    setOcrConfidence(undefined);
    setOcrError("");
    setOcrWarnings([]);
    setOcrSource(undefined);
    setNutritionUploadError("");
    setNutritionOcrStatus("idle");
    setNutritionOcrConfidence(undefined);
    setNutritionOcrError("");
    setNutritionOcrWarnings([]);
    setNutritionPrefillCount(0);
  };

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>, source: "camera" | "upload") => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const preview = await readImagePreview(file);

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

  const handleNutritionImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const preview = await readImagePreview(file);

      updateDraft({
        includeNutritionDetails: true,
        nutritionImageName: file.name,
        nutritionImagePreviewUrl: preview,
        nutritionOcrStatus: "idle",
        nutritionOcrError: "",
        nutritionOcrConfidence: undefined,
        nutritionOcrSourceImageName: file.name,
        nutritionOcrText: "",
      });
      setNutritionUploadError("");
      setSelectedNutritionFile(file);
      setNutritionSelection(FULL_IMAGE_SELECTION);
      setNutritionOcrStatus("idle");
      setNutritionOcrError("");
      setNutritionOcrWarnings([]);
      setNutritionOcrConfidence(undefined);
      setNutritionPrefillCount(0);
    } catch {
      setNutritionUploadError("We could not load that nutrition image. Please try another one or enter the values manually.");
      setNutritionOcrStatus("error");
      setNutritionOcrError("Nutrition OCR could not process this image. Please try another photo or enter the values manually.");
      setNutritionOcrWarnings([]);
      updateDraft({
        nutritionOcrStatus: "error",
        nutritionOcrError: "Nutrition OCR could not process this image. Please try another photo or enter the values manually.",
        nutritionOcrConfidence: undefined,
      });
    } finally {
      event.target.value = "";
    }
  };

  const useCurrentImageForNutrition = () => {
    if (!selectedFile || !draft.imagePreviewUrl) {
      setNutritionUploadError("Add the main label photo first, then reuse it for nutrition.");
      return;
    }

    updateDraft({
      includeNutritionDetails: true,
      nutritionImageName: draft.imageName ?? selectedFile.name,
      nutritionImagePreviewUrl: draft.imagePreviewUrl,
      nutritionOcrStatus: "idle",
      nutritionOcrError: "",
      nutritionOcrConfidence: undefined,
      nutritionOcrSourceImageName: draft.imageName ?? selectedFile.name,
      nutritionOcrText: "",
    });
    setSelectedNutritionFile(selectedFile);
    setNutritionSelection(FULL_IMAGE_SELECTION);
    setNutritionUploadError("");
    setNutritionOcrStatus("idle");
    setNutritionOcrError("");
    setNutritionOcrWarnings([]);
    setNutritionOcrConfidence(undefined);
    setNutritionPrefillCount(0);
  };

  const clamp = (value: number) => Math.max(0, Math.min(1, value));

  const getRelativePoint = (canvasRef: RefObject<HTMLDivElement>, event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return null;

    const x = clamp((event.clientX - bounds.left) / bounds.width);
    const y = clamp((event.clientY - bounds.top) / bounds.height);
    return { x, y };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draft.imagePreviewUrl) return;
    const point = getRelativePoint(imageCanvasRef, event);
    if (!point) return;

    event.preventDefault();
    setDragStart(point);
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const point = getRelativePoint(imageCanvasRef, event);
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

  const handleNutritionPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draft.nutritionImagePreviewUrl) return;
    const point = getRelativePoint(nutritionImageCanvasRef, event);
    if (!point) return;

    event.preventDefault();
    setNutritionDragStart(point);
    setNutritionSelection({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handleNutritionPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!nutritionDragStart) return;
    const point = getRelativePoint(nutritionImageCanvasRef, event);
    if (!point) return;

    event.preventDefault();
    const nextSelection = {
      x: Math.min(nutritionDragStart.x, point.x),
      y: Math.min(nutritionDragStart.y, point.y),
      width: Math.abs(point.x - nutritionDragStart.x),
      height: Math.abs(point.y - nutritionDragStart.y),
    };
    setNutritionSelection(nextSelection);
  };

  const handleNutritionPointerUp = () => {
    setNutritionDragStart(null);
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
    const ocrResult = await ocrAdapter.extractText(input, { kind: "ingredients" });
    const extractedText = ocrResult.text.trim();
    const normalizedWarnings = normalizeDisplayedOcrWarnings(ocrResult.warnings ?? []);

    updateDraft({
      ingredientText: extractedText,
      ocrText: extractedText,
      ocrStatus: extractedText ? "success" : "error",
      ocrConfidence: ocrResult.confidence,
      ocrError: extractedText ? "" : emptyMessage,
    });

    setOcrStatus(extractedText ? "success" : "error");
    setOcrConfidence(ocrResult.confidence);
    setOcrWarnings(normalizedWarnings);
    setOcrProvider(ocrResult.provider);
    setOcrError(extractedText ? "" : emptyMessage);

    window.setTimeout(() => ingredientTextareaRef.current?.focus(), 50);
  };

  const runNutritionOcr = async (input: Blob | File, emptyMessage: string) => {
    const ocrResult = await ocrAdapter.extractText(input, { kind: "nutrition" });
    const extractedText = ocrResult.text.trim();
    const geminiNutritionFacts = ocrResult.nutritionFacts;
    const parseResult = geminiNutritionFacts ? undefined : parseNutritionFactsFromText(extractedText);
    const resolvedNutritionFacts = geminiNutritionFacts ?? parseResult?.facts;
    const resolvedMatchedFields = geminiNutritionFacts
      ? Object.entries(geminiNutritionFacts).filter(([, value]) => (typeof value === "number" ? Number.isFinite(value) : Boolean(value))).map(([key]) => key)
      : parseResult?.matchedFields ?? [];
    const combinedWarnings = [...normalizeDisplayedOcrWarnings(ocrResult.warnings ?? []), ...(parseResult?.warnings ?? [])];
    const hasPrefilledFacts = resolvedMatchedFields.length > 0 && resolvedNutritionFacts;
    const nextStatus: OcrStatus = extractedText && hasPrefilledFacts ? "success" : "error";
    const nextError = extractedText
      ? hasPrefilledFacts
        ? ""
        : "We read the image text, but could not confidently map the nutrition rows. Please review the manual fields below."
      : emptyMessage;

    updateDraft({
      includeNutritionDetails: true,
      nutritionFacts: hasPrefilledFacts ? resolvedNutritionFacts : undefined,
      nutritionOcrText: extractedText,
      nutritionOcrStatus: nextStatus,
      nutritionOcrConfidence: ocrResult.confidence,
      nutritionOcrError: nextError,
    });

    setNutritionOcrStatus(nextStatus);
    setNutritionOcrConfidence(ocrResult.confidence);
    setNutritionOcrWarnings(combinedWarnings);
    setNutritionPrefillCount(resolvedMatchedFields.length);
    setNutritionOcrError(nextError);
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

  const handleExtractSelectedNutritionText = async () => {
    if (!selectedNutritionFile) {
      setNutritionOcrError("Add a nutrition-panel photo before extracting text.");
      setNutritionOcrStatus("error");
      return;
    }

    if (!nutritionSelection || nutritionSelection.width < 0.04 || nutritionSelection.height < 0.04) {
      setNutritionOcrError("Drag over the nutrition table, or use the full-image OCR option.");
      setNutritionOcrStatus("error");
      return;
    }

    try {
      setNutritionOcrStatus("extracting");
      setNutritionOcrError("");
      setNutritionOcrWarnings([]);
      updateDraft({
        nutritionOcrStatus: "extracting",
        nutritionOcrError: "",
        nutritionOcrConfidence: undefined,
      });

      const croppedImage = await cropSelectedRegion(selectedNutritionFile, nutritionSelection);
      await runNutritionOcr(croppedImage, "We could not read enough nutrition text from the selected area. Try a tighter selection or use the full image.");
    } catch {
      setNutritionOcrStatus("error");
      setNutritionOcrError("Nutrition OCR could not process the selected area. Try another selection or enter the values manually.");
      setNutritionOcrWarnings([]);
      setNutritionPrefillCount(0);
      updateDraft({
        nutritionOcrStatus: "error",
        nutritionOcrError: "Nutrition OCR could not process the selected area. Try another selection or enter the values manually.",
        nutritionOcrConfidence: undefined,
      });
    }
  };

  const handleExtractFullNutritionText = async () => {
    if (!selectedNutritionFile) {
      setNutritionOcrError("Add a nutrition-panel photo before extracting text.");
      setNutritionOcrStatus("error");
      return;
    }

    try {
      setNutritionSelection(FULL_IMAGE_SELECTION);
      setNutritionOcrStatus("extracting");
      setNutritionOcrError("");
      setNutritionOcrWarnings([]);
      updateDraft({
        nutritionOcrStatus: "extracting",
        nutritionOcrError: "",
        nutritionOcrConfidence: undefined,
      });

      await runNutritionOcr(selectedNutritionFile, "We could not read enough nutrition text from the full image. You can still enter the values manually.");
    } catch {
      setNutritionOcrStatus("error");
      setNutritionOcrError("Nutrition OCR could not process the full image. Try selecting just the nutrition table or enter the values manually.");
      setNutritionOcrWarnings([]);
      setNutritionPrefillCount(0);
      updateDraft({
        nutritionOcrStatus: "error",
        nutritionOcrError: "Nutrition OCR could not process the full image. Try selecting just the nutrition table or enter the values manually.",
        nutritionOcrConfidence: undefined,
      });
    }
  };

  const handleAnalyze = async () => {
    setScanning(true);
    setSaveError("");
    const nextNutritionFacts = nutritionSectionEnabled ? draft.nutritionFacts : undefined;

    try {
      const analysis = analyzeLabel({
        ingredientText: draft.ingredientText,
        profile,
        nutritionFacts: nextNutritionFacts,
      });

      await new Promise((resolve) => window.setTimeout(resolve, 900));

      const record = {
        id: createScanId(),
        productName: draft.productName.trim() || "Untitled Product",
        brandName: draft.brandName.trim() || undefined,
        ingredientText: draft.ingredientText.trim(),
        nutritionFacts: nextNutritionFacts ? analysis.nutritionFacts : undefined,
        imageName: draft.imageName,
        createdAt: new Date().toISOString(),
        ocrText: draft.ocrText,
        ocrConfidence: draft.ocrConfidence,
        ocrSource,
        ocrStatusAtSave: draft.ocrStatus,
        analysis,
        profileSnapshot: profile,
        folderIds: [],
        userNote: undefined,
      };

      const result = await saveScan(record);

      if (!result.ok) {
        setScanning(false);
        setSaveError(result.error ?? "We could not save this scan to your account.");
        return;
      }

      if (result.info) {
        toast("Saved scan", {
          description: result.info,
        });
      }

      resetDraft();
      navigate("/results");
    } catch (error) {
      console.error("Scan analysis failed", error);
      setScanning(false);
      setSaveError(error instanceof Error ? error.message : "We could not finish this scan. Please try again.");
    }
  };

  if (scanning) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <ShimmerLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageSelection(e, "camera")} />
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelection(e, "upload")} />
      <input ref={nutritionCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleNutritionImageSelection} />
      <input ref={nutritionUploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleNutritionImageSelection} />

      {/* Header */}
      <div className="bg-primary px-[24px] pb-[28px] pt-[56px] rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-[20px] flex h-[44px] w-[44px] items-center justify-center rounded-full bg-primary-foreground/10"
        >
          <X size={20} className="text-primary-foreground" />
        </button>
        <h1 className="text-[22px] font-bold text-primary-foreground">Analyze a label</h1>
        <p className="mt-[4px] text-sm text-primary-foreground/60">
          Photo or paste the ingredient list, then tap Analyze.
        </p>
      </div>

      <div className="px-[24px] -mt-[20px] space-y-[12px] pb-[32px]">

        {/* Step 1 — Ingredient list */}
        <div className="rounded-2xl bg-card p-[20px] shadow-card space-y-[14px]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Step 1 — Ingredient list
          </p>

          <div className="grid grid-cols-2 gap-[10px]">
            <Button variant="lime" size="default" className="w-full" onClick={() => cameraInputRef.current?.click()}>
              <Camera size={16} /> Camera
            </Button>
            <Button variant="outline" size="default" className="w-full" onClick={() => uploadInputRef.current?.click()}>
              <ImageIcon size={16} /> Upload photo
            </Button>
          </div>

          {draft.imagePreviewUrl && (
            <div className="space-y-[10px]">
              <div
                ref={imageCanvasRef}
                className="relative overflow-hidden rounded-xl bg-secondary/20 touch-none cursor-crosshair"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <img
                  src={draft.imagePreviewUrl}
                  alt="Selected food label"
                  className="max-h-[280px] w-full rounded-xl object-contain"
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
              <p className="text-[11px] text-muted-foreground">Drag on the image to crop to just the ingredients, or read the whole image.</p>
              <div className="flex gap-[8px]">
                <Button variant="lime" size="default" className="flex-1" onClick={handleExtractFullImageText} disabled={ocrStatus === "extracting"}>
                  {ocrStatus === "extracting"
                    ? <><LoaderCircle size={15} className="animate-spin" /> Reading...</>
                    : <><Expand size={15} /> Read image</>}
                </Button>
                {selection && selection.width >= 0.04 && selection.height >= 0.04 && (
                  <Button variant="outline" size="default" onClick={handleExtractSelectedText} disabled={ocrStatus === "extracting"}>
                    <Crop size={15} /> Crop
                  </Button>
                )}
              </div>
              {ocrStatus === "success" && (
                <p className="text-xs text-muted-foreground">
                  ✓ Text extracted · Review the field below before analyzing
                  {typeof ocrConfidence === "number" ? ` · ${Math.round(ocrConfidence)}% confidence` : ""}
                </p>
              )}
              {ocrStatus === "error" && ocrError && <p className="text-sm text-muted-foreground">{ocrError}</p>}
              {ocrWarnings.length > 0 && <div className="space-y-[2px]">{ocrWarnings.map((w) => <p key={w} className="text-xs text-muted-foreground">{w}</p>)}</div>}
              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            </div>
          )}

          {!draft.imagePreviewUrl && (
            <div className="flex items-center gap-[12px]">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or paste below</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          <Textarea
            ref={ingredientTextareaRef}
            className="min-h-[140px] rounded-2xl border-input bg-secondary/35 px-[16px] py-[14px] text-sm"
            value={draft.ingredientText}
            placeholder="Ingredients: whole grain oats, sugar, palm oil..."
            onChange={(e) => updateDraft({ ingredientText: e.target.value, ocrText: e.target.value })}
          />
        </div>

        {/* Step 2 — Product details (optional) */}
        <div className="rounded-2xl bg-card p-[20px] shadow-card space-y-[12px]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Step 2 — Product details <span className="font-normal normal-case">(optional)</span>
          </p>
          <div className="grid gap-[10px] sm:grid-cols-2">
            <div>
              <label className="mb-[6px] block text-sm font-medium text-foreground">Product name</label>
              <Input value={draft.productName} placeholder="e.g. Masala Oats" onChange={(e) => updateDraft({ productName: e.target.value })} />
            </div>
            <div>
              <label className="mb-[6px] block text-sm font-medium text-foreground">Brand</label>
              <Input value={draft.brandName} placeholder="e.g. MTR" onChange={(e) => updateDraft({ brandName: e.target.value })} />
            </div>
          </div>

          {/* Demo examples */}
          <div className="pt-[4px]">
            <p className="mb-[8px] flex items-center gap-[6px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles size={11} className="text-accent" /> Try an example
            </p>
            <div className="flex flex-wrap gap-[8px]">
              {demoScanExamples.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  onClick={() => applyDemoExample(example.id)}
                  className="rounded-full border border-border bg-background px-[14px] py-[7px] text-sm text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
                >
                  {example.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 3 — Nutrition (optional) */}
        <div className="rounded-2xl bg-card p-[20px] shadow-card space-y-[14px]">
          <div className="flex items-center justify-between gap-[12px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Step 3 — Nutrition <span className="font-normal normal-case">(optional)</span>
              </p>
              {!nutritionSectionEnabled && (
                <p className="mt-[3px] text-xs text-muted-foreground">Add for a per-serving breakdown</p>
              )}
            </div>
            {!nutritionSectionEnabled ? (
              <button
                onClick={enableNutritionSection}
                className="shrink-0 rounded-xl bg-secondary px-[14px] py-[8px] text-sm font-medium text-foreground"
              >
                Add
              </button>
            ) : (
              <button onClick={skipNutritionSection} className="shrink-0 text-xs font-medium text-muted-foreground">
                Skip
              </button>
            )}
          </div>

          {nutritionSectionEnabled && (
            <div className="space-y-[14px]">
              <div className="grid grid-cols-3 gap-[8px]">
                <Button variant="lime" size="default" className="w-full" onClick={() => nutritionCameraInputRef.current?.click()}>
                  <Camera size={15} /> Camera
                </Button>
                <Button variant="outline" size="default" className="w-full" onClick={() => nutritionUploadInputRef.current?.click()}>
                  <ImageIcon size={15} /> Upload
                </Button>
                <Button variant="outline" size="default" className="w-full" onClick={useCurrentImageForNutrition} disabled={!draft.imagePreviewUrl || !selectedFile}>
                  Reuse photo
                </Button>
              </div>

              {draft.nutritionImagePreviewUrl && (
                <div className="space-y-[10px]">
                  <div
                    ref={nutritionImageCanvasRef}
                    className="relative overflow-hidden rounded-xl bg-secondary/10 touch-none cursor-crosshair"
                    onPointerDown={handleNutritionPointerDown}
                    onPointerMove={handleNutritionPointerMove}
                    onPointerUp={handleNutritionPointerUp}
                    onPointerLeave={handleNutritionPointerUp}
                  >
                    <img
                      src={draft.nutritionImagePreviewUrl}
                      alt="Nutrition label"
                      className="max-h-[280px] w-full rounded-xl object-contain"
                    />
                    {nutritionSelection && (
                      <div
                        className="absolute border-2 border-accent bg-accent/20 rounded-[8px] pointer-events-none"
                        style={{
                          left: `${nutritionSelection.x * 100}%`,
                          top: `${nutritionSelection.y * 100}%`,
                          width: `${nutritionSelection.width * 100}%`,
                          height: `${nutritionSelection.height * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex gap-[8px]">
                    <Button variant="lime" size="default" className="flex-1" onClick={handleExtractFullNutritionText} disabled={nutritionOcrStatus === "extracting"}>
                      {nutritionOcrStatus === "extracting"
                        ? <><LoaderCircle size={15} className="animate-spin" /> Reading...</>
                        : <><Expand size={15} /> Read image</>}
                    </Button>
                    {nutritionSelection && nutritionSelection.width >= 0.04 && nutritionSelection.height >= 0.04 && (
                      <Button variant="outline" size="default" onClick={handleExtractSelectedNutritionText} disabled={nutritionOcrStatus === "extracting"}>
                        <Crop size={15} /> Crop
                      </Button>
                    )}
                  </div>
                  {nutritionOcrStatus === "success" && (
                    <p className="text-xs text-muted-foreground">
                      ✓ Prefilled {nutritionPrefillCount} field{nutritionPrefillCount === 1 ? "" : "s"} — review below
                      {typeof nutritionOcrConfidence === "number" ? ` · ${Math.round(nutritionOcrConfidence)}% confidence` : ""}
                    </p>
                  )}
                  {nutritionOcrStatus === "error" && nutritionOcrError && <p className="text-sm text-muted-foreground">{nutritionOcrError}</p>}
                  {nutritionOcrWarnings.length > 0 && <div className="space-y-[2px]">{nutritionOcrWarnings.map((w) => <p key={w} className="text-xs text-muted-foreground">{w}</p>)}</div>}
                </div>
              )}

              {nutritionUploadError && <p className="text-sm text-destructive">{nutritionUploadError}</p>}

              <div>
                <p className="mb-[10px] text-sm font-medium text-foreground">Nutrition values</p>
                <div className="grid gap-[10px] sm:grid-cols-2">
                  {nutritionFieldDefinitions.map((field) => (
                    <label key={field.key} className={`text-sm text-muted-foreground ${field.key === "servingSize" ? "sm:col-span-2" : ""}`}>
                      {field.label}
                      <div className="relative mt-[6px]">
                        <Input
                          type={field.inputMode === "text" ? "text" : "number"}
                          min={field.inputMode === "text" ? undefined : "0"}
                          step={field.inputMode === "numeric" ? "1" : field.inputMode === "decimal" ? "0.1" : undefined}
                          inputMode={field.inputMode}
                          value={
                            field.key === "servingSize"
                              ? nutritionFacts.servingSize ?? ""
                              : typeof nutritionFacts[field.key] === "number"
                                ? `${nutritionFacts[field.key]}`
                                : ""
                          }
                          placeholder={field.key === "servingSize" ? "e.g. 30g or 1 bar" : "0"}
                          onChange={(event) => updateNutritionFact(field.key, event.target.value)}
                          className={field.unit ? "pr-[48px]" : undefined}
                        />
                        {field.unit && <span className="pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.unit}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Analyze */}
        <div className="rounded-2xl bg-card p-[20px] shadow-card">
          <Button variant="lime" size="lg" className="w-full" onClick={handleAnalyze} disabled={!draft.ingredientText.trim()}>
            Analyze Label
          </Button>
          {saveError && <p className="mt-[10px] text-sm text-destructive">{saveError}</p>}
          <p className="mt-[12px] text-center text-xs text-muted-foreground">
            Based on your saved profile. Not medical advice.
          </p>
        </div>

      </div>
    </div>
  );
};

export default ScanScreen;
