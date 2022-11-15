import { applyBindings, observable, Observable, observableArray, ObservableArray } from "knockout";
import { ResultPaginator } from "./results";
import { NaiveSearch } from "./naivesearch";
import { DumbScoredSearch, ScoredSearch } from "./scoredsearch";

class ViewModel {
    public searchBox: Observable<string>;
    public results: ResultPaginator;

    private allPeonies: Peony[];

    constructor(private searcher: Searcher) {
        this.results = new ResultPaginator(25);
        this.searchBox = observable();
        this.searchBox.subscribe(x => this.onChange(x));

        fetch("data/registry.json")
            .then(resp => resp.json())
            .then(data => {
                console.log("Fetched peony db: " + data.length);
                this.allPeonies = data;

                this.results.initDb(this.allPeonies);
                this.searcher.initDb(this.allPeonies);
            });
    }

    private onChange(srch: string): void {
        if (srch.trim().length == 0) {
            this.results.resetResults();
            return;
        }

        this.searcher.search(srch, this.results);
    }
}

//applyBindings(new ViewModel(new NaiveSearch()));
applyBindings(new ViewModel(new ScoredSearch()));
//applyBindings(new ViewModel(new DumbScoredSearch()));
