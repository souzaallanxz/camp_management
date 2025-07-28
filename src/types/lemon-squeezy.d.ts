// Lemon Squeezy types
declare global {
  interface Window {
    LemonSqueezy?: {
      Setup?: (config: { checkout: string }) => { open: () => void };
      Url?: { open: (url: string) => void };
      open?: (url: string) => void;
    };
    ensureLemonSqueezyLoaded?: () => Promise<Window['LemonSqueezy']>;
    loadLemonSqueezy?: () => Promise<Window['LemonSqueezy']>;
    createLemonSqueezy?: () => void;
  }
}

export {}; 