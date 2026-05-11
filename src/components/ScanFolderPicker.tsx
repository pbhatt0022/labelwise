import { useEffect, useRef, useState } from "react";

import type { ScanFolder } from "@/lib/types";
import { Check, ChevronDown, FolderOpen } from "lucide-react";

interface ScanFolderPickerProps {
  folders: ScanFolder[];
  selectedFolderIds: string[];
  onChange: (folderIds: string[]) => void;
  inputName: string;
}

const ScanFolderPicker = ({ folders, selectedFolderIds, onChange, inputName }: ScanFolderPickerProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleToggle = (folderId: string) => {
    if (selectedFolderIds.includes(folderId)) {
      onChange(selectedFolderIds.filter((id) => id !== folderId));
    } else {
      onChange([...selectedFolderIds, folderId]);
    }
  };

  const label =
    selectedFolderIds.length === 0
      ? "No folder"
      : selectedFolderIds.length === 1
        ? (folders.find((f) => f.id === selectedFolderIds[0])?.name ?? "1 folder")
        : `${selectedFolderIds.length} folders`;

  return (
    <div ref={containerRef} className="relative" id={inputName}>
      <button
        type="button"
        onClick={() => setOpen((c) => !c)}
        className="flex h-[34px] w-full items-center justify-between rounded-full border border-border bg-background px-[14px] text-sm text-foreground transition hover:border-accent/50"
      >
        <span className="flex items-center gap-[8px]">
          <FolderOpen size={13} className="text-muted-foreground shrink-0" />
          <span className={selectedFolderIds.length > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>
            {label}
          </span>
        </span>
        <ChevronDown
          size={13}
          className={`text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[38px] z-20 overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
          {folders.map((folder) => {
            const checked = selectedFolderIds.includes(folder.id);
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => handleToggle(folder.id)}
                className={`flex w-full items-center gap-[10px] px-[14px] py-[10px] text-left text-sm transition-colors ${
                  checked ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <span
                  className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors ${
                    checked ? "border-accent bg-accent" : "border-border bg-background"
                  }`}
                >
                  {checked && <Check size={10} className="text-accent-foreground" strokeWidth={3} />}
                </span>
                <span className={checked ? "font-medium" : ""}>{folder.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ScanFolderPicker;
