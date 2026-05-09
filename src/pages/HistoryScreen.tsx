import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { useAppState } from "@/context/AppStateContext";
import { Clock, FolderPlus, Star, Trash2 } from "lucide-react";

const riskDot = {
  low: "bg-risk-low",
  moderate: "bg-risk-moderate",
  high: "bg-risk-high",
};

const historyBadgeTone = {
  low: "bg-risk-low/15 text-risk-low",
  moderate: "bg-risk-moderate/15 text-risk-moderate",
  high: "bg-risk-high/15 text-risk-high",
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
      <div className="bg-primary px-[24px] pb-[48px] pt-[56px] rounded-b-3xl">
        <div className="mb-[20px] flex items-center gap-[12px]">
          <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-accent/20 shrink-0">
            <Clock size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">Your Library</h1>
            <p className="text-sm text-primary-foreground/55">{history.length} product{history.length !== 1 ? "s" : ""} saved</p>
          </div>
        </div>

        <div className="flex gap-[8px] overflow-x-auto pb-[4px] scrollbar-hide">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 rounded-full px-[14px] py-[8px] text-sm font-medium transition-colors ${filter === "all" ? "bg-accent text-accent-foreground" : "bg-primary-foreground/10 text-primary-foreground/70"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("favorites")}
            className={`shrink-0 rounded-full px-[14px] py-[8px] text-sm font-medium transition-colors ${filter === "favorites" ? "bg-accent text-accent-foreground" : "bg-primary-foreground/10 text-primary-foreground/70"}`}
          >
            Favorites
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setFilter(folder.id)}
              className={`shrink-0 rounded-full px-[14px] py-[8px] text-sm font-medium transition-colors ${filter === folder.id ? "bg-accent text-accent-foreground" : "bg-primary-foreground/10 text-primary-foreground/70"}`}
            >
              {folder.name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-[24px] -mt-[24px] space-y-[12px]">
        <div className="w-full rounded-2xl bg-card p-[16px] shadow-elevated">
          <div className="flex gap-[8px]">
            <Input
              value={folderName}
              placeholder="New folder name"
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && folderName.trim() && handleCreateFolder()}
            />
            <button
              onClick={handleCreateFolder}
              disabled={!folderName.trim()}
              className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground disabled:opacity-40"
              type="button"
            >
              <FolderPlus size={18} />
            </button>
          </div>
          {folderError && <p className="mt-[8px] text-xs text-destructive">{folderError}</p>}
        </div>

        {filteredHistory.length > 0 ? (
          filteredHistory.map((item, index) => {
            const folder = folders.find((entry) => entry.id === item.folderId);
            const flagCount = item.analysis.flags.length;
            const flagLabel = flagCount === 0 ? "No profile matches" : `${flagCount} profile ${flagCount === 1 ? "match" : "matches"}`;
            const badgeTone = historyBadgeTone[item.analysis.overallRisk];
            return (
              <div
                key={item.id}
                className="w-full rounded-2xl bg-card p-[16px] shadow-card transition-shadow duration-200"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center gap-[12px]">
                  <button
                    type="button"
                    onClick={() => { selectScan(item.id); navigate("/results"); }}
                    className="flex flex-1 items-center gap-[14px] text-left"
                  >
                    <div className={`flex min-h-[40px] min-w-[84px] shrink-0 items-center justify-center rounded-xl px-[10px] text-center text-[11px] font-semibold leading-tight ${badgeTone}`}>
                      {flagLabel}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-[6px]">
                        <p className="text-sm font-semibold text-foreground truncate">{item.productName}</p>
                        {item.isFavorite && <Star size={13} className="fill-accent text-accent shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.brandName ? `${item.brandName} · ` : ""}
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        {folder ? ` · ${folder.name}` : ""}
                      </p>
                    </div>
                    <span className={`h-[9px] w-[9px] shrink-0 rounded-full ${riskDot[item.analysis.overallRisk]}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteScan(item.id)}
                    className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                    aria-label={`Delete ${item.productName}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="mt-[12px] flex items-center gap-[10px] border-t border-border pt-[12px]">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground shrink-0">Folder</span>
                  <select
                    value={item.folderId ?? "none"}
                    onChange={(e) => moveScanToFolder(item.id, e.target.value === "none" ? undefined : e.target.value)}
                    className="h-[34px] flex-1 rounded-full border border-border bg-background px-[12px] text-sm text-foreground"
                  >
                    <option value="none">No folder</option>
                    {folders.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-[20px]">
            <p className="text-sm font-semibold text-foreground">Nothing here yet</p>
            <p className="mt-[6px] text-sm text-muted-foreground">
              Favorite a scan or move one to a folder from the results screen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryScreenV2;
