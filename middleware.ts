import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

const ROLE_TABLE: Record<string, string> = {
  admin: "admins",
  tutor: "repetiteurs",
  parent: "parents",
  student: "eleves",
};

function matchedRole(pathname: string): string | null {
  for (const role of Object.keys(ROLE_TABLE)) {
    if (pathname === `/${role}` || pathname.startsWith(`/${role}/`)) return role;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  // Refreshes the session cookie if expired — required for Server Components
  // to see a valid session (they can't set cookies themselves).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = matchedRole(request.nextUrl.pathname);
  if (role) {
    const hasAccess =
      !!user &&
      (await supabase
        .from(ROLE_TABLE[role])
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => !!data));

    if (!hasAccess) {
      const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
      supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
