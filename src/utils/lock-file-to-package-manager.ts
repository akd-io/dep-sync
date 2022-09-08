import { LockFile, PackageManager } from "../types";

export const lockFileToPackageManager: Record<LockFile, PackageManager> = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
};
