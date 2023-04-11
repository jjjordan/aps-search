import { Observable } from 'knockout';

// Stores app state in window.history
export function bindHistory(state: Observable<HistoryState>): void {
    // Save before navigating away.
    window.addEventListener('beforeunload', () => replaceState(state()));

    // Save periodically as state changes.
    let stateTimeout: NodeJS.Timeout = null;
    state.subscribe(() => {
        if (stateTimeout) {
            clearTimeout(stateTimeout);
        }

        stateTimeout = setTimeout(() => {
            replaceState(state());
            stateTimeout = null;
        }, 500);
    });
}

// Gets current state.
export function getState(): HistoryState {
    return window.history.state;
}

// Sets the window history state.
function replaceState(state: HistoryState): void {
    window.history.replaceState(state, null, window.location.href);
}
