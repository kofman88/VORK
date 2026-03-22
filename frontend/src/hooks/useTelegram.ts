import { useEffect, useCallback } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          start_param?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
        openLink: (url: string) => void;
        openTelegramLink: (url: string) => void;
        shareUrl: (url: string) => void;
        colorScheme: "light" | "dark";
        themeParams: Record<string, string>;
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
          selectionChanged: () => void;
        };
        CloudStorage: {
          setItem: (key: string, value: string, callback?: (err: Error | null, stored: boolean) => void) => void;
          getItem: (key: string, callback: (err: Error | null, value: string) => void) => void;
          removeItem: (key: string, callback?: (err: Error | null, removed: boolean) => void) => void;
        };
        version: string;
        platform: string;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        sendData: (data: string) => void;
        onEvent: (eventType: string, eventHandler: () => void) => void;
        offEvent: (eventType: string, eventHandler: () => void) => void;
      };
    };
  }
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, [tg]);

  const haptic = {
    impact: (style: "light" | "medium" | "heavy" = "light") => {
      tg?.HapticFeedback?.impactOccurred(style);
    },
    notification: (type: "success" | "error" | "warning") => {
      tg?.HapticFeedback?.notificationOccurred(type);
    },
    selection: () => {
      tg?.HapticFeedback?.selectionChanged();
    },
  };

  const showBackButton = useCallback((onBack: () => void) => {
    if (!tg) return;
    tg.BackButton.show();
    tg.BackButton.onClick(onBack);
    return () => {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();
    };
  }, [tg]);

  const showMainButton = useCallback((text: string, onClick: () => void, color?: string) => {
    if (!tg) return;
    tg.MainButton.setText(text);
    if (color) tg.MainButton.color = color;
    tg.MainButton.show();
    tg.MainButton.enable();
    tg.MainButton.onClick(onClick);
    return () => {
      tg.MainButton.offClick(onClick);
      tg.MainButton.hide();
    };
  }, [tg]);

  return {
    tg,
    initData: tg?.initData || "",
    user: tg?.initDataUnsafe?.user,
    colorScheme: tg?.colorScheme || "light",
    isDark: tg?.colorScheme === "dark",
    haptic,
    showBackButton,
    showMainButton,
    isInTelegram: !!tg,
  };
}
