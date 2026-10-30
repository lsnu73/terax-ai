import {
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { writeTerminalClipboard } from "@/modules/terminal/lib/terminalClipboard";
import { prefillAiWindow } from "@/modules/ai/lib/aiWindow";
import {
  ComputerTerminal02Icon,
  Copy01Icon,
  Refresh01Icon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { PositionedBlock } from "./lib/blockTypes";
import { capAttachOutput } from "./lib/outputCap";

type Props = {
  block: PositionedBlock | null;
  promptReady: boolean;
  readOutput: (id: string) => string | null;
  onRunAgain: (command: string) => void;
  onSearch: (id: string) => void;
  onRestoreFocus: () => void;
};

export function BlockContextMenu({
  block,
  promptReady,
  readOutput,
  onRunAgain,
  onSearch,
  onRestoreFocus,
}: Props) {
  const { t } = useTranslation();
  if (!block) return null;

  const output = () => readOutput(block.id) ?? "";
  const copy = (text: string, message: string) => {
    void writeTerminalClipboard(text)
      .then(() => toast.success(message))
      .catch(() => {});
  };
  const attach = () => {
    const out = capAttachOutput(output());
    const text = out ? `$ ${block.command}\n${out}` : `$ ${block.command}`;
    prefillAiWindow({ selection: { text, source: "terminal" } });
  };

  return (
    <ContextMenuContent
      className="min-w-52"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        onRestoreFocus();
      }}
    >
      <MenuItem
        icon={Refresh01Icon}
        label={t("terminal.block.runAgain")}
        disabled={block.running || !promptReady || !block.canRerun}
        onClick={() => onRunAgain(block.command)}
      />
      <MenuItem
        icon={Copy01Icon}
        label={t("terminal.block.copyCommand")}
        disabled={!block.command}
        onClick={() => copy(block.command, t("terminal.block.commandCopied"))}
      />
      <MenuItem
        icon={ComputerTerminal02Icon}
        label={t("terminal.block.copyOutput")}
        onClick={() => {
          const text = output();
          if (text) copy(text, t("terminal.block.outputCopied"));
        }}
      />
      <MenuItem
        icon={Copy01Icon}
        label={t("terminal.block.copyCommandAndOutput")}
        onClick={() => {
          copy(`$ ${block.command}\n${output()}`, t("terminal.block.blockCopied"));
        }}
      />
      <MenuItem
        icon={SparklesIcon}
        label={t("terminal.block.attachToAi")}
        onClick={attach}
      />
      <MenuItem
        icon={Search01Icon}
        label={t("terminal.block.findInBlock")}
        onClick={() => onSearch(block.id)}
      />
    </ContextMenuContent>
  );
}

function MenuItem({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof Copy01Icon;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <ContextMenuItem
      disabled={disabled}
      onSelect={onClick}
      className="gap-2 rounded-xl px-2.5 py-1.5 text-xs"
    >
      <HugeiconsIcon icon={icon} size={13} strokeWidth={1.75} />
      {label}
    </ContextMenuItem>
  );
}
