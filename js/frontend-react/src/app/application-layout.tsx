"use client";

import { ReactNode } from "react";
import { SidebarLayout } from "@/components/ui-kit/sidebar-layout";
import { Navbar } from "@/components/ui-kit/navbar";
import {
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  HomeIcon,
  PlayIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/solid";
import {
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from "@/components/ui-kit/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { useOneFpga } from "@/hooks";

function IsOneFpgaRunning({ children }: { children: ReactNode }) {
  const { started } = useOneFpga();

  if (!started) return null;
  return children;
}

export function ApplicationLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SidebarLayout
      navbar={<Navbar></Navbar>}
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <SidebarItem>
              <CpuChipIcon />
              <SidebarLabel>1FPGA</SidebarLabel>
              <IsOneFpgaRunning>
                <PlayIcon />
              </IsOneFpgaRunning>
            </SidebarItem>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              <SidebarItem
                current={pathname === "/"}
                onClick={() => router.push("/")}
              >
                <HomeIcon />
                <SidebarLabel>Home</SidebarLabel>
              </SidebarItem>
              <IsOneFpgaRunning>
                <SidebarItem
                  current={pathname.startsWith("/osd")}
                  onClick={() => router.push("/osd")}
                >
                  <Squares2X2Icon />
                  <SidebarLabel>OSD</SidebarLabel>
                </SidebarItem>
              </IsOneFpgaRunning>
            </SidebarSection>

            <SidebarSpacer />

            <SidebarSection>
              <SidebarHeading>External Links</SidebarHeading>
              <SidebarItem href="https://forums.1fpga.com">
                <ChatBubbleLeftRightIcon />
                <SidebarLabel>Forums</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
