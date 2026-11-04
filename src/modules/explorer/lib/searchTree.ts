import { joinPath } from "./useFileTree";

export type SearchHit = {
  path: string;
  rel: string;
  name: string;
  is_dir: boolean;
};

export type SearchTreeRow = SearchHit & {
  depth: number;
};

type SearchTreeNode = SearchHit & {
  children: SearchTreeNode[];
};

export function buildSearchTreeRows(
  rootPath: string,
  hits: SearchHit[],
  collapsedPaths: ReadonlySet<string> = new Set(),
): SearchTreeRow[] {
  const root: SearchTreeNode = {
    path: rootPath,
    rel: "",
    name: "",
    is_dir: true,
    children: [],
  };
  const nodes = new Map<string, SearchTreeNode>([["", root]]);

  for (const hit of hits) {
    const segments = hit.rel.split("/").filter(Boolean);
    if (segments.length === 0) continue;
    let parent = root;
    let rel = "";

    for (const [index, segment] of segments.entries()) {
      rel = rel ? `${rel}/${segment}` : segment;
      const isHit = index === segments.length - 1;
      let node = nodes.get(rel);
      if (!node) {
        node = {
          path: isHit ? hit.path : joinPath(rootPath, rel),
          rel,
          name: isHit ? hit.name : segment,
          is_dir: isHit ? hit.is_dir : true,
          children: [],
        };
        nodes.set(rel, node);
        parent.children.push(node);
      } else if (isHit) {
        node.path = hit.path;
        node.name = hit.name;
        node.is_dir = hit.is_dir;
      }
      parent = node;
    }
  }

  const rows: SearchTreeRow[] = [];
  const visit = (node: SearchTreeNode, depth: number) => {
    rows.push({
      path: node.path,
      rel: node.rel,
      name: node.name,
      is_dir: node.is_dir,
      depth,
    });
    if (collapsedPaths.has(node.path)) return;
    for (const child of node.children) visit(child, depth + 1);
  };
  for (const child of root.children) visit(child, 0);
  return rows;
}
