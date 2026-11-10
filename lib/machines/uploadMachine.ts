/**
 * Pure Deterministic State Machine for Typeface Ingestion & Asset Upload Lifecycle
 * Prevents concurrent upload collisions, partial ingestion states, and premature submission.
 */

export type IngestionPhase =
  | 'idle'
  | 'searching_drive'
  | 'uploading_r2'
  | 'saving_database'
  | 'success'
  | 'error';

export interface UploadMachineState {
  phase: IngestionPhase;
  progressText: string | null;
  errorMessage: string | null;
}

export type UploadMachineEvent =
  | { type: 'START_DRIVE_SEARCH' }
  | { type: 'DRIVE_SEARCH_DONE' }
  | { type: 'START_SAVE'; text?: string }
  | { type: 'UPDATE_PROGRESS'; text: string }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'RESET' };

export const initialUploadMachineState: UploadMachineState = {
  phase: 'idle',
  progressText: null,
  errorMessage: null
};

export function uploadMachineReducer(
  state: UploadMachineState,
  event: UploadMachineEvent
): UploadMachineState {
  switch (event.type) {
    case 'START_DRIVE_SEARCH':
      if (state.phase !== 'idle') return state;
      return {
        ...state,
        phase: 'searching_drive',
        progressText: 'Searching Drive repository...',
        errorMessage: null
      };

    case 'DRIVE_SEARCH_DONE':
      return {
        ...state,
        phase: 'idle',
        progressText: null
      };

    case 'START_SAVE':
      if (state.phase === 'uploading_r2' || state.phase === 'saving_database') return state;
      return {
        ...state,
        phase: 'uploading_r2',
        progressText: event.text || 'Uploading assets to R2...',
        errorMessage: null
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progressText: event.text
      };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        phase: 'success',
        progressText: 'Asset successfully registered.',
        errorMessage: null
      };

    case 'SAVE_ERROR':
      return {
        ...state,
        phase: 'error',
        errorMessage: event.error,
        progressText: null
      };

    case 'RESET':
      return initialUploadMachineState;

    default:
      return state;
  }
}
