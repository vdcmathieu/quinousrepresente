import type { Metadata, Viewport } from "next";
import { Archivo, Spectral } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { getMeta } from "@/lib/data";

/*
  Spectral is one of the two typefaces of the French State's design system
  (drawn by Production Type, Paris). It carries the institutional register
  without costume-drama. Archivo does the utility work — labels, tables,
  figures — where a grotesque with true tabular figures earns its keep.
*/
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-spectral",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

/** What the social card actually shows, for anyone who cannot see it. */
const CARTE_ALT =
  "Les 577 députés de la XVIIe législature, chaque siège coloré par groupe parlementaire, de la gauche à la droite de l'hémicycle. 85,2 % des députés documentés ont au moins un bac+3 ; 103 formations restent non documentées.";

export const metadata: Metadata = {
  metadataBase: new URL("https://quinousrepresente.fr"),
  title: {
    default: "Qui nous représente — les 577 députés, ce qu'ils ont étudié et fait avant",
    template: "%s — Qui nous représente",
  },
  description:
    "Formation et carrière avant le mandat des 577 députés de la XVIIe législature : diplôme, domaine d'études, secteur privé ou public. Données ouvertes de l'Assemblée nationale, Wikidata et fr.wikipedia.",
  applicationName: "Qui nous représente",
  keywords: [
    "Assemblée nationale",
    "députés",
    "XVIIe législature",
    "formation",
    "carrière",
    "données ouvertes",
  ],
  /*
    Icons and the social card are plain files under `public/` rather than
    `app/` metadata routes, so the build keeps generating exactly the 598 pages
    the site has and nothing else. `?v=` is the cache buster the file
    convention would otherwise have added for us — bump it when a file changes.
  */
  icons: {
    // `app/favicon.ico` emits its own link; this adds the scalable, theme-aware
    // icon that modern browsers prefer.
    icon: [{ url: "/icon.svg?v=2", type: "image/svg+xml", sizes: "any" }],
    apple: { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Qui nous représente",
    title: "Qui nous représente — les 577 députés",
    description:
      "Ce que les 577 députés ont étudié, et ce qu'ils faisaient avant la politique.",
    images: [{ url: "/og.png?v=1", width: 1200, height: 630, alt: CARTE_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Qui nous représente — les 577 députés",
    description:
      "Ce que les 577 députés ont étudié, et ce qu'ils faisaient avant la politique.",
    images: [{ url: "/og.png?v=1", alt: CARTE_ALT }],
  },
  robots: { index: true, follow: true },
};

/* The phone's own browser chrome takes the colour of the plane it sits above. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9ebea" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f0e" },
  ],
};

/*
  Applies a stored theme override before the first paint, so a reader who chose
  the plane the OS does not prefer never sees the other one flash. Kept to one
  statement in a try/catch: it runs blocking, on every page.
*/
const THEME_SCRIPT = `try{var t=localStorage.getItem("qnr-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const meta = getMeta();
  return (
    <html lang="fr" className={`${spectral.variable} ${archivo.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <SiteHeader legislature={meta.legislature} />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <SiteFooter source={meta.source} />
      </body>
    </html>
  );
}
