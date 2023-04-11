import { observable, Observable, observableArray, ObservableArray } from "knockout";
import { ResultPaginator } from "./results";
import { prefixFilter } from "./util";

// ViewModel serves as the top-level knockout.JS viewmodel for the registry search.
export class ViewModel {
    public searchBox: Observable<string>;
    public searchKinds: ObservableArray<SearchKindItem>;
    public searchKind: Observable<SearchKindItem>;
    public results: ResultPaginator;
    public alphaFilter: Observable<string>;
    public prefixes: ObservableArray<string>;
    public pageState: Observable<HistoryState>;

    private allPeonies: Peony[];
    private ready: boolean;

    constructor(private searcher: Searcher, registryInput: ApsRegistryInputs, initState: HistoryState) {
        this.results = new ResultPaginator(25, searcher.normalized, (initState || {}).results);
        this.searchBox = observable("");
        this.alphaFilter = observable("");
        this.searchKinds = observableArray(kinds);
        this.searchKind = observable(kinds[0]);
        this.searchBox.subscribe(x => this.onChange());
        this.searchKind.subscribe(x => this.onChange());
        this.ready = false;
        this.pageState = observable(initState);

        // Load the database!
        fetch(registryInput.data_url)
            .then(resp => resp.json())
            .then(data => {
                this.allPeonies = data;
                this.searcher.initDb(this.allPeonies)
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
                    });
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
        this.alphaFilter(prefix);
        this.searchBox("");
        if (this.ready) {
            this.results.resetResults(prefixFilter(this.allPeonies, prefix));
            this.updateState();
        }
    }

    // Called by the View on reset.
    public reset(): void {
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
        this.scrollAndGo(() => {
            this.results.goNext();
            this.updateState();
        });
    }

    // Called by the View for '< Prev'
    public prev(): void {
        this.scrollAndGo(() => {
            this.results.goPrev();
            this.updateState();
        });
    }

    // Called by the View to change the sort column.
    public setSorter(name: string): void {
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
            if (!this.alphaFilter()) {
                this.results.resetResults();
            }

            return;
        } else if (this.alphaFilter()) {
            this.alphaFilter("");
        }

        this.searcher.search(srch, kind, this.results);
        this.updateState();
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
