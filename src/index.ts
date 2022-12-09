import { applyBindings, observable, Observable, observableArray, ObservableArray } from "knockout";
import { ResultPaginator } from "./results";
import { NaiveSearch } from "./naivesearch";
import { DumbScoredSearch, ScoredSearch } from "./scoredsearch";
import { prefixFilter } from "./util";
import { makeResultsTable } from "./display";

declare var jQuery;

class ViewModel {
    public searchBox: Observable<string>;
    public searchKinds: ObservableArray<SearchKindItem>;
    public searchKind: Observable<SearchKindItem>;
    public results: ResultPaginator;
    public alphaFilter: Observable<string>;
    public prefixes: ObservableArray<string>;

    private allPeonies: Peony[];

    constructor(private searcher: Searcher) {
        this.results = new ResultPaginator(25, searcher.normalized);
        this.searchBox = observable();
        this.alphaFilter = observable();
        this.searchKinds = observableArray(kinds);
        this.searchKind = observable(kinds[0]);
        this.searchBox.subscribe(x => this.onChange());
        this.searchKind.subscribe(x => this.onChange());

        fetch("data/registry.json")
            .then(resp => resp.json())
            .then(data => {
                console.log("Fetched peony db: " + data.length);
                this.allPeonies = data;

                this.searcher.initDb(this.allPeonies).then(() => this.results.initDb(this.allPeonies));
            });
        
        let alpha = [];
        for (let i = 65; i <= 90; i++) {
            alpha.push(String.fromCharCode(i));
        }

        this.prefixes = observableArray(alpha);
    }

    public setFilter(prefix: string): void {
        this.alphaFilter(prefix);
        this.searchBox("");
        this.results.resetResults(prefixFilter(this.allPeonies, prefix));
    }

    public reset(): void {
        this.alphaFilter("");
        this.searchBox("");

        // Call this here because onChange won't get triggered sometimes.
        this.results.resetResults();
    }

    public next(): void {
        this.scrollAndGo(() => this.results.goNext());
    }

    public prev(): void {
        this.scrollAndGo(() => this.results.goPrev());
    }

    private scrollAndGo(f: () => void): void {
        let y = document.getElementById('peonies-list').offsetTop;
        setTimeout(() => {
            f();
            window.scroll({ top: y, behavior: 'smooth' });
        }, 75);
    }

    private onChange(): void {
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
    }
}

interface SearchKindItem {
    kind: SearchKind;
    label: string;
}

const kinds: SearchKindItem[] = [
    {kind: "All", label: "All"},
    {kind: "Cultivar", label: "Cultivar"},
    {kind: "Originator", label: "Originator"},
    {kind: "Group", label: "Group"},
    {kind: "Country", label: "Country"},
    {kind: "Date", label: "Introduction Date"},
];

jQuery(() => {
    let vm = new ScoredSearch();
    //vm = new NaiveSearch();       // Simple implementation to compare against.
    //vm = new DumbScoredSearch();  // Simpler version of scored search.

    if (makeResultsTable()) {
        applyBindings(new ViewModel(vm));
    }
});
