import type { CloseManyPending } from "@/app/hooks/tabCloseGuards";
import {
  type AppCloseBlocker,
  canOptOutOfAppClosePrompt,
} from "@/app/hooks/useAppCloseGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  type CloseAction,
  setConfirmCloseRunningTerminal,
} from "@/modules/settings/store";
import type { Tab } from "@/modules/tabs";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  tabs: Tab[];
  pendingCloseTab: number | null;
  onCancelClose: () => void;
  onConfirmClose: () => void;
  pendingTerminalCloseTab: number | null;
  onCancelTerminalClose: () => void;
  onConfirmTerminalClose: () => void;
  pendingDeleteTabs: number[] | null;
  onCancelDeleteClose: () => void;
  onConfirmDeleteClose: () => void;
  pendingCloseMany: CloseManyPending | null;
  closeManyConfirming: boolean;
  onCancelCloseMany: () => void;
  onConfirmCloseMany: () => void;
  pendingAppClose: AppCloseBlocker | null;
  onCancelAppClose: () => void;
  onConfirmAppClose: () => void;
  pendingCloseChoice: boolean;
  onCancelCloseChoice: () => void;
  onChooseCloseAction: (
    action: Exclude<CloseAction, "ask">,
    remember: boolean,
  ) => void;
};

type TFunction = (key: string, options?: Record<string, unknown>) => string;

function appCloseMessage(blocker: AppCloseBlocker, t: TFunction): string {
  const dirty = t("app.closeDialog.dirtyFragment", {
    count: blocker.dirtyEditors,
  });
  if (blocker.dirtyEditors > 0 && blocker.busyTerminal) {
    return t("app.closeDialog.appCloseBoth", { dirty });
  }
  if (blocker.dirtyEditors > 0) {
    return t("app.closeDialog.appCloseDirty", {
      count: blocker.dirtyEditors,
    });
  }
  return t("app.closeDialog.appCloseBusy");
}

function OptOutRow({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="-mt-3 flex items-center justify-center gap-2 sm:justify-start">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label
        htmlFor={id}
        className="font-normal text-[12px] text-muted-foreground"
      >
        {t("app.closeDialog.optOutRunningProcesses")}
      </Label>
    </div>
  );
}

async function persistOptOut(): Promise<void> {
  try {
    await setConfirmCloseRunningTerminal(false);
  } catch (e) {
    console.error("close-confirmation opt-out failed", e);
  }
}

function closeManyMessage(
  pending: CloseManyPending,
  tabs: Tab[],
  t: TFunction,
): string {
  const { kind, dirtyIds, busyLeafIds } = pending;
  const dirtyCount = dirtyIds.length;
  const busyCount = busyLeafIds.length;
  if (dirtyCount === 1 && busyCount === 0) {
    const dirty = tabs.find(
      (tab) => tab.kind === "editor" && dirtyIds.includes(tab.id),
    );
    return dirty?.title
      ? t("app.closeDialog.closeManyDirtyTitled", { title: dirty.title })
      : t("app.closeDialog.closeManyDirtySingle");
  }
  if (dirtyCount > 0 && busyCount > 0) {
    return t("app.closeDialog.closeManyDirtyAndBusy", {
      count: busyCount,
      dirty: t("app.closeDialog.closeManyDirtyTabs", { count: dirtyCount }),
      busy: t("app.closeDialog.closeManyBusy", { count: busyCount }),
    });
  }
  if (dirtyCount > 0) {
    return t("app.closeDialog.closeManyDirtyOnly", { count: dirtyCount });
  }
  return kind === "right"
    ? t("app.closeDialog.closeManyBusyRight", { count: busyCount })
    : t("app.closeDialog.closeManyBusyOthers", { count: busyCount });
}

/** Confirmation dialogs for closing dirty editors and terminals with live processes. */
export function CloseDialogs({
  tabs,
  pendingCloseTab,
  onCancelClose,
  onConfirmClose,
  pendingTerminalCloseTab,
  onCancelTerminalClose,
  onConfirmTerminalClose,
  pendingDeleteTabs,
  onCancelDeleteClose,
  onConfirmDeleteClose,
  pendingCloseMany,
  closeManyConfirming,
  onCancelCloseMany,
  onConfirmCloseMany,
  pendingAppClose,
  onCancelAppClose,
  onConfirmAppClose,
  pendingCloseChoice,
  onCancelCloseChoice,
  onChooseCloseAction,
}: Props) {
  const { t } = useTranslation();
  const [optOutTerminalClose, setOptOutTerminalClose] = useState(false);
  const [optOutAppClose, setOptOutAppClose] = useState(false);
  const [rememberCloseChoice, setRememberCloseChoice] = useState(false);
  const appCloseCanOptOut =
    pendingAppClose !== null && canOptOutOfAppClosePrompt(pendingAppClose);

  const confirmTerminalClose = () => {
    if (optOutTerminalClose) void persistOptOut();
    setOptOutTerminalClose(false);
    onConfirmTerminalClose();
  };

  const cancelTerminalClose = () => {
    setOptOutTerminalClose(false);
    onCancelTerminalClose();
  };

  // The pref write has to land before the window closes, or quitting drops it.
  const confirmAppClose = async () => {
    const optOut = appCloseCanOptOut && optOutAppClose;
    setOptOutAppClose(false);
    if (optOut) await persistOptOut();
    onConfirmAppClose();
  };

  const cancelAppClose = () => {
    setOptOutAppClose(false);
    onCancelAppClose();
  };

  const chooseCloseAction = (action: Exclude<CloseAction, "ask">) => {
    const remember = rememberCloseChoice;
    setRememberCloseChoice(false);
    onChooseCloseAction(action, remember);
  };

  const cancelCloseChoice = () => {
    setRememberCloseChoice(false);
    onCancelCloseChoice();
  };

  return (
    <>
      <AlertDialog
        open={pendingCloseChoice}
        onOpenChange={(open) => !open && cancelCloseChoice()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("app.closeChoice.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("app.closeChoice.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="-mt-3 flex items-center justify-center gap-2 sm:justify-start">
            <Checkbox
              id="remember-close-choice"
              checked={rememberCloseChoice}
              onCheckedChange={(value) => setRememberCloseChoice(value === true)}
            />
            <Label
              htmlFor="remember-close-choice"
              className="font-normal text-[12px] text-muted-foreground"
            >
              {t("app.closeChoice.remember")}
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelCloseChoice}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <Button
              variant="outline"
              size="sm"
              onClick={() => chooseCloseAction("tray")}
            >
              {t("app.closeChoice.minimizeToTray")}
            </Button>
            <AlertDialogAction onClick={() => chooseCloseAction("quit")}>
              {t("app.closeChoice.quit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingCloseTab !== null}
        onOpenChange={(open) => !open && onCancelClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("app.closeDialog.unsavedTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const title = tabs.find(
                  (tab) => tab.id === pendingCloseTab,
                )?.title;
                return title
                  ? t("app.closeDialog.unsavedTitled", { title })
                  : t("app.closeDialog.unsavedGeneric");
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelClose}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmClose}>
              {t("app.closeDialog.closeAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingTerminalCloseTab !== null}
        onOpenChange={(open) => !open && cancelTerminalClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("app.closeDialog.closeTerminalTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("app.closeDialog.closeTerminalDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <OptOutRow
            checked={optOutTerminalClose}
            onCheckedChange={setOptOutTerminalClose}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTerminalClose}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmTerminalClose}>
              {t("app.closeDialog.closeAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDeleteTabs !== null}
        onOpenChange={(open) => !open && onCancelDeleteClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("app.closeDialog.unsavedTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteTabs?.length === 1
                ? (() => {
                    const title = tabs.find(
                      (tab) => tab.id === pendingDeleteTabs[0],
                    )?.title;
                    return title
                      ? t("app.closeDialog.deletedTitled", { title })
                      : t("app.closeDialog.deletedGeneric");
                  })()
                : t("app.closeDialog.deletedMany", {
                    count: pendingDeleteTabs?.length ?? 0,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelDeleteClose}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDeleteClose}>
              {t("app.closeDialog.closeAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingCloseMany !== null}
        onOpenChange={(open) => !open && onCancelCloseMany()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCloseMany?.kind === "right"
                ? t("app.closeDialog.closeManyTitleRight")
                : t("app.closeDialog.closeManyTitleOthers")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCloseMany
                ? closeManyMessage(pendingCloseMany, tabs, t)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelCloseMany}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={closeManyConfirming}
              onClick={(event) => {
                event.preventDefault();
                onConfirmCloseMany();
              }}
            >
              {closeManyConfirming
                ? t("app.closeDialog.checking")
                : t("app.closeDialog.closeAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingAppClose !== null}
        onOpenChange={(open) => !open && cancelAppClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("app.closeDialog.quitTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAppClose ? appCloseMessage(pendingAppClose, t) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {appCloseCanOptOut ? (
            <OptOutRow
              checked={optOutAppClose}
              onCheckedChange={setOptOutAppClose}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAppClose}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmAppClose()}>
              {t("app.closeDialog.quitAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
