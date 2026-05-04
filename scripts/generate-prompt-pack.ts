#!/usr/bin/env tsx
/**
 * Prompt Pack Generator
 *
 * Gathers relevant CLAUDE.md files and contracts based on module routing,
 * and outputs a bundled prompt pack to stdout.
 *
 * Usage:
 *   npm run prompt:pack                    # all modules
 *   npm run prompt:pack -- --module M1     # specific module
 *   npm run prompt:pack -- --changed       # only modules with git changes
 *   npm run prompt:pack -- --file src/commands/note_create.rs  # module for file
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

const ROOT = resolve(import.meta.dirname, "..");

// ─── Config (mirrors routing-context.yaml) ──────────────────────────────

interface ModuleDef {
  name: string;
  paths: string[];
  claudeMd: string;
}

const MODULES: ModuleDef[] = [
  {
    name: "M1-domain",
    paths: ["src-tauri/src/app_core/**", "contracts/note-schema.json"],
    claudeMd: "src-tauri/src/app_core/CLAUDE.md",
  },
  {
    name: "M2-infra",
    paths: ["src-tauri/src/infra/**", "migrations/**"],
    claudeMd: "src-tauri/src/infra/CLAUDE.md",
  },
  {
    name: "M3-tauri-bridge",
    paths: [
      "src-tauri/src/commands/**",
      "src-tauri/src/plugins/**",
      "src-tauri/src/lib.rs",
      "contracts/tauri-commands.md",
      "contracts/tauri-events.md",
    ],
    claudeMd: "src-tauri/src/CLAUDE.md",
  },
  {
    name: "M4-note-feature",
    paths: ["src/features/notes/**", "contracts/note-schema.json"],
    claudeMd: "src/features/notes/CLAUDE.md",
  },
  {
    name: "M5-command-system",
    paths: ["src/commands/**", "src/features/*/commands.js", "commands.json"],
    claudeMd: "src/commands/CLAUDE.md",
  },
];

const CONTRACT_OVERRIDES: { pattern: string; contracts: string[] }[] = [
  {
    pattern: "src-tauri/src/commands/note_*.rs",
    contracts: ["contracts/tauri-commands.md", "contracts/note-schema.json"],
  },
  {
    pattern: "src/features/notes/hooks/useNote.js",
    contracts: ["contracts/tauri-commands.md", "contracts/tauri-events.md"],
  },
  {
    pattern: "src/features/notes/NoteEditor.jsx",
    contracts: ["contracts/editor-state-contract.md"],
  },
];

const PRE_READ_RULES: { pattern: string; requires: string[] }[] = [
  {
    pattern: "src/components/**/*.tsx",
    requires: ["contracts/component-contracts.md"],
  },
  {
    pattern: "src/commands/**/*.ts",
    requires: ["contracts/command-interface.md"],
  },
  {
    pattern: "**/api/**/*.{ts,tsx}",
    requires: ["docs/api-conventions.md"],
  },
];

const EXEMPT_PATHS = [
  "**/__tests__/**",
  "**/*.test.{ts,tsx}",
  "**/*.spec.{ts,tsx}",
  "examples/**",
  "docs/**/*.md",
  "dist/**",
  "build/**",
  ".next/**",
];

// ─── Glob matcher ───────────────────────────────────────────────────────

function matchGlob(pattern: string, filepath: string): boolean {
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "⟨GLOBSTAR⟩")
    .replace(/\*/g, "[^/]*")
    .replace(/⟨GLOBSTAR⟩/g, ".*")
    .replace(/\?/g, "[^/]")
    .replace(/\{[^}]+\}/g, (m) => {
      // Handle {ts,tsx} alternation
      const alts = m.slice(1, -1).split(",");
      return `(${alts.join("|")})`;
    });
  return new RegExp(`^${regexStr}$`).test(filepath);
}

function matchesAny(patterns: string[], filepath: string): boolean {
  return patterns.some((p) => matchGlob(p, filepath));
}

function isExempt(filepath: string): boolean {
  return matchesAny(EXEMPT_PATHS, filepath);
}

// ─── Git helpers ────────────────────────────────────────────────────────

function getChangedFiles(): string[] {
  try {
    const staged = execSync("git diff --cached --name-only", {
      cwd: ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    const unstaged = execSync("git diff --name-only", {
      cwd: ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    const untracked = execSync(
      "git ls-files --others --exclude-standard",
      { cwd: ROOT, encoding: "utf-8" }
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    return [...new Set([...staged, ...unstaged, ...untracked])];
  } catch {
    return [];
  }
}

// ─── Resolve modules for a file ─────────────────────────────────────────

function resolveModules(filepath: string): string[] {
  return MODULES.filter((m) => matchesAny(m.paths, filepath)).map(
    (m) => m.name
  );
}

// ─── Resolve contracts for a file ───────────────────────────────────────

function resolveContracts(filepath: string): string[] {
  const contracts: string[] = [];
  for (const rule of CONTRACT_OVERRIDES) {
    if (matchGlob(rule.pattern, filepath)) {
      contracts.push(...rule.contracts);
    }
  }
  for (const rule of PRE_READ_RULES) {
    if (matchGlob(rule.pattern, filepath)) {
      contracts.push(...rule.requires);
    }
  }
  return [...new Set(contracts)];
}

// ─── Read file safely ───────────────────────────────────────────────────

function safeRead(path: string): string | null {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) return null;
  return readFileSync(full, "utf-8");
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let targetModules: string[] = [];
  let targetFiles: string[] = [];

  // Parse arguments
  const moduleIdx = args.indexOf("--module");
  const fileIdx = args.indexOf("--file");
  const changed = args.includes("--changed");

  if (moduleIdx !== -1 && args[moduleIdx + 1]) {
    targetModules = [args[moduleIdx + 1]];
  } else if (fileIdx !== -1 && args[fileIdx + 1]) {
    targetFiles = [args[fileIdx + 1]];
    targetModules = resolveModules(args[fileIdx + 1]);
  } else if (changed) {
    targetFiles = getChangedFiles().filter((f) => !isExempt(f));
    for (const f of targetFiles) {
      targetModules.push(...resolveModules(f));
    }
    targetModules = [...new Set(targetModules)];
  } else {
    targetModules = MODULES.map((m) => m.name);
  }

  // Gather content
  const sections: string[] = [];
  const gatheredContracts = new Set<string>();

  // Root CLAUDE.md
  const rootClaude = safeRead("CLAUDE.md");
  if (rootClaude) {
    sections.push(`# ROOT CLAUDE.md\n\n${rootClaude}`);
  }

  // Module CLAUDE.md files
  for (const modName of targetModules) {
    const mod = MODULES.find((m) => m.name === modName);
    if (!mod) continue;

    const content = safeRead(mod.claudeMd);
    if (content) {
      sections.push(`# MODULE: ${modName}\nPath: ${mod.claudeMd}\n\n${content}`);
    }

    // Gather contracts for matching files
    for (const f of targetFiles) {
      if (matchesAny(mod.paths, f)) {
        resolveContracts(f).forEach((c) => gatheredContracts.add(c));
      }
    }
  }

  // Resolve contracts for all target files
  for (const f of targetFiles) {
    resolveContracts(f).forEach((c) => gatheredContracts.add(c));
  }

  // Load contract files
  for (const contractPath of gatheredContracts) {
    const content = safeRead(contractPath);
    if (content) {
      sections.push(`# CONTRACT: ${contractPath}\n\n${content}`);
    }
  }

  // Output
  const pack = sections.join("\n\n---\n\n");
  console.log(pack);

  // Summary to stderr
  console.error(`\n--- Prompt Pack Summary ---`);
  console.error(`Modules: ${targetModules.join(", ") || "none"}`);
  console.error(`Files: ${targetFiles.length}`);
  console.error(`Contracts: ${[...gatheredContracts].join(", ") || "none"}`);
  console.error(`Total size: ${pack.length} chars`);
}

main();
