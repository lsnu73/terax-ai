import { Button } from "@/components/ui/button";
import {
  Add01Icon,
  ArrowUpIcon,
  StopCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { UIMessage } from "ai";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { AiPanelPrefill } from "../lib/aiPanelBridge";
import {
  ACCEPTED_FILES,
  AiComposerProvider,
  type FileAttachment,
  useComposer,
} from "../lib/composer";
import type { ComposerSubmission } from "../lib/composerMessage";
import { AgentSwitcher } from "./AgentSwitcher";
import { AiComposerInput } from "./AiComposerInput";
import { AiContextIndicator } from "./AiContextIndicator";
import { ApprovalModeToggle } from "./ApprovalModeToggle";
import { ChipsRow } from "./ChipsRow";
import { ModelPicker } from "./ModelPicker";

export function AiPanelComposer({
  prefill,
  onPrefillApplied,
  onSend,
  onStop,
  messages,
  onSelectModel,
}: {
  prefill: AiPanelPrefill | null;
  onPrefillApplied: () => void;
  onSend: (submission: ComposerSubmission) => Promise<void>;
  onStop: () => void;
  /** 会话消息，供上下文用量指示器展示；会话未就绪时为 null。 */
  messages: UIMessage[] | null;
  onSelectModel: (id: string) => void;
}) {
  return (
    <AiComposerProvider sendSubmission={onSend} stopSubmission={onStop}>
      <ComposerPrefill prefill={prefill} onApplied={onPrefillApplied} />
      <div className="shrink-0 border-t border-border/60 bg-card/40 px-3 py-2">
        <ComposerChips />
        <ComposerControls />
        <ComposerMetaRow messages={messages} onSelectModel={onSelectModel} />
      </div>
    </AiComposerProvider>
  );
}

/**
 * 输入框下方的元信息行：角色切换、执行审批模式、上下文用量与模型切换。
 */
function ComposerMetaRow({
  messages,
  onSelectModel,
}: {
  messages: UIMessage[] | null;
  onSelectModel: (id: string) => void;
}) {
  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <AgentSwitcher isMiniWindow />
      <ApprovalModeToggle />
      {messages ? <AiContextIndicator messages={messages} /> : null}
      <div className="flex-1" />
      <ModelPicker onSelectModel={onSelectModel} />
    </div>
  );
}

function ComposerPrefill({
  prefill,
  onApplied,
}: {
  prefill: AiPanelPrefill | null;
  onApplied: () => void;
}) {
  const { t } = useTranslation();
  const composer = useComposer();
  const lastPrefillAt = useRef(0);

  useEffect(() => {
    if (!prefill || prefill.at === lastPrefillAt.current) return;
    lastPrefillAt.current = prefill.at;
    if (prefill.text) {
      const text = prefill.text;
      composer.setValue((value) => (value ? `${text}${value}` : text));
    }
    if (prefill.selection) {
      const selection = prefill.selection;
      const file: FileAttachment = {
        id: `selection-${prefill.at}`,
        name:
          selection.source === "editor"
            ? t("ai.chat.editorSelection")
            : t("ai.chat.terminalSelection"),
        kind: "selection",
        mediaType: "text/plain",
        text: selection.text,
        size: selection.text.length,
        source: selection.source,
      };
      composer.addAttachments([file]);
    }
    const paths = prefill.attachmentPaths ?? [];
    if (paths.length > 0) {
      void composer.attachFilesByPaths(paths);
    }
    onApplied();
    requestAnimationFrame(() => composer.textareaRef.current?.focus());
  }, [composer, onApplied, prefill, t]);

  return null;
}

function ComposerChips() {
  const { t } = useTranslation();
  const composer = useComposer();
  if (
    composer.files.length === 0 &&
    composer.pickedSnippets.length === 0 &&
    composer.pickedCommands.length === 0
  ) {
    return null;
  }
  return (
    <div className="mb-1.5">
      {composer.files.length > 0 ? (
        <div className="mb-1 text-[10.5px] font-medium tracking-wide text-muted-foreground">
          {t("ai.composer.attachments", { count: composer.files.length })}
        </div>
      ) : null}
      <ChipsRow
        files={composer.files}
        onRemoveFile={composer.removeFile}
        snippets={composer.pickedSnippets}
        onRemoveSnippet={(id) => {
          const snippet = composer.pickedSnippets.find(
            (item) => item.id === id,
          );
          composer.removeSnippet(id);
          if (!snippet) return;
          const token = new RegExp(`(^|\\s)#${snippet.handle}\\b ?`);
          composer.setValue((value) =>
            value.replace(token, (_match, lead: string) => lead),
          );
        }}
        commands={composer.pickedCommands}
        onRemoveCommand={composer.removeCommand}
      />
    </div>
  );
}

function ComposerControls() {
  const { t } = useTranslation();
  const composer = useComposer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-end gap-2 rounded-lg border border-border/60 bg-white px-1.5 py-1 dark:bg-background">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILES}
        className="hidden"
        onChange={(event) => {
          void composer.addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-7 shrink-0"
        title={t("ai.statusbar.attachFile")}
        onClick={() => fileInputRef.current?.click()}
      >
        <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} />
      </Button>
      <AiComposerInput showAgentSwitcher={false} />
      {composer.isBusy ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          title={t("ai.statusbar.stop")}
          onClick={composer.stop}
        >
          <HugeiconsIcon icon={StopCircleIcon} size={13} strokeWidth={1.75} />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          className="size-7 shrink-0"
          title={t("ai.statusbar.sendEnter")}
          disabled={!composer.canSend}
          onClick={composer.submit}
        >
          <HugeiconsIcon icon={ArrowUpIcon} size={13} strokeWidth={2} />
        </Button>
      )}
    </div>
  );
}
