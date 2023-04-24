import { Observable } from "knockout";

// The result of makeLoader: a function that returns a promise.
export interface Loader {
    (): Promise<Peony[]>;
}

// How "stale" do we let the registry get?
const MAX_AGE = 12 * 60 * 60 * 1000; // 12 hours

// Returns a loader given the page input and observable for the cache state.
export function makeLoader(data_url: string, obsCacheState: Observable<RegistryCacheState>): Loader {
    let p: Promise<Peony[]> = null;

    return function(): Promise<Peony[]> {
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
                        if ((new Date().getTime() - cacheState.lastAccess) > MAX_AGE) {
                            // Stale, force reload.
                            return false;
                        }
                    }

                    // Elsewise, we need to see whether this was a reload or not.. It's a bit complicated..
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
