import { describe, expect, it } from "vitest";

import { type BlockMarkerEvent, BlockCommandAnchorProbe } from "./blockAnchorProbe";

function feed(probe: BlockCommandAnchorProbe, events: BlockMarkerEvent[]) {
  for (const event of events) probe.handle(event);
}

describe("BlockCommandAnchorProbe", () => {
  it("flags a command cycle that completed without a command start", () => {
    const probe = new BlockCommandAnchorProbe();
    feed(probe, ["prompt-start", "prompt-end", "end-of-command"]);
    expect(probe.commandAnchorMissing).toBe(true);
  });

  it("stays quiet when the command start arrives (PSReadLine present)", () => {
    const probe = new BlockCommandAnchorProbe();
    feed(probe, [
      "prompt-start",
      "prompt-end",
      "end-of-input",
      "end-of-command",
    ]);
    expect(probe.commandAnchorMissing).toBe(false);
  });

  it("ignores the idle end-of-command emitted before the first prompt", () => {
    const probe = new BlockCommandAnchorProbe();
    feed(probe, ["end-of-command", "prompt-start", "prompt-end"]);
    expect(probe.commandAnchorMissing).toBe(false);
  });

  it("resets per prompt cycle: a later anchored cycle is not flagged", () => {
    const probe = new BlockCommandAnchorProbe();
    feed(probe, [
      "prompt-start",
      "prompt-end",
      "end-of-input",
      "end-of-command",
    ]);
    feed(probe, ["prompt-start", "prompt-end", "end-of-command"]);
    expect(probe.commandAnchorMissing).toBe(true);
  });

  it("keeps the flag once an unanchored cycle is seen", () => {
    const probe = new BlockCommandAnchorProbe();
    feed(probe, ["prompt-start", "prompt-end", "end-of-command"]);
    feed(probe, [
      "prompt-start",
      "prompt-end",
      "end-of-input",
      "end-of-command",
    ]);
    expect(probe.commandAnchorMissing).toBe(true);
  });
});
