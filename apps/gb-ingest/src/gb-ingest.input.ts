import { readdirSync, rmSync, statSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import AdmZip from 'adm-zip';

type ExtractedExport = {
  dir: string;
  dbPath: string;
  activityFits: ActivityFitRef[];
  cleanup: () => void;
};

type ActivityFitRef = {
  path: string;
  device: string;
};

const extractZip = (zipPath: string): { dir: string; cleanup: () => void } => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gb-ingest-'));
  new AdmZip(zipPath).extractAllTo(dir, true);
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
};

const exists = (p: string): boolean => {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
};

// Gadgetbridge full-export layout:
//   database/Gadgetbridge          — SQLite DB (no .db extension)
//   files/<MAC>/ACTIVITY/<year>/*.fit — workout recordings
//   files/<MAC>/MONITOR/<year>/*.fit — continuous monitoring (not used yet)
//   files/<MAC>/METRICS/<year>/*.fit — periodic metric snapshots (not used yet)
const discoverActivityFits = (dir: string): ActivityFitRef[] => {
  const filesRoot = path.join(dir, 'files');
  if (!exists(filesRoot)) {
    return [];
  }
  const result: ActivityFitRef[] = [];
  for (const device of readdirSync(filesRoot)) {
    const activityRoot = path.join(filesRoot, device, 'ACTIVITY');
    if (!exists(activityRoot)) {
      continue;
    }
    for (const year of readdirSync(activityRoot)) {
      const yearDir = path.join(activityRoot, year);
      for (const file of readdirSync(yearDir)) {
        if (file.endsWith('.fit')) {
          result.push({ path: path.join(yearDir, file), device });
        }
      }
    }
  }
  return result;
};

const extractExport = (zipPath: string): ExtractedExport => {
  const { dir, cleanup } = extractZip(zipPath);
  const dbPath = path.join(dir, 'database', 'Gadgetbridge');
  if (!exists(dbPath)) {
    cleanup();
    throw new Error(`Export missing database/Gadgetbridge: ${zipPath}`);
  }
  return {
    dir,
    dbPath,
    activityFits: discoverActivityFits(dir),
    cleanup,
  };
};

export type { ActivityFitRef, ExtractedExport };
export { extractExport };
