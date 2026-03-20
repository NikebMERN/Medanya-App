#!/usr/bin/env node
/**
 * Pin AGP to 8.5.0 to fix "No variants exist" EAS build error.
 * React Native 0.81.5 ships AGP 8.11.0 which is incompatible with many native modules.
 */
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "node_modules", "react-native", "gradle", "libs.versions.toml");
const TARGET_AGP = "8.5.0";

if (!fs.existsSync(filePath)) {
  console.warn("[patch-agp] libs.versions.toml not found, skipping");
  process.exit(0);
}

let content = fs.readFileSync(filePath, "utf8");
if (content.includes(`agp = "${TARGET_AGP}"`)) process.exit(0);

// Be tolerant to formatting differences.
const agpRegex = /agp\\s*=\\s*\"8\\.[0-9]+\\.[0-9]+\"/;
if (!agpRegex.test(content)) {
  console.warn("[patch-agp] Could not find agp version to replace");
  process.exit(0);
}

const newContent = content.replace(agpRegex, `agp = "${TARGET_AGP}"`);
fs.writeFileSync(filePath, newContent);
console.log(`[patch-agp] Pinned AGP to ${TARGET_AGP}`);
