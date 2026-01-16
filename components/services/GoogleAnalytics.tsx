"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

export default function GoogleAnalytics({
  GA_MEASUREMENT_ID,
}: {
  GA_MEASUREMENT_ID: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Basic title mapping logic if we want to handle it here globally
    // or we assume individual pages/layouts handle document.title
    // But since the user complained, we'll reinforce it here.
    const url = pathname + searchParams.toString();

    // We can rely on the document.title being set by other components,
    // but there's a race condition. GA might fire before title update.
    // So we manually configure GA with the current info.

    if (typeof window.gtag !== "undefined") {
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: url,
        page_title: document.title, // Pass the current title
      });
    }
  }, [pathname, searchParams, GA_MEASUREMENT_ID]);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `,
        }}
      />
    </>
  );
}
