export type AiPanelSelection = {
  text: string;
  source: "terminal" | "editor";
};

export type AiPanelPrefill = {
  at: number;
  text?: string;
  selection?: AiPanelSelection;
  attachmentPaths?: string[];
};
