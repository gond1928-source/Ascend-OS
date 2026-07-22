import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { SettingsProvider } from "@/lib/settings-context";
import { AppRulesProvider } from "@/lib/app-rules-context";
import { SessionProvider } from "@/lib/session-context";
import { DistractionProvider } from "@/lib/distraction-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { ProjectsProvider } from "@/lib/projects-context";
import { RecentsProvider } from "@/lib/recents-context";
import { AppShell } from "@/components/ui/app-shell";
import { SplashGate } from "@/components/ui/splash-gate";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ascend OS",
  description: "Your personal productivity operating system",
  icons: {
    icon: "/branding/ascend-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ThemeProvider defaultTheme="dark">
          <SettingsProvider>
            <AppRulesProvider>
              <SessionProvider>
                <DistractionProvider>
                  <NotificationsProvider>
                    <ProjectsProvider>
                      <RecentsProvider>
                        <SplashGate>
                          <AppShell>{children}</AppShell>
                        </SplashGate>
                      </RecentsProvider>
                    </ProjectsProvider>
                  </NotificationsProvider>
                </DistractionProvider>
              </SessionProvider>
            </AppRulesProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
