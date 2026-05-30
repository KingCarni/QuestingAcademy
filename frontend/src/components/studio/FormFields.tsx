import React, { useState } from "react";
import { cn } from "../../lib/cn";
import { Shuffle, Plus, X, Save } from "lucide-react";
import { useStudio } from "../../lib/studioStore";

// --- Labeled wrapper --------------------------------------------------------
export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; full?: boolean }> = ({
  label, hint, children, full,
}) => (
  <label className={cn("block", full && "sm:col-span-2")}>
    <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
      {label}{hint && <span className="ml-1 normal-case font-bold text-ink-muted/70">({hint})</span>}
    </span>
    <div className="mt-1">{children}</div>
  </label>
);

const inputCls = "w-full bg-white border-2 border-white rounded-full px-4 py-2 font-bold focus:outline-none focus:border-primary/40";
const selectCls = "w-full bg-white border-2 border-white rounded-full px-3 py-2 font-bold focus:outline-none focus:border-primary/40 capitalize";

// --- Text input -------------------------------------------------------------
export const TextField: React.FC<{
  value: string; onChange: (v: string) => void; placeholder?: string; testid?: string;
  onRandomize?: () => void;
}> = ({ value, onChange, placeholder, testid, onRandomize }) => (
  <div className="flex gap-2">
    <input
      data-testid={testid}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
    {onRandomize && (
      <button
        type="button"
        data-testid={testid ? `${testid}-randomize` : undefined}
        onClick={onRandomize}
        className="px-3 rounded-full bg-primary/10 text-primary border-2 border-primary/30 hover:bg-primary/20 font-extrabold inline-flex items-center"
        title="Randomize"
      >
        <Shuffle size={14} strokeWidth={3} />
      </button>
    )}
  </div>
);

export const TextArea: React.FC<{
  value: string; onChange: (v: string) => void; placeholder?: string; testid?: string; rows?: number;
  onRandomize?: () => void;
}> = ({ value, onChange, placeholder, testid, rows = 3, onRandomize }) => (
  <div className="flex gap-2">
    <textarea
      data-testid={testid}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white border-2 border-white rounded-2xl px-4 py-2 font-bold focus:outline-none focus:border-primary/40"
    />
    {onRandomize && (
      <button
        type="button"
        data-testid={testid ? `${testid}-randomize` : undefined}
        onClick={onRandomize}
        className="px-3 rounded-2xl bg-primary/10 text-primary border-2 border-primary/30 hover:bg-primary/20 font-extrabold inline-flex items-start pt-3"
        title="Randomize"
      >
        <Shuffle size={14} strokeWidth={3} />
      </button>
    )}
  </div>
);

// --- Select -----------------------------------------------------------------
export const SelectField: React.FC<{
  value: string; onChange: (v: string) => void; options: readonly string[]; testid?: string;
  placeholder?: string;
}> = ({ value, onChange, options, testid, placeholder }) => (
  <select
    data-testid={testid}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={selectCls}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => (
      <option key={o} value={o}>{o.replace(/-/g, " ")}</option>
    ))}
  </select>
);

// --- Number ------------------------------------------------------------------
export const NumberField: React.FC<{
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; testid?: string;
}> = ({ value, onChange, min, max, step = 1, testid }) => (
  <input
    type="number"
    data-testid={testid}
    value={value}
    min={min}
    max={max}
    step={step}
    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    className={inputCls}
  />
);

// --- Color picker with palette ----------------------------------------------
export const ColorField: React.FC<{
  value: string; onChange: (hex: string) => void; testid?: string;
  // Optional callback to save current color as a palette
  onSave?: (hex: string) => void;
}> = ({ value, onChange, testid, onSave }) => {
  const palettes = useStudio((s) => s.palettes);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="color"
          data-testid={testid}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-full border-2 border-white cursor-pointer"
          title="Pick a color"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls + " !py-1.5 !text-sm font-mono"}
        />
        {onSave && (
          <button
            type="button"
            data-testid={testid ? `${testid}-save` : undefined}
            onClick={() => onSave(value)}
            className="px-3 py-1.5 rounded-full bg-gold/20 text-ink border-2 border-gold/40 hover:bg-gold/30 font-extrabold inline-flex items-center gap-1 text-xs"
            title="Save to palettes"
          >
            <Save size={12} strokeWidth={3} /> Save
          </button>
        )}
      </div>
      {palettes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-extrabold uppercase text-ink-muted">Saved:</span>
          {palettes.flatMap((p) => p.colors.slice(0, 4).map((c, i) => (
            <button
              key={`${p.id}-${i}`}
              type="button"
              onClick={() => onChange(c)}
              className="w-6 h-6 rounded-full border-2 border-white hover:scale-110 transition"
              style={{ background: c }}
              title={`${p.name}`}
              data-testid={testid ? `${testid}-palette-${p.id}-${i}` : undefined}
            />
          )))}
        </div>
      )}
    </div>
  );
};

// --- Searchable single-select with dropdown ---------------------------------
export const SearchSelect: React.FC<{
  value: string; onChange: (id: string) => void;
  options: { id: string; label: string; sublabel?: string }[];
  testid?: string; placeholder?: string;
}> = ({ value, onChange, options, testid, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) =>
    !q ? true : (o.label.toLowerCase().includes(q.toLowerCase()) || o.sublabel?.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid={testid}
        className={selectCls + " text-left flex items-center justify-between"}
      >
        <span className={selected ? "" : "text-ink-muted font-bold"}>
          {selected ? selected.label : (placeholder ?? "Choose...")}
        </span>
        <span className="text-ink-muted text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-2xl border-2 border-white shadow-xl max-h-72 overflow-auto p-1">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full bg-bg rounded-full px-3 py-1.5 text-sm font-bold mb-1 outline-none border-2 border-transparent focus:border-primary/40"
          />
          {filtered.length === 0 ? (
            <p className="text-xs text-ink-muted p-2">No matches</p>
          ) : filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              data-testid={testid ? `${testid}-option-${o.id}` : undefined}
              onClick={() => { onChange(o.id); setOpen(false); setQ(""); }}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-xl hover:bg-primary/10 text-sm font-bold flex items-center justify-between",
                o.id === value && "bg-primary/10 text-primary"
              )}
            >
              <span>{o.label}</span>
              {o.sublabel && <span className="text-[10px] font-extrabold text-ink-muted">{o.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Multi-select chips -----------------------------------------------------
export const MultiSelectChips: React.FC<{
  values: string[]; onChange: (v: string[]) => void;
  options: { id: string; label: string }[];
  testid?: string;
}> = ({ values, onChange, options, testid }) => {
  return (
    <div className="flex flex-wrap gap-1.5" data-testid={testid}>
      {options.length === 0 && <p className="text-xs text-ink-muted">No options yet — create some first.</p>}
      {options.map((o) => {
        const on = values.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            data-testid={testid ? `${testid}-toggle-${o.id}` : undefined}
            onClick={() => onChange(on ? values.filter((v) => v !== o.id) : [...values, o.id])}
            className={cn(
              "px-3 py-1 rounded-full border-2 text-xs font-extrabold transition",
              on ? "bg-primary text-white border-primary" : "bg-white text-ink border-white hover:border-primary/40"
            )}
          >
            {on ? "✓ " : "+ "}{o.label}
          </button>
        );
      })}
    </div>
  );
};

// --- Style preset selector --------------------------------------------------
export const StylePresetPicker: React.FC<{
  value?: string; onChange: (id: string | undefined) => void; testid?: string;
}> = ({ value, onChange, testid }) => {
  const presets = useStudio((s) => s.stylePresets);
  const addStylePreset = useStudio((s) => s.addStylePreset);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState(""); const [notes, setNotes] = useState("");
  const selected = presets.find((p) => p.id === value);
  return (
    <div className="space-y-2" data-testid={testid}>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          data-testid={testid ? `${testid}-none` : undefined}
          className={cn(
            "px-3 py-1 rounded-full border-2 text-xs font-extrabold transition",
            !value ? "bg-primary text-white border-primary" : "bg-white text-ink border-white hover:border-primary/40"
          )}
        >None</button>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            data-testid={testid ? `${testid}-pick-${p.id}` : undefined}
            className={cn(
              "px-3 py-1 rounded-full border-2 text-xs font-extrabold transition",
              p.id === value ? "bg-primary text-white border-primary" : "bg-white text-ink border-white hover:border-primary/40"
            )}
          >{p.name}</button>
        ))}
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          data-testid={testid ? `${testid}-add-toggle` : undefined}
          className="px-3 py-1 rounded-full border-2 text-xs font-extrabold bg-gold/20 text-ink border-gold/40 hover:bg-gold/30 inline-flex items-center gap-1"
        >
          {showAdd ? <X size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />} {showAdd ? "Cancel" : "Save new"}
        </button>
      </div>
      {selected && (
        <p className="text-xs italic text-ink-muted">“{selected.notes}”</p>
      )}
      {showAdd && (
        <div className="rounded-2xl bg-white p-3 border-2 border-white space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Preset name"
            className={inputCls + " !text-sm !py-1.5"}
            data-testid={testid ? `${testid}-new-name` : undefined}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Style notes"
            rows={2}
            className="w-full bg-bg border-2 border-white rounded-2xl px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-primary/40"
            data-testid={testid ? `${testid}-new-notes` : undefined}
          />
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) return;
              const id = "sp-user-" + Date.now();
              addStylePreset({ id, name: name.trim(), notes: notes.trim(), createdAt: new Date().toISOString() });
              onChange(id); setShowAdd(false); setName(""); setNotes("");
            }}
            data-testid={testid ? `${testid}-save-new` : undefined}
            className="btn-primary !text-xs !py-1.5 !px-4"
          >
            <Save size={12} strokeWidth={3} /> Save preset
          </button>
        </div>
      )}
    </div>
  );
};
