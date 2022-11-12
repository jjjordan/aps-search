import { applyBindings, observable, Observable, observableArray, ObservableArray } from "knockout";
import { ResultPaginator } from "./results";
import { NaiveSearch } from "./naivesearch";

class ViewModel {
    public searchBox: Observable<string>;
    public results: ResultPaginator;

    private allResults: ObservableArray<Peony>;
    private allPeonies: Peony[];

    constructor(private searcher: Searcher) {
        this.allResults = observableArray();
        this.results = new ResultPaginator(this.allResults, 25);
        this.searchBox = observable();
        this.searchBox.subscribe(x => this.onChange(x));

        fetch("data/registry.json")
            .then(resp => resp.json())
            .then(data => {
                console.log("Fetched peony db: " + data.length);
                this.allPeonies = data;
            });
    }

    private onChange(srch: string): void {
        this.searcher.search(srch, this.allPeonies, this.allResults);
    }
}

applyBindings(new ViewModel(new NaiveSearch()));
