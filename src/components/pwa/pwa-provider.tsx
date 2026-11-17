"use client";

import * as React from "react";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PwaSplashScreen } from "@/components/pwa/splash-screen";
import { SwRegister } from "@/components/pwa/sw-register";

export function PwaProvider({
  showSplash = false,
  showInstallPrompt = false,
}: {
  showSplash?: boolean;
  showInstallPrompt?: boolean;
}) {
  const [hasSwUpdate, setHasSwUpdate] = React.useState(false);

  return (
    <>
      {showSplash && <PwaSplashScreen />}
      <SwRegister onUpdateAvailabilityChange={setHasSwUpdate} />
      {showInstallPrompt && <InstallPrompt hidden={hasSwUpdate} />}
    </>
  );
}
