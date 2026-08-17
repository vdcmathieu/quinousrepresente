"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/deputes", label: "Députés" },
  { href: "/groupes", label: "Groupes" },
  { href: "/statistiques", label: "Statistiques" },
  { href: "/methode", label: "Méthode" },
];

export default function NavLinks({
  legislature,
  variante,
}: {
  legislature: number;
  /** `barre` sits beside the wordmark (sm+); `rangee` is the phone row. */
  variante: "barre" | "rangee";
}) {
  const pathname = usePathname();
  const rangee = variante === "rangee";

  return (
    <nav
      className={
        rangee
          ? "mx-auto flex max-w-[var(--page)] items-stretch gap-0.5 px-2.5 pb-2 sm:hidden"
          : "ml-auto hidden items-center gap-0.5 sm:flex"
      }
      aria-label={`Navigation principale — ${legislature}e législature`}
    >
      {LIENS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded py-1.5 text-center text-[0.8125rem] font-medium whitespace-nowrap transition-colors sm:text-sm ${
              rangee ? "flex-1 px-1" : "px-2.5"
            } ${
              /* The page you are on is marked twice: the sunken pill it always
                 had, and a blue rule under it — so "here" never rests on a
                 tone alone. */
              active
                ? "bg-[var(--surface-sunken)] text-[var(--ink)] shadow-[inset_0_-2px_0_var(--bleu)]"
                : "text-[var(--ink-2)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
