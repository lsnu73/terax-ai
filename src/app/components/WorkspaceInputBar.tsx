import { useBlockController } from "@/modules/terminal/lib/blockController";
import { focusLeafInput } from "@/modules/terminal/lib/terminalSessionApi";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const ShellInput = lazy(() => import("@/modules/terminal/block/ShellInput"));

type Props = {
  activeLeafId: number | null;
};

export function WorkspaceInputBar({ activeLeafId }: Props) {
  const { t } = useTranslation();
  const controller = useBlockController(activeLeafId);
  const blockMode = controller?.blockMode ?? "prompt";

  if (activeLeafId === null) return null;

  return (
    <div data-workspace-input className="terax-reveal" data-state="open">
      <div className="shrink-0 border-t border-border/60 bg-foreground/[0.02] px-3 py-2">
        <div className="relative min-w-0 flex-1">
          {controller ? (
            blockMode === "plain" ? (
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => focusLeafInput(activeLeafId)}
              >
                {t("app.workspaceInput.typeInTerminal")}
              </button>
            ) : (
              <Suspense fallback={null}>
                <ShellInput
                  leafId={activeLeafId}
                  mode={blockMode}
                  focused
                  onSubmit={controller.submitCommand}
                  onInterrupt={controller.interrupt}
                  getCwd={controller.getCwd}
                />
              </Suspense>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
