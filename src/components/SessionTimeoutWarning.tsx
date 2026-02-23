import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const IDLE_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // show warning 5 min before

export function SessionTimeoutWarning() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (!session) return;
    setShowWarning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    timerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(Math.floor(WARNING_BEFORE_MS / 1000));
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            signOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, [session, signOut]);

  useEffect(() => {
    if (!session) return;
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [session, resetTimer]);

  const handleExtend = async () => {
    await supabase.auth.refreshSession();
    resetTimer();
  };

  if (!session) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("session.timeoutTitle" as any)}</DialogTitle>
          <DialogDescription>
            {t("session.timeoutDesc" as any)} {minutes}:{seconds.toString().padStart(2, "0")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={signOut}>
            {t("common.logout")}
          </Button>
          <Button onClick={handleExtend}>
            {t("session.stayLoggedIn" as any)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
