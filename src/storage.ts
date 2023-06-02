import { Observable, observable } from "knockout";

interface ExternalChangeHandler<T> {
    (newValue: T, current: Observable<T>): void;
}

// Returns an observable that writes out to page history session storage.
export function pageState(): Observable<HistoryState> {
    return bindWindowStorage(pageStateId(), window.sessionStorage);
}

// Returns an observable that writes out to local storage (for the initial state)
export function homeState(changeHandler?: ExternalChangeHandler<HistoryState>): Observable<HistoryState> {
    return bindWindowStorage("homeState", window.localStorage, changeHandler);
}

// Returns an observable bound to local storage: 
export function registryCacheState(changeHandler?: ExternalChangeHandler<RegistryCacheState>): Observable<RegistryCacheState> {
    return bindWindowStorage("regcacheinfo", window.localStorage, changeHandler);
}

// Gets the ID for pageState storage.
function pageStateId(): string {
    let whstate = window.history.state || {};
    let psid: string = whstate.pageStateId;
    if (!psid) {
        // First visit to this page in the history? Make an ID and bind it.
        psid = "" + new Date().getTime();
        window.history.replaceState({pageStateId: psid}, null, window.location.href);
    }

    return psid;
}

// Builds the observable that is bound to DOM window storage.
function bindWindowStorage<T>(key: string, storage: Storage, changeHandler?: ExternalChangeHandler<T>): Observable<T> {
    let value = storage.getItem(key);
    let obsv = observable(value === null ? null : <T>JSON.parse(value))
    if (changeHandler) {
        // Detect and merge data if changed in another window or tab.
        window.addEventListener('storage', e => {
            if (e.key === key) {
                changeHandler(<T>JSON.parse(e.newValue), obsv);
            }
        });
    }

    return bindStorage<T>(obsv, v => storage.setItem(key, JSON.stringify(v)));
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
