import { Observable, observable } from 'knockout';

export function bindHistory(): Observable<HistoryState> {
    let state = observable(window.history.state || null);

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

    return state;
}

// Sets the window history state.
function replaceState(state: HistoryState): void {
    window.history.replaceState(state, null, window.location.href);
}
