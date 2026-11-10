/**
 * Pure Deterministic State Machine for Checkout & Order Settlement Lifecycle
 * Eliminates race conditions, duplicate submissions, and impossible discount/payment states.
 */

export type CheckoutPhase =
  | 'idle'
  | 'applying_coupon'
  | 'processing_trial'
  | 'processing_payment'
  | 'completed'
  | 'error';

export interface CouponMessage {
  type: 'error' | 'success';
  text: string;
}

export interface CheckoutMachineState {
  phase: CheckoutPhase;
  appliedCoupon: any | null;
  couponMessage: CouponMessage | null;
  errorMessage: string | null;
  successfulOrderId: string | null;
  purchasedItems: any[];
}

export type CheckoutMachineEvent =
  | { type: 'START_COUPON' }
  | { type: 'COUPON_SUCCESS'; coupon: any; message: string }
  | { type: 'COUPON_ERROR'; message: string }
  | { type: 'REMOVE_COUPON' }
  | { type: 'START_TRIAL' }
  | { type: 'START_PAYMENT' }
  | { type: 'SETTLEMENT_SUCCESS'; orderId: string; items: any[] }
  | { type: 'SETTLEMENT_ERROR'; message: string }
  | { type: 'DISMISS_ERROR' }
  | { type: 'RESET' };

export const initialCheckoutMachineState: CheckoutMachineState = {
  phase: 'idle',
  appliedCoupon: null,
  couponMessage: null,
  errorMessage: null,
  successfulOrderId: null,
  purchasedItems: []
};

export function checkoutMachineReducer(
  state: CheckoutMachineState,
  event: CheckoutMachineEvent
): CheckoutMachineState {
  switch (event.type) {
    case 'START_COUPON':
      return {
        ...state,
        phase: 'applying_coupon',
        couponMessage: null
      };

    case 'COUPON_SUCCESS':
      return {
        ...state,
        phase: 'idle',
        appliedCoupon: event.coupon,
        couponMessage: { type: 'success', text: event.message }
      };

    case 'COUPON_ERROR':
      return {
        ...state,
        phase: 'idle',
        couponMessage: { type: 'error', text: event.message }
      };

    case 'REMOVE_COUPON':
      return {
        ...state,
        appliedCoupon: null,
        couponMessage: null
      };

    case 'START_TRIAL':
      // Cannot trigger trial claim if already processing or completed
      if (state.phase === 'processing_trial' || state.phase === 'processing_payment' || state.phase === 'completed') {
        return state;
      }
      return {
        ...state,
        phase: 'processing_trial',
        errorMessage: null
      };

    case 'START_PAYMENT':
      // Cannot trigger payment if already processing or completed
      if (state.phase === 'processing_payment' || state.phase === 'processing_trial' || state.phase === 'completed') {
        return state;
      }
      return {
        ...state,
        phase: 'processing_payment',
        errorMessage: null
      };

    case 'SETTLEMENT_SUCCESS':
      return {
        ...state,
        phase: 'completed',
        successfulOrderId: event.orderId,
        purchasedItems: event.items,
        errorMessage: null
      };

    case 'SETTLEMENT_ERROR':
      return {
        ...state,
        phase: 'error',
        errorMessage: event.message
      };

    case 'DISMISS_ERROR':
      return {
        ...state,
        phase: 'idle',
        errorMessage: null
      };

    case 'RESET':
      return initialCheckoutMachineState;

    default:
      return state;
  }
}
