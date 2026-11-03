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
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  duplicatePortIn,
  isValidPreviewPort,
  type PreviewPortPreset,
} from "./lib/portPresets";

type Props = {
  open: boolean;
  initial: PreviewPortPreset | null;
  presets: readonly PreviewPortPreset[];
  onOpenChange: (open: boolean) => void;
  onSave: (preset: PreviewPortPreset) => void;
};

export function PortPresetDialog({
  open,
  initial,
  presets,
  onOpenChange,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [label, setLabel] = useState("");
  const [port, setPort] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLabel(initial?.label ?? "");
    setPort(initial ? String(initial.port) : "");
    setHint(initial?.hint ?? "");
    setError(null);
  }, [initial, open]);

  const submit = () => {
    const trimmedLabel = label.trim();
    const numericPort = Number(port);
    if (!trimmedLabel) {
      setError(t("preview.portLabelRequired"));
      return;
    }
    if (!isValidPreviewPort(numericPort)) {
      setError(t("preview.portInvalid"));
      return;
    }
    if (duplicatePortIn(presets, numericPort, initial?.id)) {
      setError(t("preview.portDuplicate"));
      return;
    }
    onSave({
      id: initial?.id ?? newPresetId(),
      port: numericPort,
      label: trimmedLabel,
      hint: hint.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {initial ? t("preview.portEditTitle") : t("preview.portAddTitle")}
          </DialogTitle>
          <DialogDescription>{t("preview.portDialogDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label
            htmlFor={`${fieldId}-label`}
            className="flex flex-col gap-1.5 text-xs font-medium text-foreground"
          >
            {t("preview.portLabelField")}
            <Input
              id={`${fieldId}-label`}
              autoFocus
              value={label}
              placeholder={t("preview.portLabelPlaceholder")}
              onChange={(event) => {
                setLabel(event.target.value);
                setError(null);
              }}
            />
          </label>
          <label
            htmlFor={`${fieldId}-port`}
            className="flex flex-col gap-1.5 text-xs font-medium text-foreground"
          >
            {t("preview.portNumberField")}
            <Input
              id={`${fieldId}-port`}
              type="number"
              min={1}
              max={65535}
              inputMode="numeric"
              value={port}
              placeholder="3000"
              onChange={(event) => {
                setPort(event.target.value);
                setError(null);
              }}
            />
          </label>
          <label
            htmlFor={`${fieldId}-hint`}
            className="flex flex-col gap-1.5 text-xs font-medium text-foreground"
          >
            {t("preview.portHintField")}
            <Input
              id={`${fieldId}-hint`}
              value={hint}
              placeholder={t("preview.portHintPlaceholder")}
              onChange={(event) => setHint(event.target.value)}
            />
          </label>
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function newPresetId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `custom-${uuid}`;
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
