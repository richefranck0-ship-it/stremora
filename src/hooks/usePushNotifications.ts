import { useState, useEffect, useCallback } from 'react';

const PUSH_SOUND_KEY = 'streamora_push_sound_enabled';
const PUSH_DISMISSED_KEY = 'streamora_push_prompt_dismissed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Ignore audio context autoplay restriction
  }
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [serverEnabled, setServerEnabled] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PUSH_SOUND_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [needsIOSInstall, setNeedsIOSInstall] = useState(false);

  const checkStatus = useCallback(async () => {
    const isPushSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    setNeedsIOSInstall(isIOS && !isStandalone);
    setSupported(isPushSupported);

    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }

    try {
      const res = await fetch('/api/push/status');
      if (res.ok) {
        const data = await res.json();
        setServerEnabled(Boolean(data.enabled));
      }
    } catch {
      // ignore offline
    }

    if (isPushSupported) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setIsSubscribed(Boolean(sub));
      } catch {
        setIsSubscribed(false);
      }
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setErrorMsg(null);
    if (!supported) {
      setErrorMsg(
        needsIOSInstall
          ? "Sur iPhone/iPad, installez d'abord l'application sur l'écran d'accueil via Partager → Sur l'écran d'accueil."
          : 'Les notifications push ne sont pas prises en charge sur ce navigateur.'
      );
      return false;
    }

    setIsBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setErrorMsg("L'autorisation des notifications a été refusée dans le navigateur.");
        return false;
      }

      const keyRes = await fetch('/api/push/vapid-public-key');
      if (!keyRes.ok) throw new Error('Impossible de récupérer la clé VAPID.');
      const { publicKey, enabled } = await keyRes.json();
      setServerEnabled(Boolean(enabled));
      if (!enabled) {
        setErrorMsg('Les notifications push sont momentanément désactivées par l’administration.');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const appServerKey = urlBase64ToUint8Array(publicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey.buffer as ArrayBuffer,
        });
      }

      const subRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
      if (!subRes.ok) throw new Error('Erreur lors de l’enregistrement de l’abonnement.');

      setIsSubscribed(true);
      if (soundEnabled) playNotificationChime();
      localStorage.setItem(PUSH_DISMISSED_KEY, '1');
      return true;
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors de l’activation des notifications.');
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [supported, needsIOSInstall, soundEnabled]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsBusy(true);
    setErrorMsg(null);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
      }
      setIsSubscribed(false);
      return true;
    } catch {
      setErrorMsg('Impossible de désactiver les notifications.');
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PUSH_SOUND_KEY, String(next));
      } catch {
        // ignore
      }
      if (next) playNotificationChime();
      return next;
    });
  }, []);

  return {
    supported,
    serverEnabled,
    isSubscribed,
    permission,
    isBusy,
    errorMsg,
    soundEnabled,
    needsIOSInstall,
    subscribe,
    unsubscribe,
    toggleSound,
    refreshStatus: checkStatus,
  };
}
