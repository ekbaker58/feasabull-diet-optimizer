import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "@/index.css?url";
import favicon from "@/assets/mascots/logo.jpg?url";

const TITLE = "Feasabull Calories — USF Calorie & Nutrient Calculator";
const DESCRIPTION =
  "Free calorie, macro and vitamin calculator for the USF community. Same DRI equations as the USDA calculator — no sign-up.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Feasabull Calories — USF Calorie Calculator" },
      {
        property: "og:description",
        content:
          "Get your daily calorie target, macro split, BMI and 19 vitamin and mineral goals in under a minute.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: favicon },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Inter+Tight:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  component: RootDocument,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-brand-cream px-6 text-center">
      <div>
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-brand-green">
          404
        </p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-brand-deep">
          Nothing here.
        </h1>
        <a
          href="/"
          className="mt-6 inline-flex rounded-full bg-brand-green px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-cream transition-colors hover:bg-brand-deep"
        >
          Back to the calculator
        </a>
      </div>
    </div>
  );
}

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      {/* data-react-root is read by Base44's preview bridge — keep it. */}
      <body data-react-root="true">
        <Outlet />
        <Toaster position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
