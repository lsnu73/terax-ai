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
  JsonObject,
  JsonValue,
  ModelsApiConfig,
  ParamDef,
  ThinkingConfig,
} from "@/modules/ai/config";
import {
  Add01Icon,
  Cancel01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

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

function displayEnum(values: JsonValue[] | undefined): string {
  return (values ?? [])
    .map((value) => (typeof value === "string" ? value : JSON.stringify(value)))
    .join(", ");
}

function parseEnum(text: string): JsonValue[] | undefined {
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.map((part) => parseLoose(part).value ?? part);
}

function withOptionalField<T>(base: T, key: string, value: unknown): T {
  const next = { ...(base as Record<string, unknown>) };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next as T;
}

/** 小号信息图标 + 悬浮说明。每个图标自带 Provider，避免设置窗口漏包 Provider。 */
export function InfoHint({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="查看说明"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 cursor-help items-center text-muted-foreground/50 transition-colors hover:text-foreground"
          >
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={11}
              strokeWidth={1.75}
            />
          </button>
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
          {item === "form" ? "表单" : "JSON"}
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
      setError(`无法切换到表单：当前 JSON 解析失败（${json.error}）`);
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
            当前 JSON 无法转换为表单，请切回 JSON 模式修正。
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
    return { ok: false, error: "Params 必须是数组，例如 []。" };
  }
  if (!value.every(isRecord)) {
    return { ok: false, error: "Params 数组中的每一项都必须是对象。" };
  }
  return { ok: true, value: value as ParamDef[] };
}

export function parseThinking(value: unknown): ParseResult<ThinkingConfig | null> {
  if (value === null) return { ok: true, value: null };
  if (!isRecord(value) || !Array.isArray(value.levels)) {
    return {
      ok: false,
      error: "Thinking 必须是 null，或包含 levels 数组的对象。",
    };
  }
  return { ok: true, value: value as unknown as ThinkingConfig };
}

export function parseExtra(value: unknown): ParseResult<JsonObject> {
  if (!isRecord(value)) {
    return { ok: false, error: "Extra 必须是一个 JSON 对象，例如 {}。" };
  }
  return { ok: true, value: value as JsonObject };
}

export function parseHeaders(
  value: unknown,
): ParseResult<Record<string, string>> {
  if (!isRecord(value)) {
    return { ok: false, error: "Headers 必须是一个 JSON 对象，例如 {}。" };
  }
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string") {
      return { ok: false, error: `请求头 "${key}" 的值必须是字符串。` };
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
      error: "Models API 必须是 null，或包含 path / itemsPath / idPath 的对象。",
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

  return (
    <div className="flex flex-col gap-1.5">
      {rows.length === 0 ? (
        <span className="text-[10px] text-muted-foreground/70">
          还没有键值对。
        </span>
      ) : null}
      {rows.map((row, index) => (
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
            title="删除这一行"
            className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={1.75} />
          </Button>
        </div>
      ))}
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
    </div>
  );
}

export function ParamsForm({
  value,
  onChange,
}: {
  value: ParamDef[];
  onChange: (next: ParamDef[]) => void;
}) {
  const rows = value as ParamDef[];
  const update = (index: number, patch: Partial<ParamDef>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/50 px-2 py-2 text-[10px] leading-relaxed text-muted-foreground/80">
          未声明额外参数。大多数 OpenAI 兼容厂商可以留空；只有需要发送思考等级等
          厂商专有字段时才需要添加。
        </p>
      ) : null}
      {rows.map((row, index) => (
        <div
          key={`${row.key || "param"}-${index}`}
          className="flex flex-col gap-2 rounded-md border border-border/50 bg-card/40 p-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              参数 #{index + 1}
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Switch
                  checked={row.enabled !== false}
                  onCheckedChange={(checked) =>
                    update(index, { enabled: checked })
                  }
                />
                启用
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                title="删除该参数"
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
              label="Key（逻辑键）"
              info="思考档位通过这个键引用参数；同一 Provider 下重复声明会覆盖旧定义。"
            >
              <Input
                value={row.key ?? ""}
                onChange={(e) => {
                  const previous = row.key ?? "";
                  const nextKey = e.target.value;
                  update(index, {
                    key: nextKey,
                    path:
                      !row.path || row.path === previous ? nextKey : row.path,
                  });
                }}
                placeholder="reasoning_effort"
                spellCheck={false}
                className="h-7 font-mono text-[10.5px]"
              />
            </MiniField>
            <MiniField label="显示名（可选）">
              <Input
                value={row.label ?? ""}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="Reasoning effort"
                spellCheck={false}
                className="h-7 text-[10.5px]"
              />
            </MiniField>
            <MiniField
              label="位置"
              info="body 写入 JSON 请求体；header 作为 HTTP 请求头发送。"
            >
              <Select
                value={row.location ?? "body"}
                onValueChange={(v) =>
                  update(index, { location: v as ParamDef["location"] })
                }
              >
                <SelectTrigger className="h-7 text-[10.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="body">body（请求体）</SelectItem>
                  <SelectItem value="header">header（请求头）</SelectItem>
                </SelectContent>
              </Select>
            </MiniField>
            <MiniField
              label="类型"
              info="仅用于说明与校验；实际发送值仍由输入决定。"
            >
              <Select
                value={row.type ?? "string"}
                onValueChange={(v) =>
                  update(index, { type: v as ParamDef["type"] })
                }
              >
                <SelectTrigger className="h-7 text-[10.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["string", "number", "boolean", "object", "array"] as const
                  ).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </MiniField>
            <MiniField
              label="发送路径"
              info="实际写入请求的键名。点号会创建嵌套对象，例如 thinking.type。"
            >
              <Input
                value={row.path ?? ""}
                onChange={(e) => update(index, { path: e.target.value })}
                placeholder="thinking.type"
                spellCheck={false}
                className="h-7 font-mono text-[10.5px]"
              />
            </MiniField>
            <MiniField
              label="可选值（逗号分隔）"
              info="限制该参数允许的取值；映射结果不在列表内时会被跳过并告警。留空表示不限制。"
            >
              <Input
                value={displayEnum(row.enum)}
                onChange={(e) =>
                  onChange(
                    rows.map((item, i) =>
                      i === index
                        ? withOptionalField(
                            item,
                            "enum",
                            parseEnum(e.target.value),
                          )
                        : item,
                    ),
                  )
                }
                placeholder="low, medium, high"
                spellCheck={false}
                className="h-7 font-mono text-[10.5px]"
              />
            </MiniField>
          </div>
          <MiniField
            label="默认值"
            info="档位没有覆盖时发送该值。留空表示不设置；支持 high、1024、true 或完整 JSON。"
          >
            <Input
              value={displayLoose(row.default)}
              onChange={(e) =>
                onChange(
                  rows.map((item, i) =>
                    i === index
                      ? withOptionalField(
                          item,
                          "default",
                          parseLoose(e.target.value).value,
                        )
                      : item,
                  ),
                )
              }
              placeholder="留空 / high / 1024 / true"
              spellCheck={false}
              className="h-7 font-mono text-[10.5px]"
            />
          </MiniField>
          <MiniField
            label="取值映射 map"
            info="逻辑档位值 -> 实际发送值。值为 null 表示该档位省略此参数（用于关闭思考）。"
          >
            <KeyValueEditor
              value={row.map ?? {}}
              onChange={(next) =>
                onChange(
                  rows.map((item, i) =>
                    i === index
                      ? withOptionalField(
                          item,
                          "map",
                          Object.keys(next).length > 0 ? next : undefined,
                        )
                      : item,
                  ),
                )
              }
              mode="json"
              keyPlaceholder="逻辑值，如 medium"
              valuePlaceholder="发送值，如 high；写 null 表示省略"
              addLabel="添加映射"
            />
          </MiniField>
          <MiniField label="说明（可选）">
            <Input
              value={row.description ?? ""}
              onChange={(e) => update(index, { description: e.target.value })}
              placeholder="给未来的自己留一句说明"
              className="h-7 text-[10.5px]"
            />
          </MiniField>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onChange([
            ...rows,
            {
              key: "",
              label: "",
              location: "body",
              path: "",
              type: "string",
              enabled: true,
            },
          ])
        }
        className="h-7 gap-1 self-start px-2 text-[10.5px]"
      >
        <HugeiconsIcon icon={Add01Icon} size={11} strokeWidth={2} />
        添加参数
      </Button>
    </div>
  );
}

function nextLevelId(levels: ThinkingConfig["levels"]): string {
  let index = levels.length + 1;
  while (levels.some((level) => level.id === `level-${index}`)) index += 1;
  return `level-${index}`;
}

export function ThinkingForm({
  value,
  onChange,
}: {
  value: ThinkingConfig | null;
  onChange: (next: ThinkingConfig | null) => void;
}) {
  if (!value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border/50 px-2 py-2">
        <span className="text-[10px] leading-relaxed text-muted-foreground/80">
          当前为 null：该模型不会显示思考滑块，也不会发送思考参数。
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({
              default: "off",
              offLabel: "关闭",
              levels: [{ id: "off", label: "关闭", values: {} }],
            })
          }
          className="h-6 shrink-0 px-2 text-[10px]"
        >
          创建思考档位
        </Button>
      </div>
    );
  }

  const levels = value.levels ?? [];
  const defaultId = value.default ?? levels[0]?.id ?? "";
  const updateLevel = (
    index: number,
    patch: Partial<ThinkingConfig["levels"][number]>,
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
          label="默认档位"
          info="用户没有手动选择时使用该档位；删除默认档位后会回退到第一档。"
        >
          <Select
            value={defaultId}
            onValueChange={(v) => onChange({ ...value, default: v })}
            disabled={levels.length === 0}
          >
            <SelectTrigger className="h-7 text-[10.5px]">
              <SelectValue placeholder="选择默认档位" />
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
        <MiniField
          label="最左档位标签"
          info="滑条最左端的文字，一般为“关闭”。"
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
            placeholder="关闭"
            className="h-7 text-[10.5px]"
          />
        </MiniField>
      </div>

      {levels.map((level, index) => (
        <div
          key={`${level.id || "level"}-${index}`}
          className="flex flex-col gap-2 rounded-md border border-border/50 bg-card/40 p-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              档位 #{index + 1}
              {index === 0 ? "（最左 / 关闭）" : ""}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeLevel(index)}
              title="删除该档位"
              className="size-6 text-muted-foreground hover:text-destructive"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={10}
                strokeWidth={1.75}
              />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniField
              label="档位 ID"
              info="保存到偏好的稳定标识；修改后已选中的用户会回退到默认档位。"
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
            <MiniField label="显示名">
              <Input
                value={level.label ?? ""}
                onChange={(e) =>
                  updateLevel(index, { label: e.target.value })
                }
                placeholder="低 / 高 / 最高"
                className="h-7 text-[10.5px]"
              />
            </MiniField>
          </div>
          <MiniField
            label="档位参数值"
            info="参数 key -> 逻辑值。值为 null 表示该档位不发送这个参数；例如关闭思考时可发送 thinking.type=disabled 并省略 reasoning_effort。"
          >
            <KeyValueEditor
              value={level.values ?? {}}
              onChange={(next) => updateLevel(index, { values: next })}
              mode="json"
              keyPlaceholder="参数 key，如 reasoning_effort"
              valuePlaceholder="逻辑值，如 high；null 表示省略"
              addLabel="添加参数值"
            />
          </MiniField>
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
            levels: [...levels, { id, label: id, values: {} }],
          });
        }}
        className="h-7 gap-1 self-start px-2 text-[10.5px]"
      >
        <HugeiconsIcon icon={Add01Icon} size={11} strokeWidth={2} />
        添加档位
      </Button>
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
  return (
    <KeyValueEditor
      value={value}
      onChange={(next) => onChange(next as JsonObject)}
      mode="json"
      keyPlaceholder="键，如 stream_options 或 thinking.type"
      valuePlaceholder='值，如 {"include_usage":true} / true / high'
      addLabel="添加额外字段"
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
      keyPlaceholder="头名称，如 HTTP-Referer"
      valuePlaceholder="头内容"
      addLabel="添加请求头"
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
  if (!value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border/50 px-2 py-2">
        <span className="text-[10px] leading-relaxed text-muted-foreground/80">
          未启用模型列表接口：该 Provider 只能手动添加模型。
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({ path: "/models", itemsPath: "data", idPath: "id" })
          }
          className="h-6 shrink-0 px-2 text-[10px]"
        >
          启用
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <MiniField
          label="接口路径"
          info="追加到 Base URL 后的路径，通常为 /models。"
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
          label="数组位置 itemsPath"
          info="响应 JSON 中模型数组的点路径；留空表示响应根节点就是数组。"
        >
          <Input
            value={value.itemsPath ?? ""}
            onChange={(e) =>
              onChange({ ...value, itemsPath: e.target.value })
            }
            placeholder="data"
            spellCheck={false}
            className="h-7 font-mono text-[10.5px]"
          />
        </MiniField>
        <MiniField
          label="模型 ID 字段 idPath"
          info="数组中每个条目的模型 ID 字段名，通常为 id。"
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
          label="显示名字段 labelPath"
          info="可选。数组条目中的人类可读名称字段；留空则直接使用模型 ID 作为显示名。"
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
        关闭模型列表接口
      </Button>
    </div>
  );
}
