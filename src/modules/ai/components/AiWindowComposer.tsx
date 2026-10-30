import { Button } from "@/components/ui/button";
import {
  Add01Icon,
  ArrowUpIcon,
  StopCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { AiWindowPrefill } from "../lib/aiWindowBridge";
import {
  ACCEPTED_FILES,
  AiComposerProvider,
  useComposer,
  type FileAttachment,
} from "../lib/composer";
import type { ComposerSubmission } from "../lib/composerMessage";
import { AiComposerInput } from "./AiComposerInput";
import { ChipsRow } from "./ChipsRow";

export function AiWindowComposer({
  prefill,
  onPrefillApplied,
  onSend,
  onStop,
}: {
  prefill: AiWindowPrefill | null;
  onPrefillApplied: () => void;
  onSend: (submission: ComposerSubmission) => Promise<void>;
  onStop: () => void;
}) {
  return (
    <AiComposerProvider sendSubmission={onSend} stopSubmission={onStop}>
      <ComposerPrefill prefill={prefill} onApplied={onPrefillApplied} />
      <div className="shrink-0 border-t border-border/60 bg-card/40 px-3 py-2">
        <ComposerChips />
        <ComposerControls />
      </div>
    </AiComposerProvider>
  );
}

function ComposerPrefill({
  prefill,
  onApplied,
}: {
  prefill: AiWindowPrefill | null;
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
    for (const path of prefill.attachmentPaths ?? []) {
      void composer.attachFileByPath(path);
    }
    onApplied();
    requestAnimationFrame(() => composer.textareaRef.current?.focus());
  }, [composer, onApplied, prefill, t]);

  return null;
}

function ComposerChips() {
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
      <ChipsRow
        files={composer.files}
        onRemoveFile={composer.removeFile}
        snippets={composer.pickedSnippets}
        onRemoveSnippet={(id) => {
          const snippet = composer.pickedSnippets.find((item) => item.id === id);
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
    <div className="flex items-end gap-2">
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
        disabled={composer.isBusy}
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
          <HugeiconsIcon icon={ArrowUpIcon} size={13} strokeWidth={1.75} />
        </Button>
      )}
    </div>
  );
}
