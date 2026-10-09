import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getSession } from "@/lib/auth/session";
import { isOwnerAllowlistEnabled } from "@/lib/auth/owner";
import { SIDEBAR_COOKIE } from "@/lib/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DemoBanner } from "@/components/layout/demo-banner";
import { OpenAccessBanner } from "@/components/layout/open-access-banner";

export default async function PainelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "true";

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <a
        href="#main-content"
        className="bg-background text-foreground focus:ring-ring sr-only z-50 rounded-md px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2"
      >
        Pular para o conteúdo
      </a>
      <div className="hidden md:flex">
        <Sidebar
          user={session.user}
          demoMode={session.demoMode}
          initialCollapsed={initialCollapsed}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={session.user} demoMode={session.demoMode} />
        {session.demoMode && <DemoBanner />}
        {!session.demoMode && !isOwnerAllowlistEnabled() && (
          <OpenAccessBanner />
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 outline-none md:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
