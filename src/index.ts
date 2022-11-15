import { applyBindings, observable, Observable, observableArray, ObservableArray } from "knockout";
import { ResultPaginator } from "./results";
import { NaiveSearch } from "./naivesearch";
import { DumbScoredSearch, ScoredSearch } from "./scoredsearch";

class ViewModel {
    public searchBox: Observable<string>;
    public searchKinds: ObservableArray<SearchKindItem>;
    public searchKind: Observable<SearchKindItem>;
    public results: ResultPaginator;

    private allPeonies: Peony[];

    constructor(private searcher: Searcher) {
        this.results = new ResultPaginator(25);
        this.searchBox = observable();
        this.searchKinds = observableArray(kinds);
        this.searchKind = observable(kinds[0]);
        this.searchBox.subscribe(x => this.onChange());
        this.searchKind.subscribe(x => this.onChange());

        fetch("data/registry.json")
            .then(resp => resp.json())
            .then(data => {
                console.log("Fetched peony db: " + data.length);
                this.allPeonies = data;

                this.results.initDb(this.allPeonies);
                this.searcher.initDb(this.allPeonies);
            });
    }

    private onChange(): void {
        let srch = this.searchBox();
        let kind = this.searchKind().kind;

        if (srch.trim().length == 0) {
            this.results.resetResults();
            return;
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
]

//applyBindings(new ViewModel(new NaiveSearch()));
applyBindings(new ViewModel(new ScoredSearch()));
//applyBindings(new ViewModel(new DumbScoredSearch()));
