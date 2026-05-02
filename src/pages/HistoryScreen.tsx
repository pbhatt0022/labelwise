import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/context/AppStateContext";
import { FolderPlus, Star, Trash2 } from "lucide-react";

const riskDot = {
  low: "bg-risk-low",
  moderate: "bg-risk-moderate",
  high: "bg-risk-high",
};

const HistoryScreenV2 = () => {
  const navigate = useNavigate();
  const { history, folders, selectScan, createFolder, deleteScan, moveScanToFolder } = useAppState();
  const [filter, setFilter] = useState<string>("all");
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState("");

  const filteredHistory = useMemo(() => {
    if (filter === "favorites") return history.filter((item) => item.isFavorite);
    if (filter === "all") return history;
    return history.filter((item) => item.folderId === filter);
  }, [filter, history]);

  const handleCreateFolder = async () => {
    const result = await createFolder(folderName);
    if (!result.ok) {
      setFolderError(result.error ?? "We could not create that folder.");
      return;
    }

    setFolderName("");
    setFolderError("");
    if (result.folderId) setFilter(result.folderId);
  };

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="px-[24px] pb-[16px] pt-[48px]">
        <h1 className="text-[24px] font-bold text-foreground">Saved Scans</h1>
        <p className="mt-[4px] text-sm text-muted-foreground">{history.length} products saved to your account</p>
      </div>

      <div className="space-y-[16px] px-[24px]">
        <div className="rounded-2xl bg-card p-[16px] shadow-card">
          <div className="mb-[10px] flex items-center justify-between gap-[12px]">
            <h2 className="text-sm font-semibold text-foreground">Organize with folders</h2>
            <span className="text-xs text-muted-foreground">{folders.length} folders</span>
          </div>

          <div className="flex gap-[8px]">
            <Input value={folderName} placeholder="Create a folder" onChange={(event) => setFolderName(event.target.value)} />
            <button
              onClick={handleCreateFolder}
              className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-accent text-accent-foreground"
              type="button"
            >
              <FolderPlus size={18} />
            </button>
          </div>
          {folderError && <p className="mt-[8px] text-xs text-muted-foreground">{folderError}</p>}

          <div className="mt-[14px] flex gap-[8px] overflow-x-auto pb-[4px]">
            <button
              onClick={() => setFilter("all")}
              className={`shrink-0 rounded-full px-[12px] py-[8px] text-sm font-medium ${filter === "all" ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("favorites")}
              className={`shrink-0 rounded-full px-[12px] py-[8px] text-sm font-medium ${filter === "favorites" ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"}`}
            >
              Favorites
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setFilter(folder.id)}
                className={`shrink-0 rounded-full px-[12px] py-[8px] text-sm font-medium ${filter === folder.id ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"}`}
              >
                {folder.name}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length > 0 ? (
          filteredHistory.map((item, index) => {
            const folder = folders.find((entry) => entry.id === item.folderId);
            return (
              <div
                key={item.id}
                className="animate-fade-in rounded-xl bg-card p-[16px] shadow-card transition-all duration-200 hover:shadow-elevated"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-start gap-[12px]">
                  <button
                    type="button"
                    onClick={() => {
                      selectScan(item.id);
                      navigate("/results");
                    }}
                    className="flex min-h-[44px] flex-1 items-center gap-[16px] text-left active:scale-[0.98]"
                  >
                    <div className="flex h-[40px] w-[40px] items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-primary">
                      {item.analysis.flags.length}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-[8px]">
                        <p className="text-sm font-semibold text-foreground">{item.productName}</p>
                        {item.isFavorite && <Star size={14} className="fill-accent text-accent" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.brandName ? `${item.brandName} | ` : ""}
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        {folder ? ` | ${folder.name}` : ""}
                      </p>
                    </div>
                    <span className={`h-[10px] w-[10px] rounded-full ${riskDot[item.analysis.overallRisk]}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteScan(item.id)}
                    className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                    aria-label={`Delete ${item.productName}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-[12px] flex items-center gap-[10px] border-t border-border pt-[12px]">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Folder</span>
                  <select
                    value={item.folderId ?? "none"}
                    onChange={(event) => moveScanToFolder(item.id, event.target.value === "none" ? undefined : event.target.value)}
                    className="h-[36px] flex-1 rounded-full border border-border bg-background px-[12px] text-sm text-foreground"
                  >
                    <option value="none">No folder</option>
                    {folders.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-[20px]">
            <p className="text-sm font-semibold text-foreground">Nothing saved in this view yet</p>
            <p className="mt-[6px] text-sm text-muted-foreground">
              Save a scan to a folder or favorite it from the results screen and it will show up here.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default HistoryScreenV2;
