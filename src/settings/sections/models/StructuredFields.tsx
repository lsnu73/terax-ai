import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  EffortConfig,
  JsonObject,
  JsonValue,
  ModelsApiConfig,
  ParamDef,
} from "@/modules/ai/config";
import { t as i18nT } from "@/modules/i18n";
import {
  Add01Icon,
  Cancel01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 表单里的“松散值”：先按 JSON 解析，失败则当普通字符串。 */
function parseLoose(text: string): { value?: JsonValue } {
  if (!text.trim()) return {};
  try {
    return { value: JSON.parse(text) as JsonValue };
  } catch {
    return { value: text };
  }
}

/** 反向显示：普通字符串原样展示；会被 JSON 解析成其他类型的字符串加引号。 */
function displayLoose(value: JsonValue | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed !== "string") return JSON.stringify(value);
    } catch {
      // 普通字符串
    }
    return value;
  }
  return JSON.stringify(value);
}

function withOptionalField<T>(base: T, key: string, value: unknown): T {
  const next = { ...(base as Record<string, unknown>) };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next as T;
}

/** 小号信息图标 + 悬浮说明。每个图标自带 Provider，避免设置窗口漏包 Provider。 */
export function InfoHint({
  text,
  nested = false,
}: {
  text: string;
  /** true 时渲染为 span,可合法嵌进 <button> 内部（按钮右侧内嵌提示）。 */
  nested?: boolean;
}) {
  const { t } = useTranslation();
  const icon = (
    <HugeiconsIcon icon={InformationCircleIcon} size={11} strokeWidth={1.75} />
  );
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {nested ? (
            // biome-ignore lint/a11y/useSemanticElements: 嵌在 <button> 内部时不能再用 button,否则产生非法的按钮嵌套
            <span
              role="button"
              tabIndex={0}
              aria-label={t("settings.models.structured.infoAria")}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="inline-flex shrink-0 cursor-help items-center text-muted-foreground/50 transition-colors hover:text-foreground"
            >
              {icon}
            </span>
          ) : (
            <button
              type="button"
              aria-label={t("settings.models.structured.infoAria")}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex shrink-0 cursor-help items-center text-muted-foreground/50 transition-colors hover:text-foreground"
            >
              {icon}
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-72 text-[11px] leading-relaxed"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function FieldModeToggle({
  mode,
  onChange,
}: {
  mode: "form" | "json";
  onChange: (mode: "form" | "json") => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border/50 bg-muted/30 p-0.5">
      {(["form", "json"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "rounded px-1.5 py-0.5 text-[9.5px] transition-colors",
            mode === item
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item === "form" ? t("settings.models.structured.modeForm") : "JSON"}
        </button>
      ))}
    </div>
  );
}

type StructuredJsonFieldProps<T> = {
  label: string;
  info: string;
  valueText: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  parse: (value: unknown) => ParseResult<T>;
  emptyValue: T;
  renderForm: (value: T, onChange: (next: T) => void) => React.ReactNode;
};

/**
 * 同一个字段同时提供「表单」和「JSON」两种编辑方式。表单编辑会立即把结果
 * 序列化为格式化后的 JSON 文本，父组件仍然只保存一份字符串状态。
 */
export function StructuredJsonField<T>({
  label,
  info,
  valueText,
  onChangeText,
  placeholder,
  parse,
  emptyValue,
  renderForm,
}: StructuredJsonFieldProps<T>) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"form" | "json">("form");
  const [formValue, setFormValue] = useState<T | undefined>(() => {
    const trimmed = valueText.trim();
    if (!trimmed) return emptyValue;
    const json = parseJson<unknown>(trimmed);
    if (json.error) return undefined;
    const result = parse(json.value);
    return result.ok ? result.value : undefined;
  });
  const [error, setError] = useState<string | null>(null);

  const showForm = () => {
    setError(null);
    const trimmed = valueText.trim();
    if (!trimmed) {
      setFormValue(emptyValue);
      setMode("form");
      return;
    }
    const json = parseJson<unknown>(trimmed);
    if (json.error) {
      setError(
        t("settings.models.structured.switchError", { error: json.error }),
      );
      return;
    }
    const result = parse(json.value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFormValue(result.value);
    // 切到表单时顺手把可能写成一行的 JSON 格式化，方便返回 JSON 模式时阅读。
    if (JSON.stringify(result.value) !== JSON.stringify(emptyValue)) {
      onChangeText(JSON.stringify(result.value, null, 2));
    }
    setMode("form");
  };

  const write = (next: T) => {
    // 空值不写入占位符，让 JSON 模式展示格式化后的示例。
    onChangeText(
      JSON.stringify(next) === JSON.stringify(emptyValue)
        ? ""
        : JSON.stringify(next, null, 2),
    );
  };

  const showJson = () => {
    setError(null);
    if (formValue !== undefined) write(formValue);
    setMode("json");
  };

  const update = (next: T) => {
    setFormValue(next);
    write(next);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
          {label}
          <InfoHint text={info} />
        </span>
        <FieldModeToggle
          mode={mode}
          onChange={(next) => (next === "form" ? showForm() : showJson())}
        />
      </div>
      {mode === "form" ? (
        formValue !== undefined ? (
          renderForm(formValue, update)
        ) : (
          <p className="text-[10.5px] text-destructive/80">
            {t("settings.models.structured.cannotConvert")}
          </p>
        )
      ) : (
        <Textarea
          value={valueText}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="min-h-24 resize-y font-mono text-[10.5px] leading-relaxed"
        />
      )}
      {error ? (
        <p className="text-[10.5px] text-destructive/80">{error}</p>
      ) : null}
    </div>
  );
}

function parseJson<T>(text: string): { value?: T; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { value: undefined };
  try {
    return { value: JSON.parse(trimmed) as T };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export function parseParamsArray(value: unknown): ParseResult<ParamDef[]> {
  if (!Array.isArray(value)) {
    return {
      ok: false,
      error: i18nT("settings.models.structured.parseParamsArray"),
    };
  }
  if (!value.every(isRecord)) {
    return {
      ok: false,
      error: i18nT("settings.models.structured.parseParamsItems"),
    };
  }
  return { ok: true, value: value as ParamDef[] };
}

export function parseEffort(
  value: unknown,
): ParseResult<EffortConfig | null> {
  if (value === null) return { ok: true, value: null };
  if (!isRecord(value) || !Array.isArray(value.levels)) {
    return {
      ok: false,
      error: i18nT("settings.models.structured.parseThinking"),
    };
  }
  return { ok: true, value: value as unknown as EffortConfig };
}

export function parseExtra(value: unknown): ParseResult<JsonObject> {
  if (!isRecord(value)) {
    return { ok: false, error: i18nT("settings.models.structured.parseExtra") };
  }
  return { ok: true, value: value as JsonObject };
}

export function parseHeaders(
  value: unknown,
): ParseResult<Record<string, string>> {
  if (!isRecord(value)) {
    return {
      ok: false,
      error: i18nT("settings.models.structured.parseHeaders"),
    };
  }
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string") {
      return {
        ok: false,
        error: i18nT("settings.models.structured.headerValueString", { key }),
      };
    }
  }
  return { ok: true, value: value as Record<string, string> };
}

export function parseModelsApi(
  value: unknown,
): ParseResult<ModelsApiConfig | null> {
  if (value === null) return { ok: true, value: null };
  if (!isRecord(value)) {
    return {
      ok: false,
      error: i18nT("settings.models.structured.parseModelsApi"),
    };
  }
  return { ok: true, value: value as unknown as ModelsApiConfig };
}

function MiniField({
  label,
  info,
  children,
}: {
  label: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[9.5px] text-muted-foreground">
        {label}
        {info ? <InfoHint text={info} /> : null}
      </span>
      {children}
    </div>
  );
}

type KeyValueRow = { id: string; key: string; value: string };
let keyValueSeq = 0;

function nextKeyValueId(): string {
  keyValueSeq += 1;
  return `kv-${keyValueSeq}`;
}

function KeyValueEditor({
  value,
  onChange,
  mode,
  keyPlaceholder,
  valuePlaceholder,
  addLabel,
}: {
  value: Record<string, string> | JsonObject;
  onChange: (next: Record<string, JsonValue>) => void;
  mode: "string" | "json";
  keyPlaceholder: string;
  valuePlaceholder: string;
  addLabel: string;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<KeyValueRow[]>(() =>
    Object.entries(value).map(([key, item]) => ({
      id: nextKeyValueId(),
      key,
      value: mode === "string" ? String(item) : displayLoose(item as JsonValue),
    })),
  );
  const signature = useRef(JSON.stringify(value));

  useEffect(() => {
    const next = JSON.stringify(value);
    if (next === signature.current) return;
    signature.current = next;
    setRows(
      Object.entries(value).map(([key, item]) => ({
        id: nextKeyValueId(),
        key,
        value:
          mode === "string" ? String(item) : displayLoose(item as JsonValue),
      })),
    );
  }, [value, mode]);

  const commit = (nextRows: KeyValueRow[]) => {
    setRows(nextRows);
    const out: Record<string, JsonValue> = {};
    for (const row of nextRows) {
      const key = row.key.trim();
      if (!key) continue;
      if (mode === "string") {
        out[key] = row.value;
        continue;
      }
      const parsed = parseLoose(row.value);
      if (parsed.value !== undefined) out[key] = parsed.value;
    }
    signature.current = JSON.stringify(out);
    onChange(out);
  };

  const addRowButton = (
    <Button
      size="sm"
      variant="outline"
      onClick={() =>
        setRows([...rows, { id: nextKeyValueId(), key: "", value: "" }])
      }
      className="h-6 gap-1 self-start px-2 text-[10px]"
    >
      <HugeiconsIcon icon={Add01Icon} size={10} strokeWidth={2} />
      {addLabel}
    </Button>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-1.5 rounded-md border border-dashed border-border/50 px-2 py-2">
          <span className="text-[10px] text-muted-foreground/70">
            {t("settings.models.structured.noKeyValues")}
          </span>
          {addRowButton}
        </div>
      ) : (
        rows.map((row, index) => (
          <div key={row.id} className="flex items-center gap-1.5">
            <Input
              value={row.key}
              onChange={(e) =>
                commit(
                  rows.map((item, i) =>
                    i === index ? { ...item, key: e.target.value } : item,
                  ),
                )
              }
              placeholder={keyPlaceholder}
              spellCheck={false}
              className="h-7 w-40 shrink-0 font-mono text-[10.5px]"
            />
            <Input
              value={row.value}
              onChange={(e) =>
                commit(
                  rows.map((item, i) =>
                    i === index ? { ...item, value: e.target.value } : item,
                  ),
                )
              }
              placeholder={valuePlaceholder}
              spellCheck={false}
              className="h-7 min-w-0 flex-1 font-mono text-[10.5px]"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => commit(rows.filter((_, i) => i !== index))}
              title={t("settings.models.structured.removeRow")}
              className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={1.75} />
            </Button>
          </div>
        ))
      )}
      {rows.length > 0 ? addRowButton : null}
    </div>
  );
}

/** 档位取值的显示：null（省略参数）显示为空。 */
function displayEffortValue(value: JsonValue | null | undefined): string {
  if (value === null || value === undefined) return "";
  return displayLoose(value);
}

/** 档位取值的解析：留空即 null（该档位省略参数）。 */
function parseEffortValue(text: string): JsonValue | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return parseLoose(trimmed).value ?? null;
}

export function ParamsForm({
  value,
  onChange,
}: {
  value: ParamDef[];
  onChange: (next: ParamDef[]) => void;
}) {
  const { t } = useTranslation();
  const rows = value as ParamDef[];
  const update = (index: number, patch: Partial<ParamDef>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const addParamButton = (
    <Button
      size="sm"
      variant="outline"
      onClick={() =>
        onChange([
          ...rows,
          {
            key: "",
            label: "",
            value: "",
            enabled: true,
          },
        ])
      }
      className="h-7 gap-1 self-start px-2 text-[10.5px]"
    >
      <HugeiconsIcon icon={Add01Icon} size={11} strokeWidth={2} />
      {t("settings.models.structured.addParam")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-1.5 rounded-md border border-dashed border-border/50 px-2 py-2">
          <p className="text-[10px] leading-relaxed text-muted-foreground/80">
            {t("settings.models.structured.paramsEmpty")}
          </p>
          {addParamButton}
        </div>
      ) : null}
      {rows.map((row, index) => (
        <div
          key={`${row.key || "param"}-${index}`}
          className="flex flex-col gap-2 rounded-md border border-border/50 bg-card/40 p-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              {t("settings.models.structured.paramTitle", {
                index: index + 1,
              })}
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Switch
                  checked={row.enabled !== false}
                  onCheckedChange={(checked) =>
                    update(index, { enabled: checked })
                  }
                />
                {t("settings.models.structured.paramEnabled")}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                title={t("settings.models.structured.paramRemove")}
                className="size-6 text-muted-foreground hover:text-destructive"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={10}
                  strokeWidth={1.75}
                />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniField
              label={t("settings.models.structured.paramKey")}
              info={t("settings.models.structured.paramKeyInfo")}
            >
              <Input
                value={row.key ?? ""}
                onChange={(e) => update(index, { key: e.target.value })}
                placeholder="frequency_penalty"
                spellCheck={false}
                className="h-7 font-mono text-[10.5px]"
              />
            </MiniField>
            <MiniField label={t("settings.models.structured.paramLabel")}>
              <Input
                value={row.label ?? ""}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder={t(
                  "settings.models.structured.paramLabelPlaceholder",
                )}
                spellCheck={false}
                className="h-7 text-[10.5px]"
              />
            </MiniField>
          </div>
          <MiniField
            label={t("settings.models.structured.paramValue")}
            info={t("settings.models.structured.paramValueInfo")}
          >
            <Input
              value={displayLoose(row.value)}
              onChange={(e) =>
                update(index, { value: parseLoose(e.target.value).value ?? "" })
              }
              placeholder={t("settings.models.structured.paramValuePlaceholder")}
              spellCheck={false}
              className="h-7 font-mono text-[10.5px]"
            />
          </MiniField>
          <MiniField label={t("settings.models.structured.paramDescription")}>
            <Input
              value={row.description ?? ""}
              onChange={(e) => update(index, { description: e.target.value })}
              placeholder={t(
                "settings.models.structured.paramDescriptionPlaceholder",
              )}
              className="h-7 text-[10.5px]"
            />
          </MiniField>
        </div>
      ))}
      {rows.length > 0 ? addParamButton : null}
      <p className="flex items-start gap-1 text-[9.5px] leading-relaxed text-muted-foreground/60">
        <InfoHint text={t("settings.models.structured.paramsRuleHint")} />
        {t("settings.models.structured.paramsRule")}
      </p>
    </div>
  );
}

function nextLevelId(levels: EffortConfig["levels"]): string {
  let index = levels.length + 1;
  while (levels.some((level) => level.id === `level-${index}`)) index += 1;
  return `level-${index}`;
}

export function EffortForm({
  value,
  onChange,
}: {
  value: EffortConfig | null;
  onChange: (next: EffortConfig | null) => void;
}) {
  const { t } = useTranslation();
  if (!value) {
    const off = t("settings.models.structured.effortOffSeed");
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border/50 px-2 py-2">
        <span className="text-[10px] leading-relaxed text-muted-foreground/80">
          {t("settings.models.structured.effortNull")}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({
              path: "reasoning_effort",
              default: "off",
              offLabel: off,
              levels: [{ id: "off", label: off, value: null }],
            })
          }
          className="h-6 shrink-0 px-2 text-[10px]"
        >
          {t("settings.models.structured.effortCreate")}
        </Button>
      </div>
    );
  }

  const levels = value.levels ?? [];
  const defaultId = value.default ?? levels[0]?.id ?? "";
  const updateLevel = (
    index: number,
    patch: Partial<EffortConfig["levels"][number]>,
  ) => {
    onChange({
      ...value,
      levels: levels.map((level, i) =>
        i === index ? { ...level, ...patch } : level,
      ),
    });
  };
  const removeLevel = (index: number) => {
    const remaining = levels.filter((_, i) => i !== index);
    if (remaining.length === 0) {
      onChange(null);
      return;
    }
    onChange({
      ...value,
      default:
        defaultId && remaining.some((level) => level.id === defaultId)
          ? defaultId
          : remaining[0].id,
      levels: remaining,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <MiniField
          label={t("settings.models.structured.effortPath")}
          info={t("settings.models.structured.effortPathInfo")}
        >
          <Input
            value={value.path ?? ""}
            onChange={(e) => onChange({ ...value, path: e.target.value })}
            placeholder="reasoning_effort"
            spellCheck={false}
            className="h-7 font-mono text-[10.5px]"
          />
        </MiniField>
        <MiniField
          label={t("settings.models.structured.effortDefault")}
          info={t("settings.models.structured.effortDefaultInfo")}
        >
          <Select
            value={defaultId}
            onValueChange={(v) => onChange({ ...value, default: v })}
            disabled={levels.length === 0}
          >
            <SelectTrigger className="h-7 text-[10.5px]">
              <SelectValue
                placeholder={t(
                  "settings.models.structured.effortDefaultPlaceholder",
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {levels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.label || level.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MiniField>
      </div>
      <MiniField
        label={t("settings.models.structured.effortOffLabel")}
        info={t("settings.models.structured.effortOffLabelInfo")}
      >
        <Input
          value={value.offLabel ?? ""}
          onChange={(e) =>
            onChange(
              withOptionalField(
                value,
                "offLabel",
                e.target.value || undefined,
              ),
            )
          }
          placeholder={t("settings.models.structured.effortOffSeed")}
          className="h-7 text-[10.5px]"
        />
      </MiniField>

      {levels.map((level, index) => (
        <div
          key={`${level.id || "level"}-${index}`}
          className="flex flex-col gap-2 rounded-md border border-border/50 bg-card/40 p-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              {t("settings.models.structured.levelTitle", {
                index: index + 1,
              })}
              {index === 0 ? t("settings.models.structured.levelLeftmost") : ""}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeLevel(index)}
              title={t("settings.models.structured.levelRemove")}
              className="size-6 text-muted-foreground hover:text-destructive"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={1.75} />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniField
              label={t("settings.models.structured.levelId")}
              info={t("settings.models.structured.levelIdInfo")}
            >
              <Input
                value={level.id ?? ""}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const wasDefault = defaultId === level.id;
                  onChange({
                    ...value,
                    ...(wasDefault ? { default: nextId } : {}),
                    levels: levels.map((item, i) =>
                      i === index ? { ...item, id: nextId } : item,
                    ),
                  });
                }}
                placeholder="off / low / high"
                spellCheck={false}
                className="h-7 font-mono text-[10.5px]"
              />
            </MiniField>
            <MiniField label={t("settings.models.structured.levelLabel")}>
              <Input
                value={level.label ?? ""}
                onChange={(e) => updateLevel(index, { label: e.target.value })}
                placeholder={t(
                  "settings.models.structured.levelLabelPlaceholder",
                )}
                className="h-7 text-[10.5px]"
              />
            </MiniField>
            <MiniField
              label={t("settings.models.structured.levelValue")}
              info={t("settings.models.structured.levelValueInfo")}
            >
              <Input
                value={displayEffortValue(level.value)}
                onChange={(e) =>
                  updateLevel(index, {
                    value: parseEffortValue(e.target.value),
                  })
                }
                placeholder={t(
                  "settings.models.structured.levelValuePlaceholder",
                )}
                spellCheck={false}
                className="h-7 font-mono text-[10.5px]"
              />
            </MiniField>
          </div>
        </div>
      ))}

      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const id = nextLevelId(levels);
          onChange({
            ...value,
            default: value.default ?? levels[0]?.id ?? id,
            levels: [...levels, { id, label: id, value: null }],
          });
        }}
        className="h-7 gap-1 self-start px-2 text-[10.5px]"
      >
        <HugeiconsIcon icon={Add01Icon} size={11} strokeWidth={2} />
        {t("settings.models.structured.addLevel")}
      </Button>
      <p className="flex items-start gap-1 text-[9.5px] leading-relaxed text-muted-foreground/60">
        <InfoHint text={t("settings.models.structured.effortRuleHint")} />
        {t("settings.models.structured.effortRule")}
      </p>
    </div>
  );
}

export function ExtraForm({
  value,
  onChange,
}: {
  value: JsonObject;
  onChange: (next: JsonObject) => void;
}) {
  const { t } = useTranslation();
  return (
    <KeyValueEditor
      value={value}
      onChange={(next) => onChange(next as JsonObject)}
      mode="json"
      keyPlaceholder={t("settings.models.structured.extraKeyPlaceholder")}
      valuePlaceholder={t("settings.models.structured.extraValuePlaceholder")}
      addLabel={t("settings.models.structured.extraAdd")}
    />
  );
}

export function HeadersForm({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const { t } = useTranslation();
  return (
    <KeyValueEditor
      value={value}
      onChange={(next) => {
        const out: Record<string, string> = {};
        for (const [key, item] of Object.entries(next)) {
          out[key] = typeof item === "string" ? item : JSON.stringify(item);
        }
        onChange(out);
      }}
      mode="string"
      keyPlaceholder={t("settings.models.structured.headerKeyPlaceholder")}
      valuePlaceholder={t("settings.models.structured.headerValuePlaceholder")}
      addLabel={t("settings.models.structured.headerAdd")}
    />
  );
}

export function ModelsApiForm({
  value,
  onChange,
}: {
  value: ModelsApiConfig | null;
  onChange: (next: ModelsApiConfig | null) => void;
}) {
  const { t } = useTranslation();
  if (!value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border/50 px-2 py-2">
        <span className="text-[10px] leading-relaxed text-muted-foreground/80">
          {t("settings.models.structured.modelsApiDisabled")}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({ path: "/models", itemsPath: "data", idPath: "id" })
          }
          className="h-6 shrink-0 px-2 text-[10px]"
        >
          {t("settings.models.structured.modelsApiEnable")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <MiniField
          label={t("settings.models.structured.apiPath")}
          info={t("settings.models.structured.apiPathInfo")}
        >
          <Input
            value={value.path ?? ""}
            onChange={(e) => onChange({ ...value, path: e.target.value })}
            placeholder="/models"
            spellCheck={false}
            className="h-7 font-mono text-[10.5px]"
          />
        </MiniField>
        <MiniField
          label={t("settings.models.structured.apiItemsPath")}
          info={t("settings.models.structured.apiItemsPathInfo")}
        >
          <Input
            value={value.itemsPath ?? ""}
            onChange={(e) => onChange({ ...value, itemsPath: e.target.value })}
            placeholder="data"
            spellCheck={false}
            className="h-7 font-mono text-[10.5px]"
          />
        </MiniField>
        <MiniField
          label={t("settings.models.structured.apiIdPath")}
          info={t("settings.models.structured.apiIdPathInfo")}
        >
          <Input
            value={value.idPath ?? ""}
            onChange={(e) => onChange({ ...value, idPath: e.target.value })}
            placeholder="id"
            spellCheck={false}
            className="h-7 font-mono text-[10.5px]"
          />
        </MiniField>
        <MiniField
          label={t("settings.models.structured.apiLabelPath")}
          info={t("settings.models.structured.apiLabelPathInfo")}
        >
          <Input
            value={value.labelPath ?? ""}
            onChange={(e) =>
              onChange(
                withOptionalField(
                  value,
                  "labelPath",
                  e.target.value || undefined,
                ),
              )
            }
            placeholder="name"
            spellCheck={false}
            className="h-7 font-mono text-[10.5px]"
          />
        </MiniField>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onChange(null)}
        className="h-6 self-start px-2 text-[10px]"
      >
        {t("settings.models.structured.modelsApiDisable")}
      </Button>
    </div>
  );
}
