import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { ServiceWorkerRegistrar } from '@/components/layout/ServiceWorkerRegistrar';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { OnboardingTour } from '@/components/ui/OnboardingTour';

import { Sora, Inter } from "next/font/google";

const sora = Sora({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <NextIntlClientProvider messages={messages}>
        <AuthProvider>
          <div className={`${sora.variable} ${inter.variable} antialiased bg-background text-foreground font-body min-h-screen`}>
            <div className="bg-noise" aria-hidden="true" />
            <ServiceWorkerRegistrar />
            <QueryProvider>
              <AppShell>{children}</AppShell>
              <OnboardingTour />
              <Toaster />
            </QueryProvider>
          </div>
        </AuthProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );

}
