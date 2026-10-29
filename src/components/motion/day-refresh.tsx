"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Atualiza as listagens quando a data muda em America/Sao_Paulo (expiração). */
export function DayRefresh() {
  const router = useRouter();

  useEffect(() => {
    let lastDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());

    const interval = window.setInterval(() => {
      const current = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date());
      if (current !== lastDate) {
        lastDate = current;
        router.refresh();
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}
