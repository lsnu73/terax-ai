import { agents } from "@/modules/i18n/locales/en/agents";
import i18next from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import { displayAgent } from "./format";

// displayAgent 的兜底文案走 i18n；这里用真实英文词典初始化 i18next。
beforeAll(async () => {
  await i18next.init({
    resources: { en: { translation: { agents } } },
    lng: "en",
  });
});

describe("displayAgent", () => {
  it("maps known agent ids to their display labels", () => {
    expect(displayAgent("claude")).toBe("Claude Code");
    expect(displayAgent("codex")).toBe("Codex");
    expect(displayAgent("pi")).toBe("Pi");
  });

  it("looks the label up case-insensitively", () => {
    expect(displayAgent("CLAUDE")).toBe("Claude Code");
    expect(displayAgent("gEmInI")).toBe("Gemini");
  });

  it("capitalizes an unknown agent id", () => {
    expect(displayAgent("foobar")).toBe("Foobar");
  });

  it("falls back to 'Agent' for an empty id", () => {
    expect(displayAgent("")).toBe("Agent");
  });
});
