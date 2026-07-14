"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Terminal, Keyboard, Sparkles, X, Check } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ActionPillConfig {
  key: string;
  placeholder: string;
  type: "select" | "text";
  options?: string[];
  optional?: boolean;
}

export interface ActionConfig {
  id: string;
  label: string;
  sentence: string;
  pills: ActionPillConfig[];
}

type ExecState = "idle" | "collapsing" | "rippling" | "done";

export interface ActionComposerProps {
  actions: ActionConfig[];
  onExecute?: (
    action: ActionConfig,
    values: Record<string, string>,
  ) => void | Promise<void>;
  placeholder?: string;
  triggerCharacter?: string;
  pillColors?: Array<{ base: string; focus: string }>;
  rows?: number;
  className?: string;
  executeLabel?: string;
  cancelLabel?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_PILL_COLORS = [
  { base: "bg-cyan-500/10 text-cyan-300 border-cyan-400/20", focus: "ring-cyan-500/30" },
  { base: "bg-red-500/10 text-red-300 border-red-400/20", focus: "ring-red-500/30" },
  { base: "bg-emerald-500/10 text-emerald-300 border-emerald-400/20", focus: "ring-emerald-500/30" },
  { base: "bg-rose-500/10 text-rose-300 border-rose-400/20", focus: "ring-rose-500/30" },
  { base: "bg-orange-500/10 text-orange-300 border-orange-400/20", focus: "ring-orange-500/30" },
  { base: "bg-pink-500/10 text-pink-300 border-pink-400/20", focus: "ring-pink-500/30" },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   INTERNAL HOOKS & UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function useDropdownPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  open: boolean,
) {
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });

  React.useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, [open, triggerRef]);

  return pos;
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTED HEADLESS HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UseActionComposerOptions {
  actions: ActionConfig[];
  triggerCharacter?: string;
  onExecute?: ActionComposerProps["onExecute"];
}

export function useActionComposer({
  actions,
  triggerCharacter = "/",
  onExecute,
}: UseActionComposerOptions) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);

  const [value, setValue] = React.useState("");
  const [showMenu, setShowMenu] = React.useState(false);
  const [selectedMenuIndex, setSelectedMenuIndex] = React.useState(0);
  const [action, setAction] = React.useState<ActionConfig | null>(null);
  const [pillValues, setPillValues] = React.useState<Record<string, string>>({});
  const [execState, setExecState] = React.useState<ExecState>("idle");
  const [rippleOrigin, setRippleOrigin] = React.useState({ x: 0, y: 0 });
  const [cardSize, setCardSize] = React.useState({ w: 600, h: 200 });

  React.useEffect(() => {
    // Show menu if ends with / or is just /
    setShowMenu(value.endsWith(triggerCharacter));
  }, [value, triggerCharacter]);

  const allFilled = React.useMemo(
    () =>
      action !== null &&
      action.pills.every((p) => {
        if (p.optional) return true;
        const v = pillValues[p.key];
        return v !== undefined && v !== null && String(v).trim() !== "";
      }),
    [action, pillValues],
  );

  const maxRadius = React.useMemo(() => {
    return Math.max(
      Math.hypot(rippleOrigin.x, rippleOrigin.y),
      Math.hypot(cardSize.w - rippleOrigin.x, rippleOrigin.y),
      Math.hypot(rippleOrigin.x, cardSize.h - rippleOrigin.y),
      Math.hypot(cardSize.w - rippleOrigin.x, cardSize.h - rippleOrigin.y),
    );
  }, [rippleOrigin, cardSize]);

  const selectAction = React.useCallback((a: ActionConfig) => {
    setShowMenu(false);
    setPillValues({});
    setTimeout(() => setAction(structuredClone(a)), 80);
  }, []);

  const setPillValue = React.useCallback((key: string, val: string) => {
    setPillValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const cancel = React.useCallback(() => {
    setAction(null);
    setValue("");
    setPillValues({});
    setExecState("idle");
    setTimeout(() => textareaRef.current?.focus(), 120);
  }, []);

  const execute = React.useCallback(async () => {
    if (!allFilled || !action || execState !== "idle") return;

    if (btnRef.current && cardRef.current) {
      const btnRect = btnRef.current.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      setRippleOrigin({
        x: btnRect.left + btnRect.width / 2 - cardRect.left,
        y: btnRect.top + btnRect.height / 2 - cardRect.top,
      });
      setCardSize({ w: cardRect.width, h: cardRect.height });
    }

    setExecState("collapsing");
    await delay(250);
    setExecState("rippling");
    await delay(600);
    setExecState("done");

    await onExecute?.(action, { ...pillValues });

    await delay(200);
    cancel();
  }, [allFilled, action, execState, pillValues, onExecute, cancel]);

  const handleTextareaKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (showMenu) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedMenuIndex((v) => Math.min(actions.length - 1, v + 1));
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedMenuIndex((v) => Math.max(0, v - 1));
        }
        if (e.key === "Enter") {
          e.preventDefault();
          selectAction(actions[selectedMenuIndex]);
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowMenu(false);
        }
      } else {
        if (e.key === "Enter" && !e.shiftKey && value.trim() !== "") {
          e.preventDefault();
          // If a direct URL is typed, let's treat it as trigger shorten URL if there is a 'shorten' action
          const shortenAction = actions.find(a => a.id === "shorten");
          if (shortenAction && (value.startsWith("http://") || value.startsWith("https://"))) {
            const tempValues = { url: value.trim(), key: "" };
            setAction(shortenAction);
            setPillValues(tempValues);
            // Auto focus the executor or start action state
            return;
          }
        }
      }
    },
    [showMenu, actions, selectedMenuIndex, selectAction, value],
  );

  return {
    value, action, pillValues, showMenu, selectedMenuIndex, execState, allFilled, maxRadius, rippleOrigin,
    textareaRef, cardRef, btnRef,
    setValue, selectAction, setPillValue, setSelectedMenuIndex, cancel, execute, handleTextareaKeyDown,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTERNAL SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

interface PillProps {
  pill: ActionPillConfig;
  value: string | undefined;
  onChange: (val: string) => void;
  colorBase: string;
  colorFocus: string;
  tabIndex: number;
}

function SelectPill({ pill, value, onChange, colorBase, colorFocus, tabIndex }: PillProps) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const pos = useDropdownPosition(btnRef, open);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pick = (opt: string) => {
    onChange(opt);
    setOpen(false);
    btnRef.current?.focus();
  };

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          role="listbox"
          aria-label={pill.placeholder}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="min-w-[180px] rounded-2xl border border-white/10 bg-zinc-950/98 backdrop-blur-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
        >
          {pill.options?.map((opt, i) => (
            <motion.button
              key={opt}
              role="option"
              aria-selected={value === opt}
              data-option
              tabIndex={0}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02, duration: 0.12 }}
              onClick={() => pick(opt)}
              onKeyDown={(e) => {
                const items = dropdownRef.current?.querySelectorAll("[data-option]");
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  (items?.[i + 1] as HTMLElement)?.focus();
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (i > 0) (items?.[i - 1] as HTMLElement)?.focus();
                  else btnRef.current?.focus();
                }
                if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(opt); }
              }}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm outline-none border-b border-white/[0.04] last:border-none transition-colors duration-100 focus-visible:bg-white/[0.08]",
                value === opt ? "text-white bg-white/[0.08] font-medium" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]",
              )}
            >
              <span className="flex items-center justify-between">
                {opt}
                {value === opt && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="text-xs text-red-400"
                  >
                    ✓
                  </motion.span>
                )}
              </span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative inline-block">
      <motion.button
        ref={btnRef}
        tabIndex={tabIndex}
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); }
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown" && open) {
            e.preventDefault();
            (dropdownRef.current?.querySelectorAll("[data-option]")[0] as HTMLElement)?.focus();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
          colorBase,
          colorFocus,
          !value ? "opacity-60 border-dashed" : "opacity-100 border-solid shadow-sm",
        )}
      >
        {value ?? pill.placeholder}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className="opacity-50 text-[10px] ml-0.5"
        >
          ▼
        </motion.span>
      </motion.button>

      {typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}

function TextPill({ pill, value, onChange, colorBase, colorFocus, tabIndex }: PillProps) {
  const [editing, setEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      onClick={() => setEditing(true)}
      className={cn(
        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide cursor-text transition-all duration-150",
        colorBase,
        !value ? "opacity-60 border-dashed" : "opacity-100 border-solid",
        editing && `ring-2 ${colorFocus} opacity-100 border-solid`,
      )}
    >
      {editing ? (
        <input
          ref={inputRef}
          tabIndex={tabIndex}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); setEditing(false); }
          }}
          placeholder={pill.placeholder}
          className="bg-transparent outline-none border-none placeholder:opacity-30 w-32 text-xs font-medium"
          style={{ color: "inherit" }}
        />
      ) : (
        <button
          tabIndex={tabIndex}
          onFocus={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(true); }
          }}
          className="outline-none bg-transparent border-none cursor-text font-semibold text-xs"
          style={{ color: "inherit" }}
        >
          {value || pill.placeholder}
        </button>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORTED COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function ActionComposer({
  actions,
  onExecute,
  placeholder = "Type '/' for actions or enter URL directly…",
  triggerCharacter = "/",
  pillColors = DEFAULT_PILL_COLORS as unknown as { base: string; focus: string }[],
  rows = 1,
  className,
  executeLabel = "Run",
  cancelLabel = "Cancel",
}: ActionComposerProps) {
  const {
    value, action, pillValues, showMenu, selectedMenuIndex, execState, allFilled, maxRadius, rippleOrigin,
    textareaRef, cardRef, btnRef,
    setValue, selectAction, setPillValue, setSelectedMenuIndex, cancel, execute, handleTextareaKeyDown,
  } = useActionComposer({ actions, triggerCharacter, onExecute });

  const menuPos = useDropdownPosition(cardRef, showMenu);

  return (
    <LayoutGroup>
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className={cn("relative w-full max-w-4xl mx-auto", className)}
      >
        <motion.div
          ref={cardRef}
          layout
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl shadow-2xl"
        >
          {/* Ripple Effect for execution state */}
          <AnimatePresence>
            {(execState === "rippling" || execState === "done") && (
              <motion.div
                key="ripple"
                initial={{ scale: 0, opacity: 1 }}
                animate={execState === "done" ? { scale: maxRadius / 40, opacity: 0 } : { scale: maxRadius / 40, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={execState === "done" ? { duration: 0.28, ease: "easeOut" } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "absolute",
                  left: rippleOrigin.x - 40,
                  top: rippleOrigin.y - 40,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(239,68,68,0.3) 0%, rgba(249,115,22,0.1) 70%)",
                  zIndex: 40,
                  pointerEvents: "none",
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!action ? (
              <motion.div
                key="composer-input-mode"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex flex-col md:flex-row md:items-center w-full px-4 py-2 gap-3"
              >
                {/* Visual Icon indicator */}
                <div className="hidden md:flex items-center justify-center pl-2 text-zinc-500">
                  <Terminal className="w-4 h-4 text-red-400/80" />
                </div>

                <div className="flex-1 min-w-0">
                  <textarea
                    ref={textareaRef}
                    rows={rows}
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    className="w-full resize-none bg-transparent py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 leading-normal"
                    style={{ minHeight: "36px" }}
                  />
                </div>

                {/* Quick Hint / Keyboard indicators */}
                <div className="flex items-center gap-2 pr-2 justify-between md:justify-end text-[11px] text-zinc-500 border-t border-white/[0.04] md:border-none pt-2 md:pt-0">
                  <span className="flex items-center gap-1">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 font-mono text-[9px]">/</kbd> for actions
                  </span>
                  <div className="flex items-center gap-1 text-[10px] bg-white/[0.03] border border-white/[0.08] px-2 py-1 rounded-md text-zinc-400">
                    <Keyboard className="w-3.5 h-3.5 text-zinc-500" />
                    <span>CMD + K</span>
                  </div>
                </div>

                {/* Dropdown Menu - rendered via Portal to prevent clipping from overflow-hidden */}
                {typeof document !== "undefined" && createPortal(
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        role="menu"
                        aria-label="Actions Menu"
                        initial={{ opacity: 0, scale: 0.98, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -4 }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        style={{
                          position: "absolute",
                          top: menuPos.top,
                          left: menuPos.left,
                          width: menuPos.width,
                          zIndex: 9999,
                        }}
                        className="rounded-xl border border-white/10 bg-zinc-950/98 backdrop-blur-2xl overflow-hidden shadow-2xl"
                      >
                        <div className="px-4 py-2 border-b border-white/[0.04] bg-white/[0.02] flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" /> Commands
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">Use ↑↓ and Enter</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.03]">
                          {actions.map((item, index) => (
                            <motion.button
                              key={item.id}
                              role="menuitem"
                              onClick={() => selectAction(item)}
                              onMouseEnter={() => setSelectedMenuIndex(index)}
                              className={cn(
                                "flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-100",
                                selectedMenuIndex === index ? "bg-white/[0.07] text-white" : "text-zinc-400 hover:text-zinc-100",
                              )}
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold">{item.label}</span>
                                <span className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-xs">{item.sentence}</span>
                              </div>
                              {selectedMenuIndex === index && (
                                <motion.span layoutId="menu-indicator" className="text-xs text-red-400 font-mono pr-1">
                                  ↵ Enter
                                </motion.span>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )}
              </motion.div>
            ) : (
              <motion.div
                key="action-configuration-mode"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="flex flex-col"
              >
                {/* Active Action Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.04] bg-white/[0.01]">
                  <span className="text-[10px] text-red-400 uppercase tracking-widest font-bold">
                    Active Action: {action.label}
                  </span>
                  <button
                    onClick={cancel}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Natural Language Sentence Inputs */}
                <div className="px-6 py-5 flex flex-wrap items-center gap-x-2 gap-y-3 text-sm leading-relaxed text-zinc-200">
                  <span className="text-zinc-400 font-medium">
                    {/* Display sentence prefix before first pill */}
                    {action.sentence.split(/\[\w+\]/)[0]}
                  </span>

                  {action.pills.map((pill, i) => {
                    const color = pillColors[i % pillColors.length];
                    const props: PillProps = {
                      pill,
                      value: pillValues[pill.key],
                      onChange: (val) => setPillValue(pill.key, val),
                      colorBase: color.base,
                      colorFocus: color.focus,
                      tabIndex: 1 + i,
                    };

                    const parts = action.sentence.split(/\[\w+\]/);
                    const nextText = parts[i + 1] || "";

                    return (
                      <React.Fragment key={pill.key}>
                        {pill.type === "select" ? (
                          <SelectPill {...props} />
                        ) : (
                          <TextPill {...props} />
                        )}
                        {nextText && <span className="text-zinc-400 font-medium">{nextText}</span>}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Footer Controls */}
                <div className="flex justify-between items-center px-6 py-3.5 border-t border-white/[0.04] bg-white/[0.01]">
                  <button
                    onClick={cancel}
                    disabled={execState !== "idle"}
                    className="rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50 disabled:pointer-events-none transition-colors duration-150"
                  >
                    {cancelLabel}
                  </button>

                  <motion.button
                    ref={btnRef}
                    tabIndex={1 + (action?.pills.length ?? 0)}
                    onClick={execute}
                    disabled={!allFilled || execState !== "idle"}
                    layout
                    animate={{
                      width: execState !== "idle" ? 36 : "auto",
                      borderRadius: execState !== "idle" ? 18 : 8,
                      opacity: execState === "rippling" || execState === "done" ? 0 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 360, damping: 32 }}
                    className={cn(
                      "relative h-[34px] min-w-[36px] px-4 text-xs font-semibold overflow-hidden flex items-center justify-center outline-none transition-colors duration-150",
                      allFilled
                        ? "bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer"
                        : "bg-white/5 text-white/20 border border-white/[0.06] cursor-not-allowed",
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {execState === "idle" && (
                        <motion.span
                          key="label"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5"
                        >
                          {executeLabel} <Check className="w-3.5 h-3.5" />
                        </motion.span>
                      )}
                      {execState === "collapsing" && (
                        <motion.span
                          key="dot"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="w-1.5 h-1.5 rounded-full bg-white block animate-ping"
                        />
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </LayoutGroup>
  );
}