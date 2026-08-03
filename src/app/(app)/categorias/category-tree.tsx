"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Tag, Package, Layers } from "lucide-react";
import { Badge } from "@/components/ui";
import type { CategoryNode } from "@/lib/data/catalog";

const AUD: Record<string, string> = {
  masculino: "Masc.",
  feminino: "Fem.",
  infantil: "Infantil",
  unissex: "Unissex",
};

export function CategoryTree({ nodes }: { nodes: CategoryNode[] }) {
  return (
    <ul className="space-y-1">
      {nodes.map((n) => (
        <TreeNode key={n.id} node={n} depth={0} />
      ))}
    </ul>
  );
}

function TreeNode({ node, depth }: { node: CategoryNode; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const hasItems = node.items.length > 0;
  const hasGrades = node.grades.length > 0;
  const canToggle = hasChildren || hasItems || hasGrades;

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => canToggle && setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          {canToggle ? (
            open ? (
              <ChevronDown size={14} className="shrink-0 text-neutral-400" />
            ) : (
              <ChevronRight size={14} className="shrink-0 text-neutral-400" />
            )
          ) : (
            <span className="w-[14px] shrink-0" />
          )}
          {hasChildren ? (
            open ? (
              <FolderOpen size={15} className="shrink-0 text-amber-500" />
            ) : (
              <Folder size={15} className="shrink-0 text-amber-500" />
            )
          ) : (
            <Tag size={14} className="shrink-0 text-neutral-400" />
          )}
          <span className="font-medium">{node.name}</span>
          {node.code && <span className="text-xs text-neutral-400">({node.code})</span>}
          {hasGrades && (
            <Badge tone="info" className="ml-1">
              {node.grades.length} {node.grades.length === 1 ? "grade" : "grades"}
            </Badge>
          )}
          {node.itemCount > 0 && (
            <Badge tone="neutral" className="ml-1">
              {node.itemCount} {node.itemCount === 1 ? "item" : "itens"}
            </Badge>
          )}
        </button>
      </div>

      {open && (hasItems || hasChildren || hasGrades) && (
        <div>
          {hasGrades && (
            <div
              className="flex flex-wrap items-center gap-1.5 py-1"
              style={{ paddingLeft: `${depth * 18 + 34}px` }}
            >
              <span className="text-[11px] uppercase tracking-wide text-neutral-400">Subtipos:</span>
              {node.grades.map((g) => (
                <span
                  key={g.id}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                >
                  <Layers size={10} />
                  {g.name}
                </span>
              ))}
            </div>
          )}
          {hasItems && (
            <ul className="space-y-0.5" style={{ paddingLeft: `${depth * 18 + 34}px` }}>
              {node.items.map((it) => (
                <li key={it.id}>
                  <Link
                    href={`/catalogo/${it.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <Package size={12} className="shrink-0 text-neutral-300" />
                    <span className="font-mono text-xs text-blue-600">{it.sku}</span>
                    <span className="truncate text-neutral-600 dark:text-neutral-300">{it.name}</span>
                    {it.grade && <span className="shrink-0 text-[11px] text-neutral-400">· {it.grade}</span>}
                    {it.publico && (
                      <span className="shrink-0 text-[11px] text-neutral-400">· {AUD[it.publico] ?? it.publico}</span>
                    )}
                    {it.status === "descontinuado" && (
                      <span className="shrink-0 text-[11px] font-medium text-red-500">· descont.</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hasChildren && (
            <ul className="space-y-1">
              {node.children.map((c) => (
                <TreeNode key={c.id} node={c} depth={depth + 1} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
