import { Kbd } from "@/components/ui/kbd";
import { shortcutHintLabel, useShortcutHint } from "@/modules/shortcuts";
import { useTranslation } from "react-i18next";

export function AiOpenButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const hint = useShortcutHint("ai.toggle");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-6 animate-in slide-in-from-top-2 items-center gap-1.5 rounded-md border border-border/60 bg-card px-2 text-xs text-muted-foreground transition-colors duration-200 ease-out hover:border-border hover:bg-accent hover:text-foreground"
      title={shortcutHintLabel(t("ai.statusbar.openAiAgent"), hint)}
    >
      <span>{t("ai.statusbar.openAiAgent")}</span>
      {hint ? <Kbd className="h-4 min-w-4 px-1">{hint}</Kbd> : null}
    </button>
  );
}
