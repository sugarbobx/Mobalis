"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Role } from "@/lib/mock";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/nav-config";

export function AppShell({
  role,
  userLabel,
  userInitiales,
  children,
}: {
  role: Role;
  userLabel: string;
  userInitiales: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS[role];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              MB
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">MOBALIS</span>
              <span className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[role]}</span>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Avatar size="sm">
              <AvatarFallback>{userInitiales}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium">{userLabel}</span>
              <span className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[role]}</span>
            </div>
          </div>
          <SidebarMenuButton render={<Link href="/" />} className="text-sidebar-foreground/70">
            <ArrowLeftRight />
            <span>Changer d&apos;espace</span>
          </SidebarMenuButton>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            Espace {ROLE_LABELS[role].toLowerCase()}
          </span>
        </header>
        <div className="flex-1 space-y-6 p-4 md:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
