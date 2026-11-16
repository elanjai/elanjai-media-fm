import type { Metadata } from "next";
import { Suspense } from "react";
import SimpleClient from "@/components/SimpleClient";

export const metadata: Metadata = {
  title: "Simple mode — big buttons, one tap to play",
  description:
    "A giant, easy radio screen for seniors: huge station buttons, one tap to play, one big stop button.",
  robots: { index: false },
};

export default function SimplePage() {
  return (
    <Suspense>
      <SimpleClient />
    </Suspense>
  );
}
