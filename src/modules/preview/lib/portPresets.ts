export type PreviewPortPreset = {
  id: string;
  port: number;
  label: string;
  hint: string;
};

export const DEFAULT_PREVIEW_PORT_PRESETS: PreviewPortPreset[] = [
  { id: "vite-5173", port: 5173, label: "Vite", hint: "vite, sveltekit" },
  {
    id: "vite-5174",
    port: 5174,
    label: "Vite (alt)",
    hint: "second vite instance",
  },
  { id: "next-3000", port: 3000, label: "Next.js", hint: "next, express, rails" },
  {
    id: "next-3001",
    port: 3001,
    label: "Next.js (alt)",
    hint: "second next instance",
  },
  {
    id: "vite-preview-4173",
    port: 4173,
    label: "Vite preview",
    hint: "vite preview",
  },
  { id: "angular-4200", port: 4200, label: "Angular", hint: "angular cli" },
  { id: "astro-4321", port: 4321, label: "Astro", hint: "astro" },
  {
    id: "live-server-5500",
    port: 5500,
    label: "Live Server",
    hint: "vscode live server",
  },
  { id: "storybook-6006", port: 6006, label: "Storybook", hint: "storybook" },
  { id: "webpack-8080", port: 8080, label: "Webpack", hint: "webpack, vue cli" },
  {
    id: "metro-8081",
    port: 8081,
    label: "Metro",
    hint: "react native metro",
  },
  {
    id: "django-8000",
    port: 8000,
    label: "Django / FastAPI",
    hint: "django, fastapi",
  },
  { id: "jupyter-8888", port: 8888, label: "Jupyter", hint: "jupyter notebook" },
  { id: "flask-5000", port: 5000, label: "Flask", hint: "flask" },
  { id: "gradio-7860", port: 7860, label: "Gradio", hint: "gradio" },
  { id: "ollama-11434", port: 11434, label: "Ollama", hint: "ollama api" },
];

export function isValidPreviewPort(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 65535
  );
}

function coercePreset(value: unknown): PreviewPortPreset | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PreviewPortPreset>;
  if (typeof candidate.id !== "string" || !candidate.id.trim()) return null;
  if (!isValidPreviewPort(candidate.port)) return null;
  if (typeof candidate.label !== "string" || !candidate.label.trim())
    return null;
  return {
    id: candidate.id.trim(),
    port: candidate.port,
    label: candidate.label.trim(),
    hint: typeof candidate.hint === "string" ? candidate.hint.trim() : "",
  };
}

/**
 * Restores the user's saved list while adding any newly shipped defaults.
 * IDs are stable, so an edited built-in is kept instead of being overwritten.
 */
export function normalizePreviewPortPresets(value: unknown): PreviewPortPreset[] {
  if (!Array.isArray(value)) return DEFAULT_PREVIEW_PORT_PRESETS.map(clone);

  const seenIds = new Set<string>();
  const seenPorts = new Set<number>();
  const presets: PreviewPortPreset[] = [];
  for (const entry of value) {
    const preset = coercePreset(entry);
    if (!preset || seenIds.has(preset.id) || seenPorts.has(preset.port))
      continue;
    seenIds.add(preset.id);
    seenPorts.add(preset.port);
    presets.push(preset);
  }

  for (const preset of DEFAULT_PREVIEW_PORT_PRESETS) {
    if (seenIds.has(preset.id) || seenPorts.has(preset.port)) continue;
    presets.push(clone(preset));
  }
  return presets.length > 0 ? presets : DEFAULT_PREVIEW_PORT_PRESETS.map(clone);
}

export function upsertPreviewPortPreset(
  presets: readonly PreviewPortPreset[],
  next: PreviewPortPreset,
): PreviewPortPreset[] {
  const index = presets.findIndex((preset) => preset.id === next.id);
  if (index < 0) return [...presets, next];
  return presets.map((preset, i) => (i === index ? next : preset));
}

export function duplicatePortIn(
  presets: readonly PreviewPortPreset[],
  port: number,
  exceptId?: string,
): boolean {
  return presets.some(
    (preset) => preset.port === port && preset.id !== exceptId,
  );
}

function clone(preset: PreviewPortPreset): PreviewPortPreset {
  return { ...preset };
}
