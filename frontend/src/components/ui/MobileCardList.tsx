"use client";

import React, { useMemo, useState } from "react";
import type { GridActionsColDef, GridColDef, GridRowId, GridValidRowModel } from "@mui/x-data-grid";

const PAGE_STEP = 20;

interface MobileCardListProps {
  rows: readonly GridValidRowModel[];
  columns: readonly GridColDef[];
  getRowId?: (row: GridValidRowModel) => GridRowId;
  loading?: boolean;
  searchPlaceholder?: string;
  extraActions?: React.ReactNode;
  columnVisibilityModel?: Record<string, boolean>;
  checkboxSelection?: boolean;
  onSelectionChange?: (ids: Set<GridRowId>) => void;
}

type CellParams = Record<string, unknown>;

function renderValue(col: GridColDef, row: GridValidRowModel, id: GridRowId): React.ReactNode {
  const raw = row[col.field];
  const stub = {} as never;
  const value = col.valueGetter ? col.valueGetter(raw as never, row as never, col as never, stub) : raw;
  const params: CellParams = { id, field: col.field, row, value, formattedValue: value, colDef: col, api: stub };
  if (col.renderCell) return col.renderCell(params as never);
  const formatted = col.valueFormatter ? col.valueFormatter(value as never, row as never, col as never, stub) : value;
  return formatted == null || formatted === "" ? "-" : String(formatted);
}

// Interactive/wide cells (action rows, steppers) need the full card width
const isWide = (col: GridColDef) => col.field === "actions" || col.sortable === false || (col.minWidth ?? col.width ?? 0) >= 150;

function searchText(columns: readonly GridColDef[], row: GridValidRowModel) {
  return columns
    .filter((c) => c.type !== "actions")
    .map((c) => {
      const v = c.valueGetter ? c.valueGetter(row[c.field] as never, row as never, c as never, {} as never) : row[c.field];
      return typeof v === "object" ? "" : String(v ?? "");
    })
    .join(" ")
    .toLowerCase();
}

export default function MobileCardList({
  rows,
  columns,
  getRowId,
  loading,
  searchPlaceholder = "ค้นหา...",
  extraActions,
  columnVisibilityModel,
  checkboxSelection,
  onSelectionChange,
}: MobileCardListProps) {
  const [selected, setSelected] = useState<Set<GridRowId>>(new Set());
  const toggle = (id: GridRowId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    onSelectionChange?.(next);
  };
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_STEP);

  const visible = useMemo(
    () => columns.filter((c) => c.type !== "actions" && columnVisibilityModel?.[c.field] !== false),
    [columns, columnVisibilityModel],
  );
  const actionCol = columns.find((c) => c.type === "actions") as GridActionsColDef | undefined;
  const [titleCol, ...detailCols] = visible;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => searchText(columns, r).includes(q)) : rows;
  }, [rows, columns, query]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE_STEP);
          }}
          placeholder={searchPlaceholder}
          aria-label="ค้นหา"
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
        />
        {extraActions}
      </div>

      {loading ? (
        <p className="p-8 text-center text-sm text-slate-400">กำลังโหลด...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm font-semibold text-slate-500">{query ? "ไม่พบรายการที่ตรงกับคำค้นหา" : "ยังไม่มีข้อมูล"}</p>
          {query && (
            <button type="button" onClick={() => setQuery("")} className="tap-press h-11 rounded-xl bg-indigo-50 px-4 text-sm font-semibold text-indigo-600">
              ล้างคำค้นหา
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.slice(0, limit).map((row, i) => {
            const id = getRowId ? getRowId(row) : (row.id as GridRowId) ?? i;
            const actions = actionCol?.getActions?.({ id, row, columns, api: {} } as never);
            return (
              <li key={id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  {checkboxSelection && (
                    <label className="-m-2.5 flex shrink-0 cursor-pointer p-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggle(id)}
                        aria-label="เลือกรายการ"
                        className="h-6 w-6 accent-indigo-600"
                      />
                    </label>
                  )}
                  <div className="min-w-0 flex-1 overflow-hidden text-sm font-semibold text-slate-900 [overflow-wrap:anywhere] [&_*]:min-w-0 [&_*]:max-w-full">
                    {titleCol && renderValue(titleCol, row, id)}
                  </div>
                  {actions && actions.length > 0 && (
                    <div className="flex shrink-0 items-center [&_button]:min-h-11 [&_button]:min-w-11">{actions}</div>
                  )}
                </div>
                {detailCols.length > 0 && (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                    {detailCols.map((col) => (
                      <div key={col.field} className={`min-w-0 overflow-hidden ${isWide(col) ? "col-span-2" : ""} [&_*]:min-w-0 [&_*]:max-w-full [&_*]:justify-start [&_*]:text-left`}>
                        <dt className="text-xs font-medium text-slate-400">{col.headerName ?? col.field}</dt>
                        <dd className="text-sm text-slate-700 [overflow-wrap:anywhere] [&_div]:flex-wrap">{renderValue(col, row, id)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE_STEP)}
          className="tap-press h-12 w-full border-t border-slate-100 text-sm font-semibold text-indigo-600"
        >
          แสดงเพิ่ม ({filtered.length - limit})
        </button>
      )}
    </div>
  );
}
