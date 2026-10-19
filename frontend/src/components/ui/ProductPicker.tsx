"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { DBProduct } from "@/lib/dbActions";

type ProductPickerProps = {
  products: DBProduct[];
  onSelect: (product: DBProduct) => void;
  /** Called on Enter when nothing matches, so callers can look the text up as a barcode/SKU */
  onSubmitCode?: (code: string) => void;
  /** Product to show as the current value while the field is idle */
  selectedId?: string;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  required?: boolean;
  className?: string;
};

const MAX_RESULTS = 8;

export default function ProductPicker({
  products,
  onSelect,
  onSubmitCode,
  selectedId,
  placeholder = "ค้นหาชื่อ, SKU หรือบาร์โค้ด...",
  inputRef,
  required,
  className = "",
}: ProductPickerProps) {
  const listId = useId();
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = useMemo(() => products.find((p) => p.id === selectedId), [products, selectedId]);

  const results = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return products.slice(0, MAX_RESULTS);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [products, text]);

  const choose = (product: DBProduct) => {
    onSelect(product);
    setText("");
    setOpen(false);
    setActive(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      // Never submit the surrounding form from this field
      e.preventDefault();
      const q = text.trim().toLowerCase();
      if (!q) return;
      const exact = products.find((p) => p.sku.toLowerCase() === q || (p.barcode ?? "").toLowerCase() === q);
      if (exact) return choose(exact);
      if (results[active]) return choose(results[active]);
      if (onSubmitCode) {
        onSubmitCode(text.trim());
        setText("");
        setOpen(false);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={ref}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="ค้นหาสินค้า"
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        required={required && !selectedId}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        placeholder={selected ? `${selected.name}` : placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">ไม่พบสินค้า — กด Enter เพื่อค้นหาด้วยบาร์โค้ด/SKU</li>
          ) : (
            results.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown fires before the input blur that would close the list
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                  i === active ? "bg-indigo-50 text-slate-900" : "text-slate-700"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block truncate font-mono text-xs text-slate-400">{p.sku}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  คงเหลือ {p.stockQty} {p.unit}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
