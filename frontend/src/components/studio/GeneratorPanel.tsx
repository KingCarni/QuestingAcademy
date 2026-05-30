import React, { useState } from "react";
import { Wand2 } from "lucide-react";
import { cn } from "../../lib/cn";

interface Field {
  key: string;
  label: string;
  placeholder?: string;
  optional?: boolean;
  textarea?: boolean;
}

interface Props {
  title: string;
  description?: string;
  fields: Field[];
  onGenerate: (values: Record<string, string>) => void;
  testIdPrefix: string;
  buttonLabel?: string;
}

export const GeneratorPanel: React.FC<Props> = ({
  title,
  description,
  fields,
  onGenerate,
  testIdPrefix,
  buttonLabel,
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState(false);

  const update = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const handle = () => {
    onGenerate(values);
    setFlash(true);
    setTimeout(() => setFlash(false), 900);
    setValues({});
  };

  return (
    <div
      data-testid={`${testIdPrefix}-generator`}
      className={cn(
        "rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6 transition",
        flash && "ring-4 ring-primary/40"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary">
          <Wand2 size={18} strokeWidth={3} />
        </div>
        <div>
          <p className="h-display text-xl leading-tight">{title}</p>
          {description && <p className="text-sm text-ink-muted">{description}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f.key} className={f.textarea ? "sm:col-span-2" : ""}>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
              {f.label}{f.optional ? "  (optional)" : ""}
            </span>
            {f.textarea ? (
              <textarea
                data-testid={`${testIdPrefix}-input-${f.key}`}
                value={values[f.key] ?? ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
                className="mt-1 w-full bg-white border-2 border-white rounded-2xl px-4 py-2 font-bold focus:outline-none focus:border-primary/40"
              />
            ) : (
              <input
                data-testid={`${testIdPrefix}-input-${f.key}`}
                value={values[f.key] ?? ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1 w-full bg-white border-2 border-white rounded-full px-4 py-2 font-bold focus:outline-none focus:border-primary/40"
              />
            )}
          </label>
        ))}
      </div>

      <button
        data-testid={`${testIdPrefix}-generate-btn`}
        onClick={handle}
        className="btn-primary mt-4 !text-base !py-3 !px-6"
      >
        <Wand2 size={16} strokeWidth={3} /> {buttonLabel ?? "Generate Draft"}
      </button>

      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted mt-3">
        New items always enter <span className="text-primary">Pending Review</span> — never live.
      </p>
    </div>
  );
};
