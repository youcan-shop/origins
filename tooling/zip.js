import zl from "zip-lib";
import fs from "fs-extra";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const theme_folders = ["layouts", "sections", "locales", "snippets", "assets", "config", "templates"];

const theme_root = resolve(__dirname, "..");
const dist_path = resolve(theme_root, "dist");
const packageJsonPath = resolve(theme_root, "package.json");
const theme_name = basename(theme_root);

let version = "1.0.0";

if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    version = packageJson.version || version;
  } catch (err) {
    console.error("Error reading package.json:", err);
  }
}

const theme_dist_path = resolve(dist_path, `${theme_name}_v${version}.zip`);
const zip = new zl.Zip();

theme_folders.forEach((folder) => {
  const folderPath = resolve(theme_root, folder);
  if (fs.existsSync(folderPath)) {
    zip.addFolder(folderPath, folder);
  } else {
    console.log(`Note: Folder "${folder}" does not exist, skipping`);
  }
});

fs.ensureDirSync(dist_path);

zip
  .archive(theme_dist_path)
  .then(() => {
    console.log(`Successfully zipped ${theme_name}`);
  })
  .catch((err) => {
    console.error("Error zipping:", err);
  });
