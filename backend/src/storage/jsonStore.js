// const fs = require('fs');
// const path = require('path');

// /**
//  * Read JSON file and return parsed object
//  */
// function readJSON(filePath) {
//   const fullPath = path.resolve(filePath);

//   if (!fs.existsSync(fullPath)) {
//     return null;
//   }

//   const rawData = fs.readFileSync(fullPath, 'utf-8');
//   return JSON.parse(rawData);
// }

// /**
//  * Write JS object to JSON file
//  */
// function writeJSON(filePath, data) {
//   const fullPath = path.resolve(filePath);
//   const jsonData = JSON.stringify(data, null, 2);

//   fs.writeFileSync(fullPath, jsonData);
// }

// module.exports = {
//   readJSON,
//   writeJSON,
// };

import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "backend", "data");

function getFilePath(fileName) {
  return path.join(dataDir, fileName);
}

export function readJson(fileName) {
  const filePath = getFilePath(fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export function writeJson(fileName, data) {
  const filePath = getFilePath(fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

