import { observable, Observable, observableArray, ObservableArray } from "knockout";
import { ResultPaginator } from "./results";
import { prefixFilter } from "./util";

const RESULT_COUNT = 25;

// ViewModel serves as the top-level knockout.JS viewmodel for the registry search.
export class ViewModel {
    public searchBox: Observable<string>;
    public searchKinds: ObservableArray<SearchKindItem>;
    public searchKind: Observable<SearchKindItem>;
    public results: ResultPaginator;
    public alphaFilter: Observable<string>;
    public prefixes: ObservableArray<string>;

    private allPeonies: Peony[];
    private ready: boolean;
    private onreadyQueue: {(): void}[];

    constructor(private searcher: Searcher, registryInput: ApsRegistryInputs, private pageState: Observable<HistoryState>, homeState: Observable<HistoryState>) {
        let initState = this.pageState() || (registryInput.search ? null : homeState());
        this.results = new ResultPaginator(RESULT_COUNT, searcher.normalized, (initState || {}).results);
        this.searchBox = observable("");
        this.alphaFilter = observable("");
        this.searchKinds = observableArray(kinds);
        this.searchKind = observable(kinds[0]);
        this.searchBox.subscribe(x => this.onChange());
        this.searchKind.subscribe(x => this.onChange());
        this.ready = false;
        this.onreadyQueue = [];

        this.results.on('change', () => this.updateState());
        this.results.on('ready', () => this.onreadyQueue.forEach(f => f()));

        // Load the database!
        fetch(registryInput.data_url)
            .then(resp => resp.json())
            /* Debugging pre-load interactions:
            .then(data => {
                const delay = 5000;
                return new Promise<any>((resolve, reject) => {
                    setTimeout(() => {
                        resolve(data);
                    }, delay);
                });
            })
            */
            .then(data => {
                this.allPeonies = data;
                return this.searcher.initDb(this.allPeonies);
            })
            .then(() => this.results.initDb(this.allPeonies))
            .then(() => {
                // Enable+start search after everything is initialized.
                // (either searches from history state or the registryInput)
                this.ready = true;
                if (this.searchBox() !== "") {
                    // Execute the search.
                    this.onChange();
                } else if (this.alphaFilter() !== "") {
                    // Select a filter.
                    this.setFilter(this.alphaFilter());
                } else {
                    // Otherwise, just display the database.
                    this.results.resetResults();
                }

                this.saveHomeState(homeState);
            });

        // Initialize alpha filters. (populate A-Z)
        let alpha = [];
        for (let i = 65; i <= 90; i++) {
            alpha.push(String.fromCharCode(i));
        }

        this.prefixes = observableArray(alpha);

        // Initialize search.
        if (typeof initState === 'object' && initState !== null) {
            this.searchBox(initState.search);
            this.alphaFilter(initState.alpha);
        } else if (registryInput.search) {
            // This differs slightly from the original behavior, which will always come back to
            // the front of the results if invoked from the top-right. That behavior *feels wrong*
            // so we'll defer to the most recent change always.
            this.searchBox(registryInput.search);
        }
    }

    // Called by View to set a prefix filter.
    public setFilter(prefix: string): void {
        if (!this.ready) {
            this.onreadyQueue.push(() => this.setFilter(prefix));
            return;
        }

        this.alphaFilter(prefix);
        this.searchBox("");
        if (this.ready) {
            this.results.resetResults(prefixFilter(this.allPeonies, prefix));
            this.updateState();
        }
    }

    // Called by the View on reset.
    public reset(): void {
        if (!this.ready) {
            this.onreadyQueue.push(() => this.reset());
            return;
        }

        this.alphaFilter("");
        this.searchBox("");

        // Call this here because onChange won't get triggered sometimes.
        if (this.ready) {
            this.results.resetResults(null, true);
            this.updateState();
        }
    }

    // Called by the View for 'Next >'
    public next(): void {
        if (!this.ready) {
            this.onreadyQueue.push(() => this.next());
            return;
        }

        this.scrollAndGo(() => {
            this.results.goNext();
            this.updateState();
        });
    }

    // Called by the View for '< Prev'
    public prev(): void {
        if (!this.ready) {
            this.onreadyQueue.push(() => this.prev());
            return;
        }

        this.scrollAndGo(() => {
            this.results.goPrev();
            this.updateState();
        });
    }

    // Called by the View to change the sort column.
    public setSorter(name: string): void {
        if (!this.ready) {
            this.onreadyQueue.push(() => this.setSorter(name));
            return;
        }

        this.results.setSorter(name);
        this.updateState();
    }

    // Scrolls to the top of the result list -- after a short delay to allow results to update.
    private scrollAndGo(f: () => void): void {
        let elem = document.getElementById('peonies-list');
        if (elem) {
            let y = document.getElementById('peonies-list').offsetTop;
            setTimeout(() => {
                f();
                window.scroll({ top: y, behavior: 'smooth' });
            }, 75);
        }
    }

    // Called when search query or search kind changes.
    private onChange(): void {
        if (!this.ready) {
            return;
        }

        let srch = this.searchBox();
        let kind = this.searchKind().kind;

        if (srch.trim().length == 0) {
            // Allow search to cancel.
            this.searcher.search("", kind, this.results);

            if (!this.alphaFilter()) {
                this.results.resetResults();
            }

            return;
        } else if (this.alphaFilter()) {
            this.alphaFilter("");
        }

        this.searcher.search(srch, kind, this.results);
        
        // We used to update state here, but now we'll wait for the search to finish ('change' event)
    }

    // Computes the HistoryState value to stash into history.
    private getState(): HistoryState {
        return {
            alpha: this.alphaFilter(),
            search: this.searchBox(),
            results: this.results.getState(),
        };
    }

    // Update pageState observable so that it can be stored in browser history (or wherever).
    private updateState(): void {
        this.pageState(this.getState());
    }

    // Saves the home results (blank query, first 25 entries in the DB) to storage after the DB is loaded.
    private saveHomeState(homeState: Observable<HistoryState>): void {
        // Delay by a few secondsd to allow bindings to update, etc.
        setTimeout(() => {
            let tmpres = new ResultPaginator(RESULT_COUNT, this.searcher.normalized, undefined);
            tmpres.initDb(this.allPeonies)
                .then(() => {
                    tmpres.resetResults();
                    homeState({
                        results: tmpres.getState(),
                        alpha: "",
                        search: ""
                    });
                })
        }, 5000);
    }
}

// ViewModel labels for search-kinds.
interface SearchKindItem {
    kind: SearchKind;
    label: string;
}

// Constant list of search kinds.
const kinds: SearchKindItem[] = [
    {kind: "All", label: "All"},
    {kind: "Cultivar", label: "Cultivar"},
    {kind: "Originator", label: "Originator"},
    {kind: "Group", label: "Group"},
    {kind: "Country", label: "Country"},
    {kind: "Date", label: "Introduction Date"},
];
