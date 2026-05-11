import type { ScanRecord } from "@/lib/types";

type ScanFolderShape = Pick<ScanRecord, "folderId" | "folderIds">;

function normalizeFolderIds(folderIds: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      folderIds
        .filter((folderId): folderId is string => typeof folderId === "string")
        .map((folderId) => folderId.trim())
        .filter((folderId) => folderId.length > 0),
    ),
  );
}

export function getScanFolderIds(scan: ScanFolderShape) {
  return normalizeFolderIds([...(scan.folderIds ?? []), scan.folderId]);
}

export function getPrimaryScanFolderId(scan: ScanFolderShape) {
  return getScanFolderIds(scan)[0];
}

export function scanHasFolder(scan: ScanFolderShape, folderId: string) {
  return getScanFolderIds(scan).includes(folderId);
}

export function applyScanFolderIds<T extends ScanFolderShape>(scan: T, folderIds: string[]) {
  const normalizedFolderIds = normalizeFolderIds(folderIds);
  return {
    ...scan,
    folderIds: normalizedFolderIds,
    folderId: normalizedFolderIds[0],
  };
}
