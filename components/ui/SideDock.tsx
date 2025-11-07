"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Section = { id: string; icon?: React.ReactNode; label: string };

export default function SideDock({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  const [open, setOpen] = useState<string | null>(null);
  const panelRoot = useRef<HTMLElement | null>(null);

  useEffect(() => { panelRoot.current = document.body; }, []);

  // Observe sections and update active tab
  useEffect(() => {
    const els = sections
      .map(s => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Also open the panel for quick editing
      setOpen(id);
    }
  };

  return (
    <>
      {/* Dock - Desktop */}
      <aside className="hidden lg:block sticky top-4 self-start z-40">
        <ul className="flex flex-col gap-2">
          {sections.map(s => (
            <li key={s.id}>
              <button
                onClick={() => scrollToSection(s.id)}
                className={[
                  "group flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all",
                  active === s.id
                    ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-600"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                ].join(" ")}
                aria-current={active === s.id ? "true" : undefined}
              >
                <span className="inline-grid place-items-center w-5 h-5">{s.icon ?? "•"}</span>
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Mobile floating "Edit" pill */}
      <button
        onClick={() => setOpen(active)}
        className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[55] rounded-full px-4 py-2 border bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl transition-shadow"
      >
        <span className="flex items-center gap-2">
          <span>✏️</span>
          <span>Edit {sections.find(s => s.id === active)?.label ?? "Section"}</span>
        </span>
      </button>

      {/* Slide-out panels (portal) - Desktop */}
      {panelRoot.current && createPortal(
        <div aria-live="polite">
          {sections.map(s => (
            <div
              key={s.id}
              className={[
                "hidden lg:block fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-white dark:bg-neutral-900 shadow-xl border-l dark:border-neutral-800",
                "transition-transform duration-200 will-change-transform",
                open === s.id ? "translate-x-0" : "translate-x-full"
              ].join(" ")}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`panel-title-${s.id}`}
            >
              <div className="flex items-center justify-between p-4 border-b dark:border-neutral-800">
                <h2 id={`panel-title-${s.id}`} className="text-base font-semibold">{s.label}</h2>
                <button
                  onClick={() => setOpen(null)}
                  className="rounded px-2 py-1 border dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Close
                </button>
              </div>
              <div className="p-4 overflow-y-auto h-full pb-20">
                <SectionProxy targetId={s.id} />
              </div>
            </div>
          ))}

          {/* Mobile bottom sheet */}
          <div
            className={[
              "lg:hidden fixed inset-x-0 bottom-0 z-[60] max-h-[80vh] bg-white dark:bg-neutral-900 border-t dark:border-neutral-800 rounded-t-2xl",
              "transition-transform duration-200",
              open ? "translate-y-0" : "translate-y-full"
            ].join(" ")}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-neutral-800">
              <h2 className="text-base font-semibold">
                {sections.find(s => s.id === open)?.label ?? "Edit Section"}
              </h2>
              <button
                onClick={() => setOpen(null)}
                className="rounded px-2 py-1 border dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto h-full max-h-[70vh]">
              <SectionProxy targetId={open ?? active} />
            </div>
          </div>

          {/* Backdrop */}
          <button
            onClick={() => setOpen(null)}
            className={[
              "fixed inset-0 z-50 bg-black/30 transition-opacity",
              open ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
            aria-label="Close panel"
            tabIndex={-1}
          />
        </div>, panelRoot.current
      )}
    </>
  );
}

// Renders the *same* inputs as the section in-page by cloning its innerHTML.
// Quick win: no refactor. Later you can extract shared form components.
function SectionProxy({ targetId }: { targetId: string }) {
  const [html, setHtml] = useState<string>("");
  useEffect(() => {
    const src = document.getElementById(targetId);
    setHtml(src ? src.innerHTML : "<p class='text-neutral-500'>Section not found.</p>");
  }, [targetId]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
