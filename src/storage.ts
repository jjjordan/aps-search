import { Observable, observable } from "knockout";

// Returns an observable that writes out to page history session storage.
export function pageState(): Observable<HistoryState> {
    return bindWindowStorage(pageStateId(), window.sessionStorage);
}

// Returns an observable that writes out to local storage (for the initial state)
export function initState(): Observable<CachedResults> {
    return bindWindowStorage("initState", window.localStorage);
}

// Gets the ID for pageState storage.
function pageStateId(): string {
    let whstate = window.history.state || {};
    let psid: string = whstate.pageStateId;
    if (psid) {
        return psid;
    } else {
        // First visit to this page in the history? Make an ID and bind it.
        psid = "" + new Date().getTime();
        window.history.replaceState({pageStateId: psid}, null, window.location.href);
        return psid;
    }
}

// Builds the observable that is bound to DOM window storage.
function bindWindowStorage<T>(key: string, storage: Storage): Observable<T> {
    let value = storage.getItem(key);
    return bindStorage<T>(
        observable(value === null ? null : <T>JSON.parse(value)),
        v => storage.setItem(key, JSON.stringify(v)));
}

// Builds an observable bound to an arbitrary storage method.
function bindStorage<T>(state: Observable<T>, setter: (value: T) => void): Observable<T> {
    window.addEventListener('beforeunload', () => setter(state()));

    // Save periodically when the state changes.
    let stateTimeout: NodeJS.Timeout = null;
    state.subscribe(() => {
        if (stateTimeout) {
            clearTimeout(stateTimeout);
        }

        stateTimeout = setTimeout(() => {
            setter(state());
            stateTimeout = null;
        }, 500);
    });

    return state;
}
