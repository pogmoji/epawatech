"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  searchText?: string;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  emptyMessage = "No matches found.",
  disabled = false,
  className,
  buttonClassName,
}: SearchableSelectProps) {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ""} ${option.searchText ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, options]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 text-left text-sm font-normal outline-none transition hover:border-primary focus:border-primary focus:ring-4 focus:ring-blue-100 disabled:opacity-60",
          buttonClassName,
        )}
      >
        <span className={cn("min-w-0 truncate", selected ? "text-foreground" : "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 min-w-0 flex-1 bg-transparent text-sm font-normal outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div id={`${id}-listbox`} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {filteredOptions.length ? filteredOptions.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(option.value)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-blue-50",
                    active && "bg-blue-50 text-primary",
                  )}
                >
                  <Check className={cn("mt-0.5 size-4 shrink-0", active ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{option.label}</span>
                    {option.description && <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{option.description}</span>}
                  </span>
                </button>
              );
            }) : (
              <p className="px-3 py-5 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
