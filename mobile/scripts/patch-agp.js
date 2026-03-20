#!/usr/bin/env node
/**
 * Pin AGP to 8.5.0 to fix "No variants exist" EAS build error.
 * React Native 0.81.5 ships AGP 8.11.0 which is incompatible with many native modules.
 */
const fs = require("fs");
const path = require("path");

const TARGET_AGP = "8.5.0";

// Resolve react-native location reliably (works with npm hoisting).
const rnPackageJson = require.resolve("react-native/package.json");
const reactNativeDir = path.dirname(rnPackageJson);
const filePath = path.join(reactNativeDir, "gradle", "libs.versions.toml");

console.log(`[patch-agp] Target AGP: ${TARGET_AGP}`);
console.log(`[patch-agp] Using libs file: ${filePath}`);

if (!fs.existsSync(filePath)) {
  console.warn("[patch-agp] libs.versions.toml not found, skipping");
  process.exit(0);
}

let content = fs.readFileSync(filePath, "utf8");

const agpLineRegex = /(\bagp\s*=\s*\")([0-9]+\.[0-9]+\.[0-9]+)(\".*)/m;
const currentAgpMatch = content.match(agpLineRegex);
const currentAgp = currentAgpMatch ? currentAgpMatch[2] : null;
console.log(`[patch-agp] Current AGP in file: ${currentAgp ?? "unknown"}`);

if (currentAgp === TARGET_AGP) {
  console.log("[patch-agp] AGP already pinned. No changes needed.");
  process.exit(0);
}

// Replace the agp version while keeping formatting.
const agpRegex = /\bagp\s*=\s*\"[0-9]+\.[0-9]+\.[0-9]+\"/;
if (!agpRegex.test(content)) {
  console.warn("[patch-agp] Could not find agp version to replace");
  process.exit(0);
}

content = content.replace(agpRegex, `agp = "${TARGET_AGP}"`);
fs.writeFileSync(filePath, content);
console.log(`[patch-agp] Pinned AGP to ${TARGET_AGP}`);
