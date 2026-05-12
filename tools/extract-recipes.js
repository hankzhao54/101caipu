const fs = require("fs");
const zlib = require("zlib");

const pdfPath = "recipes.pdf";
const outPath = "app-data.js";
const textOutPath = "extracted-text.md";

const buf = fs.readFileSync(pdfPath);
const latin = buf.toString("latin1");

const objectRe = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
const objects = new Map();
let objectMatch;

while ((objectMatch = objectRe.exec(latin))) {
  const full = objectMatch[0];
  const body = objectMatch[2];
  objects.set(Number(objectMatch[1]), {
    body,
    bodyStart: objectMatch.index + full.indexOf(body),
  });
}

function streamData(obj) {
  const { body, bodyStart } = obj;
  const streamIndex = body.indexOf("stream");
  if (streamIndex < 0) return null;

  let start = streamIndex + 6;
  if (body[start] === "\r" && body[start + 1] === "\n") start += 2;
  else if (body[start] === "\n") start += 1;

  const end = body.indexOf("endstream", start);
  if (end < 0) return null;

  const globalStart = bodyStart + start;
  let raw = buf.subarray(globalStart, globalStart + (end - start));
  while (raw.length && (raw.at(-1) === 10 || raw.at(-1) === 13)) {
    raw = raw.subarray(0, -1);
  }

  try {
    return zlib.inflateSync(raw);
  } catch {
    return raw;
  }
}

function unicodeFromHex(hex) {
  let out = "";
  for (let i = 0; i < hex.length; i += 4) {
    out += String.fromCodePoint(parseInt(hex.slice(i, i + 4), 16));
  }
  return out;
}

function parseCMap(text) {
  const map = new Map();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const count = parseInt(lines[i], 10);

    if (lines[i].includes("beginbfchar")) {
      for (let j = 1; j <= count; j += 1) {
        const match = lines[i + j]?.match(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/);
        if (match) map.set(match[1].toUpperCase().padStart(4, "0"), unicodeFromHex(match[2]));
      }
    }

    if (lines[i].includes("beginbfrange")) {
      for (let j = 1; j <= count; j += 1) {
        const line = lines[i + j] || "";
        let match = line.match(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/);

        if (match) {
          const start = parseInt(match[1], 16);
          const end = parseInt(match[2], 16);
          const codePoint = parseInt(match[3], 16);
          for (let value = start; value <= end; value += 1) {
            map.set(value.toString(16).toUpperCase().padStart(4, "0"), String.fromCodePoint(codePoint + value - start));
          }
          continue;
        }

        match = line.match(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+\[(.*)\]/);
        if (match) {
          const start = parseInt(match[1], 16);
          const values = [...match[3].matchAll(/<([0-9A-Fa-f]+)>/g)];
          values.forEach((value, index) => {
            map.set((start + index).toString(16).toUpperCase().padStart(4, "0"), unicodeFromHex(value[1]));
          });
        }
      }
    }
  }

  return map;
}

const unicodeMaps = new Map();
for (const [id, obj] of objects) {
  const data = streamData(obj);
  if (!data) continue;
  const text = data.toString("latin1");
  if (!text.includes("beginbf")) continue;

  const map = parseCMap(text);
  if (map.size) unicodeMaps.set(id, map);
}

const fontObjectMaps = new Map();
for (const [id, obj] of objects) {
  const match = obj.body.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
  if (match && unicodeMaps.has(Number(match[1]))) {
    fontObjectMaps.set(id, unicodeMaps.get(Number(match[1])));
  }
}

const fontMaps = new Map();
for (const match of latin.matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
  const map = fontObjectMaps.get(Number(match[2]));
  if (map) fontMaps.set(match[1], map);
}

function decodeHex(hex, map) {
  let out = "";
  for (let i = 0; i < hex.length; i += 4) {
    out += map?.get(hex.slice(i, i + 4).toUpperCase().padStart(4, "0")) ?? "";
  }
  return out;
}

function normalizeText(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([A-ZÁÉÍÓÖŐÚÜŰ])\n(?=[A-ZÁÉÍÓÖŐÚÜŰ](?:\n|$))/g, "$1")
    .replace(/([a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ0-9])\n(?=[a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ0-9.,:;()/+-])/g, "$1")
    .replace(/([0-9])\n(?=[0-9])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractPageText(content) {
  const tokens = /(?:\/(F\d+)\s+[\d.]+\s+Tf)|(?:(-?[\d.]+)\s+(-?[\d.]+)\s+Td)|(?:(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm)|(?:<([0-9A-Fa-f]+)>\s*Tj)/g;
  let font = null;
  let out = "";
  let match;

  while ((match = tokens.exec(content))) {
    if (match[1]) {
      font = match[1];
      continue;
    }

    if (match[2] !== undefined) {
      const x = Number(match[2]);
      const y = Number(match[3]);
      if (Math.abs(y) > 0.1) out += "\n";
      else if (x > 20) out += " ";
      continue;
    }

    if (match[4] !== undefined) {
      if (out && !out.endsWith("\n")) out += "\n";
      continue;
    }

    if (match[10]) {
      out += decodeHex(match[10], fontMaps.get(font));
    }
  }

  return normalizeText(out);
}

const pages = [];
for (const [, obj] of objects) {
  const data = streamData(obj);
  if (!data) continue;
  const content = data.toString("latin1");
  if (!content.includes(" Tj")) continue;

  const text = extractPageText(content);
  if (text) pages.push(text);
}

function redact(text) {
  return text
    .replace(/Passw?:\s*\S+/gi, "Pass: [REDACTED]")
    .replace(/user:\s*\S+/gi, "user: [REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/0[0-9]{1,2}[ -]?[0-9]{2,3}[ -]?[0-9]{2,3}[ -]?[0-9]{2,4}/g, "[phone redacted]");
}

function titleCase(text) {
  return text
    .toLowerCase()
    .replace(/(^|[\s./-])([a-záéíóöőúüű])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

function inferCategory(number) {
  const first = number.split(".")[0];
  return {
    "1": "Alaplevek",
    "2": "Szószok",
    "3": "Előkészítés",
    "4": "Ételek",
    "5": "Desszertek és italok",
  }[first] || "Egyéb";
}

const sections = [];
let current = null;

for (const [index, page] of pages.entries()) {
  const headingMatch = page.match(/^(\d+(?:\.\d+)+)\.?\s*([A-ZÁÉÍÓÖŐÚÜŰ0-9 ,.'()-]{4,})$/m);

  if (headingMatch) {
    if (current) sections.push(current);
    const number = headingMatch[1];
    const title = titleCase(headingMatch[2].replace(/\s+/g, " ").trim());
    current = {
      id: `recipe-${sections.length + 1}`,
      number,
      title,
      category: inferCategory(number),
      sourcePages: [index + 1],
      content: "",
    };
    continue;
  }

  if (!current) continue;

  current.sourcePages.push(index + 1);
  current.content += `${current.content ? "\n\n" : ""}${redact(page)}`;
}

if (current) sections.push(current);

const recipes = sections.map((section) => {
  const lines = section.content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const ingredients = lines.filter((line) => /^\d+([,.]\d+)?\s*(kg|g|l|liter|db|ml)\b/i.test(line)).slice(0, 24);
  const methodStart = lines.findIndex((line) => /műveletek|forral|főz|süt|kever|szűr|csinál/i.test(line));
  const method = methodStart >= 0 ? lines.slice(methodStart, methodStart + 12) : lines.slice(0, 10);

  return {
    ...section,
    language: "hu",
    titleZh: "",
    titleEn: "",
    status: "imported",
    tags: [section.category],
    ingredients,
    method,
    updatedAt: "2026-05-13",
    history: [
      {
        date: "2026-05-13",
        user: "Codex import",
        summary: "Imported from the original PDF and redacted obvious credentials.",
      },
    ],
  };
});

const data = {
  meta: {
    source: "101_receptek_orig másolata.pdf",
    generatedAt: new Date().toISOString(),
    totalPages: pages.length,
    totalRecipes: recipes.length,
    note: "Automatic import. Please review quantities and Hungarian text before operational use.",
  },
  categories: [...new Set(recipes.map((recipe) => recipe.category))],
  recipes,
};

const markdown = pages.map((page, index) => `## Page ${index + 1}\n\n${redact(page)}`).join("\n\n");
fs.writeFileSync(textOutPath, markdown, "utf8");
fs.writeFileSync(outPath, `window.RECIPE_WIKI_DATA = ${JSON.stringify(data, null, 2)};\n`, "utf8");

console.log(`Extracted ${recipes.length} recipe sections from ${pages.length} text pages.`);
