import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LockPasswordIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  busy: boolean;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
};

/**
 * Asks for the SSH key passphrase before retrying a push. git runs without a
 * TTY, so an encrypted key cannot unlock itself — the passphrase is handed to
 * an askpass helper on the Rust side for the retry only and never stored.
 */
export function SshPassphraseDialog({ open, busy, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [passphrase, setPassphrase] = useState("");

  useEffect(() => {
    if (open) {
      setPassphrase("");
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passphrase || busy) return;
    onSubmit(passphrase);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="w-[min(420px,calc(100vw-32px))] gap-0 rounded-3xl! p-0">
        <DialogHeader className="gap-1.5 p-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon
              icon={LockPasswordIcon}
              size={14}
              strokeWidth={1.75}
              className="text-muted-foreground"
            />
            {t("sourceControl.sshPassphrase.title")}
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-relaxed">
            {t("sourceControl.sshPassphrase.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="px-5 pt-3">
            <Input
              ref={inputRef}
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder={t("sourceControl.sshPassphrase.placeholder")}
              autoComplete="off"
              className="h-8 text-[12px]"
            />
          </div>
          <DialogFooter className="flex-row items-center gap-2 p-5 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 cursor-pointer text-[11.5px]"
              onClick={onCancel}
            >
              {t("sourceControl.sshPassphrase.cancel")}
            </Button>
            <Button
              type="submit"
              size="xs"
              className="h-7 cursor-pointer text-[11.5px]"
              disabled={!passphrase || busy}
            >
              {busy
                ? t("sourceControl.commit.pushing")
                : t("sourceControl.sshPassphrase.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
