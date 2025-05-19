import { Observable } from "knockout";

// The result of makeLoader: a function that returns a promise.
export interface Loader {
    (): Promise<Peony[]>;
}

// Minimum time between db loads.
const MIN_AGE = 30 * 1000; // 30 seconds

// Returns a loader given the page input and observable for the cache state.
export function makeLoader(data_url: string, obsCacheState: Observable<RegistryCacheState>): Loader {
    let p: Promise<Peony[]> = null;

    return function(): Promise<Peony[]> {
        // Always return the same promise.
        if (!p) {
            p = new Promise<RegistryCacheState>(resolve => resolve(obsCacheState()))
                .then(cacheState => {
                    // Check the last time we refreshed the db (the newest that we know to be in the cache)
                    // NOTE: This is because the registry endpoint uses the default Wordpress policy of
                    // never caching anything, which is a bit undesirable and probably warrants further
                    // investigation. However, we can exert a lot of control from the client-side which is
                    // a start towards the solution. It's probably worth investigating the interaction
                    // between this endpoint and the CDN.
                    if (typeof cacheState === 'object' && cacheState !== null && typeof cacheState.lastAccess === 'number') {
                        let cacheAge = new Date().getTime() - cacheState.lastAccess;
                        if (cacheAge > getMaxAge()) {
                            // Stale: force reload.
                            return false;
                        } else if (cacheAge < MIN_AGE) {
                            // Not stale enough: force cache.
                            return true;
                        }
                    } else {
                        // No known cache state: force reload.
                        return false;
                    }

                    // Elsewise, we seem to have a valid cache entry -- we need to determine whether this
                    // was a reload or not..
                    return new Promise(resolve => {
                        let observer = new PerformanceObserver(list => {
                            let reloaded = false;
                            list.getEntries().forEach(entry => {
                                //console.log("Entry type: " + (<any>entry).type);
                                if ((<any>entry).type === "reload") {
                                    reloaded = true;
                                }
                            });

                            resolve(!reloaded);
                        });

                        observer.observe({type: "navigation", buffered: true});
                    })
                    // On error or unsupported by browser: default to reload.
                    .then(ok => ok, err => false);
                })
                .then(useCache => {
                    if (useCache) {
                        return fetchData(data_url, "force-cache");
                    } else {
                        return fetchData(data_url, "reload")
                            .then(data => {
                                obsCacheState({lastAccess: new Date().getTime()});
                                return data;
                            });
                    }
                });
        }

        return p;
    };
}

// The actual load function.
function fetchData(url: string, cache: RequestCache): Promise<Peony[]> {
    return fetch(url, {cache: cache}).then(resp => resp.json());
}

// How "stale" do we let the registry get?
// From Jordan:
//   Yup - I would say usually January. I don't do it myself, I have someone else do it, but it all gets added right after the printed Directory is published in December.
//   There are other minor edits that occur from time to time throughout the year - maybe an additional photograph, a footnote, or correction, but those are rather uncommon
function getMaxAge(): number {
    // Set a 12-hour limit in Dec-Jan. For the rest of the year, set a 1-week limit.
    let m = new Date().getMonth();
    if (m === 0 || m === 11) {
        return 12 * 60 * 60 * 1000;
    } else {
        return 7 * 24 * 60 * 60 * 1000;
    }
}
