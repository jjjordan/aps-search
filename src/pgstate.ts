import { Observable, observable } from "knockout";

export function bindState(): Observable<HistoryState> {
    // Initialize.
    let whstate = window.history.state || {};
    let whid: string = whstate.id;
    if (whid) {
        // Use session storage with this key ...
        return boundSessionStorage(whid);
    } else {
        // First visit to this page in the history? Make an ID and bind it.
        whid = "" + new Date().getTime();
        window.history.replaceState({id: whid}, null, window.location.href);
        return boundSessionStorage(whid);
    }
}

function boundSessionStorage(key: string): Observable<HistoryState> {
    let item = window.sessionStorage.getItem(key);
    let val: any = item === null ? null : JSON.parse(item);
    let state = observable(val);

    window.addEventListener('beforeunload', () => replaceState(key, state()));

    // Save periodically as state changes.
    let stateTimeout: NodeJS.Timeout = null;
    state.subscribe(() => {
        if (stateTimeout) {
            clearTimeout(stateTimeout);
        }

        stateTimeout = setTimeout(() => {
            replaceState(key, state());
            stateTimeout = null;
        }, 500);
    });

    return state;
}

function replaceState(key: string, state: HistoryState): void {
    window.sessionStorage.setItem(key, JSON.stringify(state));
}
