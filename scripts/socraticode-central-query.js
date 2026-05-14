#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_ROOT = process.cwd();
const IGNORE_DIRS = [".git", "node_modules", "dist", "build", "vendor", ".idea", ".vscode"];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function toResultSuccess(method, payload) {
  process.stdout.write(JSON.stringify({
    type: "success",
    method,
    ...payload,
  }));
}

function toResultError(method, error) {
  process.stdout.write(JSON.stringify({
    type: "error",
    method,
    error,
  }));
}

function normalize(p) {
  return p.replace(/\\/g, "/");
}

function resolveRoot(args) {
  const explicit = args.projectPath && String(args.projectPath).trim();
  if (explicit) {
    const resolved = path.resolve(explicit);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Invalid projectPath: ${explicit}`);
    }
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      throw new Error(`projectPath is not a directory: ${explicit}`);
    }
    return resolved;
  }
  return path.resolve(DEFAULT_ROOT);
}

function walkFiles(root, current = "") {
  const absDir = path.resolve(root, current);
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relative = current ? path.join(current, entry.name) : entry.name;
    const normalized = normalize(relative);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      files.push(...walkFiles(root, relative));
      continue;
    }
    files.push(normalized);
  }

  return files;
}

function languageMatches(filePath, languageFilter) {
  if (!languageFilter) return true;
  const ext = path.extname(filePath).toLowerCase();
  const mapping = {
    go: [".go"],
    javascript: [".js", ".mjs", ".cjs", ".jsx"],
    typescript: [".ts", ".tsx"],
    json: [".json"],
    yaml: [".yaml", ".yml"],
    markdown: [".md"],
    text: [".txt"],
    shell: [".sh", ".ps1"],
    sql: [".sql"],
    html: [".html"],
    css: [".css"],
    proto: [".proto"],
  };
  const allowed = mapping[String(languageFilter).toLowerCase()];
  if (!allowed) return true;
  return allowed.includes(ext);
}

function classifySymbolLine(line, symbolName) {
  const escaped = symbolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const checks = [
    { kind: "function", regex: new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\b`) },
    { kind: "class", regex: new RegExp(`^\\s*(?:export\\s+)?class\\s+${escaped}\\b`) },
    { kind: "type", regex: new RegExp(`^\\s*(?:export\\s+)?type\\s+${escaped}\\b`) },
    { kind: "interface", regex: new RegExp(`^\\s*(?:export\\s+)?interface\\s+${escaped}\\b`) },
    { kind: "const", regex: new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var)\\s+${escaped}\\b`) },
    { kind: "method", regex: new RegExp(`^\\s*(?:public\\s+|private\\s+|protected\\s+)?(?:static\\s+)?${escaped}\\s*\\(`) },
    { kind: "method", regex: new RegExp(`^\\s*func\\s*\\([^)]*\\)\\s*${escaped}\\s*\\(`) },
    { kind: "assignment", regex: new RegExp(`^\\s*${escaped}\\s*=\\s*(?:async\\s+)?\\(`) },
  ];
  for (const check of checks) {
    if (check.regex.test(line)) return check.kind;
  }
  return "reference";
}

function searchCommand(argv) {
  const args = parseArgs(argv);
  const query = (args.query || "").trim();
  if (!query) {
    toResultError("codebase_search", "Missing query parameter");
    return;
  }

  const root = resolveRoot(args);
  const fileFilter = String(args.fileFilter || "").trim().toLowerCase();
  const languageFilter = String(args.languageFilter || "").trim();
  const includeLinked = String(args.includeLinked || "false") === "true";
  const limit = Math.max(1, Math.min(Number(args.limit || 20) || 20, 100));
  const files = walkFiles(root);
  const results = [];

  for (const relativeFile of files) {
    const normalizedFile = normalize(relativeFile);
    if (fileFilter && !normalizedFile.toLowerCase().includes(fileFilter)) continue;
    if (!languageMatches(relativeFile, languageFilter)) continue;

    const fileAbs = path.resolve(root, relativeFile);
    let text;
    try {
      text = fs.readFileSync(fileAbs, "utf8");
    } catch {
      continue;
    }

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].includes(query)) continue;
      results.push({
        file: normalize(relativeFile),
        line: i + 1,
        snippet: lines[i].trim().slice(0, 240),
        score: 1,
      });
      if (results.length >= limit) break;
    }

    if (results.length >= limit) break;
  }

  toResultSuccess("codebase_search", {
    message: results.length > 0 ? `Found ${results.length} matching lines for "${query}"` : `No matches found for "${query}"`,
    query,
    projectPath: root,
    includeLinked,
    count: results.length,
    results,
  });
}

function symbolCommand(argv) {
  const args = parseArgs(argv);
  const name = (args.name || "").trim();
  if (!name) {
    toResultError("codebase_symbol", "Missing name parameter");
    return;
  }

  const root = resolveRoot(args);
  const fileFilter = String(args.file || "").trim().toLowerCase();
  const limit = Math.max(1, Math.min(Number(args.limit || 20) || 20, 100));
  const files = walkFiles(root);
  const matches = [];
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}\\b`);

  for (const relativeFile of files) {
    if (fileFilter && !normalize(relativeFile).toLowerCase().includes(fileFilter)) continue;

    const fileAbs = path.resolve(root, relativeFile);
    let text;
    try {
      text = fs.readFileSync(fileAbs, "utf8");
    } catch {
      continue;
    }

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (!pattern.test(lines[i])) continue;
      const snippet = lines[i].trim().slice(0, 240);
      const kind = classifySymbolLine(snippet, name);
      matches.push({
        file: normalize(relativeFile),
        line: i + 1,
        kind,
        isDefinition: kind !== "reference",
        snippet,
      });
      if (matches.length >= limit) break;
    }
    if (matches.length >= limit) break;
  }

  matches.sort((a, b) => Number(b.isDefinition) - Number(a.isDefinition) || a.file.localeCompare(b.file) || a.line - b.line);
  const definition = matches.find((match) => match.isDefinition) || null;

  toResultSuccess("codebase_symbol", {
    message: matches.length > 0 ? `Found ${matches.length} matches for symbol "${name}"` : `No matches found for symbol "${name}"`,
    name,
    projectPath: root,
    count: matches.length,
    definition,
    matches,
  });
}

const cmd = process.argv[2] || "help";
if (cmd === "codebase_search" || cmd === "search") {
  searchCommand(process.argv.slice(3));
} else if (cmd === "codebase_symbol" || cmd === "symbol") {
  symbolCommand(process.argv.slice(3));
} else {
  toResultError(cmd, `Unknown command: ${cmd}`);
}
