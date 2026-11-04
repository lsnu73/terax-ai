import { describe, expect, it } from "vitest";
import { buildSearchTreeRows, type SearchHit } from "./searchTree";

const root = "/workspace/my_project";

function hit(rel: string, isDir = false): SearchHit {
  const segments = rel.split("/");
  const name = segments[segments.length - 1] ?? rel;
  return {
    path: `${root}/${rel}`,
    rel,
    name,
    is_dir: isDir,
  };
}

function outline(rows: ReturnType<typeof buildSearchTreeRows>): string[] {
  return rows.map((row) => `${"  ".repeat(row.depth)}${row.name}`);
}

describe("buildSearchTreeRows", () => {
  it("keeps only the matched file and its ancestors without the root row", () => {
    const rows = buildSearchTreeRows(root, [hit("src/core/main.py")]);

    expect(outline(rows)).toEqual(["src", "  core", "    main.py"]);
    expect(rows.map((row) => row.path)).toEqual([
      `${root}/src`,
      `${root}/src/core`,
      `${root}/src/core/main.py`,
    ]);
  });

  it("shares ancestors and preserves ranked sibling order", () => {
    const rows = buildSearchTreeRows(root, [
      hit("src/utils/helper.py"),
      hit("src/core/main.py"),
    ]);

    expect(outline(rows)).toEqual([
      "src",
      "  utils",
      "    helper.py",
      "  core",
      "    main.py",
    ]);
    expect(rows.filter((row) => row.rel === "src")).toHaveLength(1);
  });

  it("retains root-level hits as top-level rows", () => {
    const rows = buildSearchTreeRows(root, [
      hit("config.yaml"),
      hit("requirements.txt"),
    ]);

    expect(outline(rows)).toEqual(["config.yaml", "requirements.txt"]);
  });

  it("merges a real directory hit into its synthesized ancestor", () => {
    const rows = buildSearchTreeRows("/workspace/root/", [
      {
        ...hit("src/core/main.py"),
        path: "C:\\workspace\\my_project\\src\\core\\main.py",
      },
      {
        ...hit("src", true),
        path: "C:\\workspace\\my_project\\src",
      },
    ]);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      path: "C:\\workspace\\my_project\\src",
      rel: "src",
      name: "src",
      is_dir: true,
    });
    expect(rows[1].path).toBe("/workspace/root/src/core");
    expect(rows[2].path).toBe("C:\\workspace\\my_project\\src\\core\\main.py");
  });

  it("omits descendants of collapsed directories", () => {
    const hits = [hit("src/utils/helper.py"), hit("src/core/main.py")];
    const rows = buildSearchTreeRows(root, hits, new Set([`${root}/src`]));

    expect(outline(rows)).toEqual(["src"]);
  });

  it("returns no rows without valid hits", () => {
    expect(buildSearchTreeRows(root, [])).toEqual([]);
  });
});
