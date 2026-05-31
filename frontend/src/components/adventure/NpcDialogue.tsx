import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speak } from "../../lib/speech";
import { Volume2, X, Sparkles } from "lucide-react";
import type { StudioNPC } from "../../lib/studioTypes";

// framer-motion v11 typings can confuse TS about AnimatePresence's return; cast to a safe component type.
const AP = AnimatePresence as unknown as React.FC<{ children?: React.ReactNode }>;

interface Props {
  npc: StudioNPC | null;
  onClose: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

const ROLE_EMOJI: Record<string, string> = {
  teacher: "🎓",
  guide: "🧭",
  shopkeeper: "🛍️",
  "quest-giver": "📜",
  guardian: "🛡️",
  rival: "✨",
  caretaker: "🥚",
};

export const NpcDialogue: React.FC<Props> = ({ npc, onClose, onContinue, continueLabel }) => {
  return (
    <AP>
      {npc && (
        <motion.div
          role="dialog"
          aria-label={`Dialogue with ${npc.name}`}
          data-testid="npc-dialogue"
          className="fixed inset-0 z-50 grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative card-base w-full max-w-md !p-6 overflow-hidden"
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <button
              type="button"
              aria-label="Close"
              data-testid="npc-dialogue-close"
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full grid place-items-center bg-bg hover:bg-white border-2 border-white"
            >
              <X size={14} strokeWidth={3} />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-20 h-20 rounded-3xl grid place-items-center text-4xl bg-gradient-to-br from-[#FFF3D6] to-[#D8D2FA] border-4 border-white shadow"
                aria-hidden
              >
                {ROLE_EMOJI[npc.role] ?? "✨"}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                  {npc.role.replace("-", " ")}
                </p>
                <p className="h-display text-2xl truncate" data-testid="npc-dialogue-name">{npc.name}</p>
                <p className="text-xs text-ink-muted truncate">{npc.realm}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-bg p-4 border-2 border-white">
              <p
                className="text-base text-ink leading-relaxed"
                data-testid="npc-dialogue-line"
              >
                {npc.dialogue}
              </p>
              <button
                type="button"
                onClick={() => speak(npc.dialogue)}
                data-testid="npc-dialogue-speak"
                className="btn-ghost mt-3 !text-xs !py-1.5 !px-3"
                aria-label="Read aloud"
              >
                <Volume2 size={14} strokeWidth={3} /> Speak
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-2 flex-wrap">
              <button
                type="button"
                onClick={onClose}
                data-testid="npc-dialogue-bye"
                className="btn-outline !text-sm !py-2 !px-4"
              >
                Maybe later
              </button>
              {onContinue && (
                <button
                  type="button"
                  onClick={() => {
                    onContinue();
                  }}
                  data-testid="npc-dialogue-continue"
                  className="btn-primary !text-sm !py-2 !px-4"
                >
                  <Sparkles size={14} strokeWidth={3} /> {continueLabel ?? "Continue"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AP>
  );
};
