/**
 * Pure Deterministic State Machine for Typeface Licensing & Pricing Configurator
 * Zero-dependency, lightweight, fully typed discriminated union state machine.
 */

export type LicenseModeType = 'trial' | 'commercial' | 'corporate';

export type CommercialUsage = 'desktop' | 'social_web' | 'logo_branding' | 'app' | 'server' | 'broadcast';

export interface LicensePrices {
  desktop?: number;
  social_web?: number;
  logo_branding?: number;
  app?: number;
  server?: number;
  broadcast?: number;
  corporate?: number;
}

export interface ConfiguratorState {
  mode: LicenseModeType;
  selectedUsages: string[];
  selectedTiers: Record<string, string>;
  discountPercent: number;
  status: 'idle' | 'adding' | 'added';
}

export type ConfiguratorEvent =
  | { type: 'SWITCH_MODE'; mode: LicenseModeType }
  | { type: 'TOGGLE_USAGE'; usage: string }
  | { type: 'SET_TIER'; usage: string; tier: string }
  | { type: 'SET_DISCOUNT'; percent: number }
  | { type: 'START_ADD' }
  | { type: 'FINISH_ADD' }
  | { type: 'RESET_ADD' };

export const DEFAULT_TIERS: Record<string, string> = {
  desktop: 'solo',
  social_web: 'small_50k',
  logo_branding: 'personal',
  app: 'solo',
  server: 'solo',
  broadcast: 'solo'
};

export const HIGHER_TIER_USAGES = ['logo_branding', 'app', 'broadcast', 'server'];

export function createInitialConfiguratorState(
  initialOption?: 'trial' | 'corporate',
  initialDiscount: number = 0
): ConfiguratorState {
  const mode: LicenseModeType = initialOption === 'trial' 
    ? 'trial' 
    : (initialOption === 'corporate' ? 'corporate' : 'commercial');

  return {
    mode,
    selectedUsages: mode === 'commercial' ? ['desktop'] : [],
    selectedTiers: { ...DEFAULT_TIERS },
    discountPercent: initialDiscount,
    status: 'idle'
  };
}

export function configuratorReducer(
  state: ConfiguratorState,
  event: ConfiguratorEvent
): ConfiguratorState {
  switch (event.type) {
    case 'SWITCH_MODE': {
      if (state.mode === event.mode) return state;
      return {
        ...state,
        mode: event.mode,
        selectedUsages: event.mode === 'commercial' 
          ? (state.selectedUsages.length > 0 ? state.selectedUsages : ['desktop'])
          : [],
        status: 'idle'
      };
    }

    case 'TOGGLE_USAGE': {
      // Interacting with individual usages always transitions to commercial mode
      const isAlreadyCommercial = state.mode === 'commercial';
      const prevUsages = isAlreadyCommercial ? state.selectedUsages : [];
      const usage = event.usage;
      const nextUsages = prevUsages.includes(usage)
        ? prevUsages.filter(u => u !== usage)
        : [...prevUsages, usage];

      return {
        ...state,
        mode: 'commercial',
        selectedUsages: nextUsages,
        status: 'idle'
      };
    }

    case 'SET_TIER': {
      return {
        ...state,
        selectedTiers: {
          ...state.selectedTiers,
          [event.usage]: event.tier
        }
      };
    }

    case 'SET_DISCOUNT': {
      return {
        ...state,
        discountPercent: event.percent
      };
    }

    case 'START_ADD': {
      return {
        ...state,
        status: 'adding'
      };
    }

    case 'FINISH_ADD': {
      return {
        ...state,
        status: 'added'
      };
    }

    case 'RESET_ADD': {
      return {
        ...state,
        status: 'idle'
      };
    }

    default:
      return state;
  }
}
