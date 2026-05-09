import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { homedir } from "os";

export abstract class FilesystemService {
  static resolvePath(inputPath: string) {
    return inputPath.startsWith("~") ? join(homedir(), inputPath.slice(1)) : resolve(inputPath);
  }

  static browse(dirPath: string): {
    currentPath: string;
    parentPath?: string;
    directories: { name: string; path: string }[];
  } {
    const resolvedPath = FilesystemService.resolvePath(dirPath);

    if (!existsSync(resolvedPath)) {
      return { currentPath: resolvedPath, directories: [] };
    }

    try {
      const stats = statSync(resolvedPath);
      if (!stats.isDirectory()) {
        return { currentPath: resolvedPath, directories: [] };
      }
    } catch {
      return { currentPath: resolvedPath, directories: [] };
    }

    const parentPath = resolvedPath !== "/" ? join(resolvedPath, "..") : undefined;

    let entries: { name: string; path: string }[] = [];
    try {
      const items = readdirSync(resolvedPath, { withFileTypes: true });
      entries = items
        .reduce<{ name: string; path: string }[]>((acc, item) => {
          if (item.isDirectory() && !item.name.startsWith(".")) {
            acc.push({ name: item.name, path: join(resolvedPath, item.name) });
          }
          return acc;
        }, [])
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      // Permission denied or other error
    }

    return {
      currentPath: resolvedPath,
      parentPath,
      directories: entries,
    };
  }

  static readFile(filePath: string): { path: string; content: string | null } {
    const resolvedPath = FilesystemService.resolvePath(filePath);

    if (!existsSync(resolvedPath)) {
      return { path: resolvedPath, content: null };
    }

    try {
      const stats = statSync(resolvedPath);
      if (!stats.isFile()) {
        return { path: resolvedPath, content: null };
      }

      return {
        path: resolvedPath,
        content: readFileSync(resolvedPath, "utf8"),
      };
    } catch {
      return { path: resolvedPath, content: null };
    }
  }

  static writeFile(filePath: string, content: string): { path: string; content: string } {
    const resolvedPath = FilesystemService.resolvePath(filePath);
    writeFileSync(resolvedPath, content, "utf8");
    return { path: resolvedPath, content };
  }
}
