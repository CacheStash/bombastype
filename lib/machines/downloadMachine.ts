/**
 * Pure Deterministic State Machine for Secure Asset Download Lifecycle
 * Guards against concurrent package spikes, duplicate requests, and unhandled network errors.
 */

export type DownloadStatus = 'idle' | 'preparing' | 'downloading' | 'completed' | 'error';

export interface DownloadMachineState {
  status: DownloadStatus;
  activeTarget: string | null;
  errorMessage: string | null;
}

export type DownloadMachineEvent =
  | { type: 'START_DOWNLOAD'; target: string }
  | { type: 'DOWNLOAD_SUCCESS' }
  | { type: 'DOWNLOAD_ERROR'; message: string }
  | { type: 'RESET' };

export const initialDownloadMachineState: DownloadMachineState = {
  status: 'idle',
  activeTarget: null,
  errorMessage: null
};

export function downloadMachineReducer(
  state: DownloadMachineState,
  event: DownloadMachineEvent
): DownloadMachineState {
  switch (event.type) {
    case 'START_DOWNLOAD':
      // Prevent concurrent download requests for the same or another asset
      if (state.status === 'preparing' || state.status === 'downloading') return state;
      return {
        status: 'preparing',
        activeTarget: event.target,
        errorMessage: null
      };

    case 'DOWNLOAD_SUCCESS':
      return {
        status: 'completed',
        activeTarget: null,
        errorMessage: null
      };

    case 'DOWNLOAD_ERROR':
      return {
        status: 'error',
        activeTarget: null,
        errorMessage: event.message
      };

    case 'RESET':
      return initialDownloadMachineState;

    default:
      return state;
  }
}
