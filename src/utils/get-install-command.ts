import { PackageManager } from "../types";

export const getInstallCommand = (packageManager: PackageManager) => {
  const packageManagerToInstallCommand = <const>{
    npm: ["npm", "ci"],
    pnpm: ["pnpm", "install", "--frozen-lockfile"],
    yarn: ["yarn", "--frozen-lockfile"],
  };
  return packageManagerToInstallCommand[packageManager];
};
