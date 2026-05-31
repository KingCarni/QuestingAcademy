import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Map, PawPrint, Scroll, Swords, Home as HomeIcon, ArrowLeft } from "lucide-react";
import { cn } from "../../lib/cn";

const DOCK = [
  { to: "/adventure",            icon: HomeIcon,  label: "Hub",       testid: "dock-hub" },
  { to: "/adventure/realms",     icon: Map,       label: "Map",       testid: "dock-map" },
  { to: "/adventure/companions", icon: PawPrint,  label: "Pets",      testid: "dock-companions" },
  { to: "/adventure/quests",     icon: Scroll,    label: "Quests",    testid: "dock-quests" },
  { to: "/battle",               icon: Swords,    label: "Practice",  testid: "dock-battle" },
];

export const AdventureLayout: React.FC<{
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  back?: string;
}> = ({ children, title, subtitle, back }) => {
  const loc = useLocation();
  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      backgroundImage:
        "radial-gradient(circle at 20% 0%, #E8E1FA 0%, transparent 40%)," +
        "radial-gradient(circle at 80% 30%, #FFF3D6 0%, transparent 50%)," +
        "radial-gradient(circle at 50% 100%, #CDE0CF 0%, transparent 50%)," +
        "linear-gradient(180deg, #FDFBF7 0%, #F6F1FF 100%)",
    }}>
      {/* Painted floating clouds */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-10 left-10 w-72 h-32 rounded-full bg-white blur-3xl" />
        <div className="absolute top-1/3 right-0 w-80 h-32 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-32 left-1/3 w-96 h-24 rounded-full bg-white/70 blur-3xl" />
      </div>

      <header className="relative z-10 px-4 md:px-8 pt-5">
        <div className="card-base flex items-center gap-3 px-4 py-3">
          {back && (
            <Link data-testid="adv-back" to={back} className="btn-ghost !py-2 !px-3 !text-sm">
              <ArrowLeft size={18} strokeWidth={3} /> Back
            </Link>
          )}
          <div className="min-w-0">
            <p className="h-display text-xl md:text-2xl truncate">{title ?? "Adventure"}</p>
            {subtitle && <p className="text-xs font-bold text-ink-muted">{subtitle}</p>}
          </div>
          <Link to="/" className="ml-auto btn-ghost !py-2 !px-3 !text-sm" data-testid="adv-home">🏠 Home</Link>
        </div>
      </header>

      <main className="relative z-10 px-4 md:px-8 pt-6 pb-28 max-w-6xl mx-auto">{children}</main>

      {/* Bottom dock (Prodigy-style) */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 card-base !p-1.5 flex gap-1" data-testid="adventure-dock">
        {DOCK.map((d) => {
          const active = loc.pathname === d.to || (d.to === "/adventure" && loc.pathname === "/adventure");
          const Icon = d.icon;
          return (
            <Link key={d.to} to={d.to} data-testid={d.testid}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-full font-extrabold text-[10px] uppercase tracking-wide transition",
                active ? "bg-primary text-white" : "text-ink hover:bg-bg"
              )}>
              <Icon size={20} strokeWidth={3} />
              {d.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
