import { observable, Observable, observableArray, ObservableArray } from 'knockout';
import { EventEmitter2 } from 'eventemitter2';

const default_sorter = "cultivar";
const cached_results_version = 0;

// ResultPaginator manages the order and display of Peony objects, either from search results or the full database.
export class ResultPaginator extends EventEmitter2 implements IResultPaginator {
    public view: ObservableArray<Peony>;
    public pages: ObservableArray<BreadCrumb>;
    public range: Observable<string>;
    public sorters: {[name: string]: SortMethod};
    public hasNext: Observable<boolean>;
    public hasPrev: Observable<boolean>;

    private pageNo: number;
    private curSorter: string;
    private nonScoreSorter: string;
    private db: Peony[];
    private results: ScoredPeony[];
    private ready: boolean;
    private stateInitialized: boolean;

    constructor(private resultCount: number, searcherNormalized: boolean, private initState: ResultsState) {
        super();
        this.pages = observableArray();
        this.view = observableArray();
        this.range = observable("");
        this.sorters = makeSorters(searcherNormalized);
        this.hasNext = observable(false);
        this.hasPrev = observable(false);
        this.curSorter = default_sorter;
        this.nonScoreSorter = default_sorter;
        this.pageNo = 0;
        this.db = this.results = [];
        this.ready = false;

        this.view.subscribe(() => this.emit('change'));
        
        if (typeof initState === 'object' && initState !== null && initState.version === cached_results_version) {
            // Load up initial state.
            this.sorters[initState.sorter].ascending(initState.direction === 'ASC');
            this.sorters[initState.sorter].select();
            this.curSorter = initState.sorter;
            this.pageNo = initState.pageNo;
            this.nonScoreSorter = initState.nonScoreSorter;
            this.view(initState.results.view);
            this.range(initState.results.range);
            this.hasPrev(initState.results.hasPrev);
            this.hasNext(initState.results.hasNext);

            this.stateInitialized = true;
        } else {
            this.stateInitialized = false;
        }
    }

    public initDb(db: Peony[]): Promise<void> {
        this.db = db.slice();
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    // searchResults switches to view the results of a search.
    public searchResults(results: Peony[]) {
        this.results = results;
        if (!this.applyInitialState()) {
            this.assignSorter("score", false);
            this.goto(0);
        }

        this.emit('change');
    }

    // Resets the results such that the full database will be shown.
    // This is also called once after the database is loaded.
    public resetResults(results?: Peony[], resetSorter?: boolean) {
        this.results = results || this.db;
        if (!this.applyInitialState()) {
            if (resetSorter) {
                this.sorters[default_sorter].reset();
                this.nonScoreSorter = default_sorter;
            }

            this.assignSorter(this.nonScoreSorter, false);
            this.goto(0);
        }

        this.emit('change');
    }

    // Applies the initState (from search history) for only the first search that comes in.
    // Returns true if the state was applied (in which case the caller should cancel whatever
    // it was going to do), and false if not. This is necessary to re-apply the previous state
    // after navigating away and back.
    private applyInitialState(): boolean {
        // This stuff has already been applied, we now need to 
        let result: boolean;
        if (!this.ready && this.stateInitialized && this.results.length === this.initState.count) {
            this.sorters[this.curSorter].sort(this.results);
            this.emit('ready');
            result = true;
        } else {
            result = false;
        }

        this.ready = true;
        return result;
    }

    // Computes the state to retain in window history so that the current view can be restored
    // after navigating away and back again.
    public getState(): ResultsState {
        return {
            version: cached_results_version,
            direction: this.sorters[this.curSorter].ascending() ? "ASC" : "DESC",
            sorter: this.curSorter,
            nonScoreSorter: this.nonScoreSorter,
            pageNo: this.pageNo,
            count: this.results.length,
            results: {
                view: this.view(),
                range: this.range(),
                hasNext: this.hasNext(),
                hasPrev: this.hasPrev(),
            }
        };
    }

    // Next page.
    public goNext(): void {
        this.goto(this.pageNo + 1);
    }

    // Previous page.
    public goPrev(): void {
        this.goto(this.pageNo - 1);
    }

    // Goto page.
    public goto(idx: number): void {
        // Make sure input is inbounds.
        if (idx < 0 || (this.results.length && idx >= Math.ceil(this.results.length / this.resultCount))) {
            return;
        }
        
        this.pageNo = idx;
        this.updateNavigation();
        this.updateCounter();
    }

    // Update navigation-related observables
    private updateNavigation(): void {
        // Update page crumbs length.
        const pageCount = Math.ceil(this.results.length / this.resultCount);
        let rangeStart = Math.max(0, this.pageNo - 2);
        let rangeEnd = Math.min(rangeStart + 4, pageCount - 1);
        rangeStart = Math.max(0, rangeEnd - 4);

        let pages = this.pages().slice();
        let i = 0;
        let self = this;
        function next(active: boolean, selected: boolean, label: string, idx: number) {
            let page: BreadCrumb = null;
            if (pages.length > i) {
                page = pages[i++];
            } else {
                page = new BreadCrumb(self);
                pages.push(page);
                i++;
            }

            page.active(active);
            page.selected(selected);
            page.label(label);
            page.index = active ? idx : -1;
        }

        // First
        next(this.pageNo > 0, false, "<< First", 0);
        next(this.pageNo > 0, false, "< Prev", this.pageNo - 1);
        
        if (rangeStart > 0) {
            next(false, false, "...", -1);
        }

        for (let j = rangeStart; j <= rangeEnd; j++) {
            next(this.pageNo != j, this.pageNo == j, (j + 1) + "", j);
        }

        if (rangeEnd < (pageCount - 1)) {
            next(false, false, "...", -1);
        }

        next(this.pageNo < (pageCount - 1), false, "Next >", this.pageNo + 1);
        next(this.pageNo < (pageCount - 1), false, "Last >>", pageCount - 1);

        //console.log(`lengths: ${this.pages().length}, ${i}`);
        if (this.pages().length !== i) {
            this.pages(pages.slice(0, i));
        }

        this.hasNext(this.pageNo < (pageCount - 1));
        this.hasPrev(this.pageNo > 0);
    }

    // Updates the counter ("X-Y of Z")
    private updateCounter(): void {
        let start = this.pageNo * this.resultCount;
        let end = Math.min(start + this.resultCount, this.results.length);
        this.view(this.results.slice(start, end));
        if (this.results.length > 0) {
            this.range(start < end ? `[${start + 1} - ${end} of ${this.results.length}]` : "");
        } else {
            this.range("[0 results]");
        }
    }

    // Called by view to set the sorter - can also be used to invert the sort direction
    // if the specified sorter is already selected.
    public setSorter(name: string): void {
        this.assignSorter(name, true);
        if (name !== "score") {
            this.nonScoreSorter = name;
        }

        this.updateCounter();
    }

    // Internal method to set the sorter. If `adjustDirection` is true, then the direction
    // is inverted if the sorter is already selected.
    private assignSorter(sorter: string, adjustDirection: boolean): void {
        if (this.curSorter !== sorter) {
            if (this.curSorter) {
                if (adjustDirection) {
                    this.sorters[this.curSorter].reset();
                }

                this.sorters[this.curSorter].deselect();
            }

            this.curSorter = sorter;
            this.sorters[sorter].select();
        } else if (adjustDirection) {
            this.sorters[this.curSorter].select();
            this.sorters[this.curSorter].toggle();
        }

        this.sorters[this.curSorter].sort(this.results);
    }
}

// BreadCrumb denotes a navigation link for a page.
// NOTE: This is not currently used by the view.
export class BreadCrumb {
    public active: Observable<boolean>;
    public selected: Observable<boolean>;
    public label: Observable<string>;
    public index: number;

    constructor(private results: ResultPaginator) {
        this.label = observable("");
        this.active = observable(false);
        this.selected = observable(false);
    }

    public click(): void {
        this.results.goto(this.index);
    }
}

// SortMethod encapsulates a sorter and tracks its state (selection, direction). It wraps a comparator
// function that performs the actual sort. The properties here are bound to the view.
class SortMethod {
    public ascending: Observable<boolean>;
    public selected: Observable<boolean>;

    constructor(private cmp: (x: ScoredPeony, y: ScoredPeony) => number) {
        this.ascending = observable(true);
        this.selected = observable(false);
    }

    // Select this sorter.
    public select(): void {
        this.selected(true);
    }

    // Toggle direction.
    public toggle(): void {
        this.ascending(!this.ascending());
    }

    // Reset direction (to ascending).
    public reset(): void {
        this.ascending(true);
    }

    // Deselect this sorter.
    public deselect(): void {
        this.selected(false);
    }

    // Sorts the specified array of peonies.
    public sort(res: ScoredPeony[]): void {
        if (this.ascending()) {
            res.sort((x, y) => this.cmp(x, y));
        } else {
            res.sort((x, y) => this.cmp(y, x));
        }
    }
}

// Builds the sorters to be used with search results. `normalized` indicates whether database entries
// will have augmented fields (which are preferred for various reasons).
function makeSorters(normalized: boolean): {[name: string]: SortMethod} {
    // Does what it says.
    function stricmp(x: string, y: string): number {
        let xu = x.toUpperCase();
        let yu = y.toUpperCase();
        if (xu < yu) {
            return -1;
        } else if (xu > yu) {
            return 1;
        } else {
            return 0;
        }
    }

    // Compares two normalized arrays.
    function normcmp(x: string[], y: string[]): number {
        let i = 0;
        let count = Math.min(x.length, y.length);
        for (; i < count; i++) {
            if (x[i] < y[i]) {
                return -1;
            } else if (x[i] > y[i]) {
                return 1;
            }
        }

        if (x.length < y.length) {
            return -1;
        } else if (x.length > y.length) {
            return 1;
        }

        return 0;
    }

    // Fallback comparator when cultivars compare equal
    function defaultcmp(x: ScoredPeony, y: ScoredPeony): number {
        return stricmp(x.cultivar, y.cultivar) || stricmp(x.originator, y.originator);
    }

    // Fallback comparator when cultivars compare equal
    function defaultcmpnorm(x: AugmentedPeony, y: AugmentedPeony): number {
        return normcmp(x.cultivar_norm, y.cultivar_norm) || normcmp(x.originator_norm, y.originator_norm);
    }

    if (!normalized) {
        return {
            score: new SortMethod((x, y) => y.score - x.score),
            cultivar: new SortMethod((x, y) => stricmp(x.cultivar, y.cultivar) || defaultcmp(x, y)),
            originator: new SortMethod((x, y) => stricmp(x.originator, y.originator) || defaultcmp(x, y)),
            group: new SortMethod((x, y) => stricmp(x.group, y.group) || defaultcmp(x, y)),
            country: new SortMethod((x, y) => stricmp(x.country, y.country) || defaultcmp(x, y)),
            date: new SortMethod((x, y) => stricmp(x.date, y.date) || defaultcmp(x, y)),
        };
    } else {
        return {
            score: new SortMethod((x, y) => y.score - x.score),
            cultivar: new SortMethod((x: AugmentedPeony, y: AugmentedPeony) => normcmp(x.cultivar_norm, y.cultivar_norm) || defaultcmpnorm(x, y)),
            originator: new SortMethod((x: AugmentedPeony, y: AugmentedPeony) => normcmp(x.originator_norm, y.originator_norm) || defaultcmpnorm(x, y)),
            group: new SortMethod((x: AugmentedPeony, y: AugmentedPeony) => normcmp(x.group_norm, y.group_norm) || defaultcmpnorm(x, y)),
            country: new SortMethod((x: AugmentedPeony, y: AugmentedPeony) => normcmp(x.country_norm, y.country_norm) || defaultcmpnorm(x, y)),
            date: new SortMethod((x: AugmentedPeony, y: AugmentedPeony) => (x.date_val - y.date_val) || normcmp(x.date_norm, y.date_norm) || defaultcmpnorm(x, y)),
        };
    }
}
