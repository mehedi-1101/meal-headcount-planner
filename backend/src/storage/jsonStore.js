import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Derive __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All data files live in backend/data/
const dataDir = path.join(__dirname, "..", "..", "data");

/**
 * Build the full file path for a data file.
 * Keeps path logic in one place — easy to change later.
 */
function getFilePath(fileName) {
  return path.join(dataDir, fileName);
}

/**
 * Read a JSON file and return the parsed content.
 * Returns `fallback` if the file doesn't exist yet
 * (e.g., meals.json won't exist until the first opt-out).
 */
export function readJson(fileName, fallback = []) {
  const filePath = getFilePath(fileName);

  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Write data to a JSON file (pretty-printed for easy inspection).
 * Creates the file if it doesn't exist.
 *
 * Note: safe for concurrent requests in single-process Node because
 * writeFileSync is blocking — no preemption between read and write.
 */
export function writeJson(fileName, data) {
  const filePath = getFilePath(fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
