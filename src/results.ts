import { computed, Computed, observable, Observable, observableArray, ObservableArray, PureComputed, pureComputed } from 'knockout';

export class ResultPaginator implements IResultPaginator {
    public view: ObservableArray<Peony>;
    public pages: ObservableArray<BreadCrumb>;
    public range: Observable<string>;
    public sorters: {[name: string]: SortMethod};
    public hasNext: Observable<boolean>;
    public hasPrev: Observable<boolean>;

    private pageNo: number;
    private curSorter: SortMethod;
    private nonScoreSorter: SortMethod;
    private db: Peony[];
    private results: ScoredPeony[];

    constructor(private resultCount: number, searcherNormalized: boolean) {
        this.pages = observableArray();
        this.view = observableArray();
        this.range = observable("");
        this.sorters = makeSorters(searcherNormalized);
        this.hasNext = observable(false);
        this.hasPrev = observable(false);
        this.curSorter = null;
        this.nonScoreSorter = this.sorters[default_sorter];
        this.pageNo = 0;
    }

    public initDb(db: Peony[]): void {
        this.db = db.slice();
        this.resetResults();
    }

    public searchResults(results: Peony[]) {
        this.results = results;
        this.assignSorter(this.sorters.score, false);
        this.goto(0);
    }

    public resetResults(results?: Peony[]) {
        this.results = results || this.db;
        this.assignSorter(this.nonScoreSorter, false);
        this.goto(0);
    }

    public goNext(): void {
        this.goto(this.pageNo + 1);
    }

    public goPrev(): void {
        this.goto(this.pageNo - 1);
    }

    public goto(idx: number): void {
        if (idx < 0 || (this.results.length && idx >= Math.ceil(this.results.length / this.resultCount))) {
            return;
        }
        
        this.pageNo = idx;
        this.updateNavigation();
        this.updateView();
    }

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

    private updateView(): void {
        let start = this.pageNo * this.resultCount;
        let end = Math.min(start + this.resultCount, this.results.length);
        this.view(this.results.slice(start, end));
        if (this.results.length > 0) {
            this.range(start < end ? `[${start + 1} - ${end} of ${this.results.length}]` : "");
        } else {
            this.range("[0 results]");
        }
    }

    public setSorter(name: string): void {
        this.assignSorter(this.sorters[name], true);
        if (name !== "score") {
            this.nonScoreSorter = this.curSorter;
        }

        this.updateView();
    }

    private assignSorter(sorter: SortMethod, adjustDirection: boolean): void {
        if (this.curSorter !== sorter) {
            if (this.curSorter) {
                if (adjustDirection) {
                    this.curSorter.reset();
                }

                this.curSorter.deselect();
            }

            this.curSorter = sorter;
            this.curSorter.select();
        } else if (adjustDirection) {
            this.curSorter.select();
            this.curSorter.toggle();
        }

        this.curSorter.sort(this.results);
    }
}

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

class SortMethod {
    public ascending: Observable<boolean>;
    public selected: Observable<boolean>;

    constructor(private cmp: (x: ScoredPeony, y: ScoredPeony) => number) {
        this.ascending = observable(true);
        this.selected = observable(false);
    }

    public select(): void {
        this.selected(true);
    }

    public toggle(): void {
        this.ascending(!this.ascending());
    }

    public reset(): void {
        this.ascending(true);
    }

    public deselect(): void {
        this.selected(false);
    }

    public sort(res: ScoredPeony[]): void {
        if (this.ascending()) {
            res.sort((x, y) => this.cmp(x, y));
        } else {
            res.sort((x, y) => this.cmp(y, x));
        }
    }
}

function makeSorters(normalized: boolean): {[name: string]: SortMethod} {
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

    function defaultSort(x: ScoredPeony, y: ScoredPeony): number {
        return stricmp(x.cultivar, y.cultivar) || stricmp(x.originator, y.originator);
    }

    function defaultSortNormalized(x: AugmentedPeony, y: AugmentedPeony): number {
        return normcmp(x.cultivar_norm, y.cultivar_norm) || normcmp(x.originator_norm, y.originator_norm);
    }

    if (!normalized) {
        return {
            score: new SortMethod((x, y) => y.score - x.score),
            cultivar: new SortMethod((x, y) => stricmp(x.cultivar, y.cultivar) || defaultSort(x, y)),
            originator: new SortMethod((x, y) => stricmp(x.originator, y.originator) || defaultSort(x, y)),
            group: new SortMethod((x, y) => stricmp(x.group, y.group) || defaultSort(x, y)),
            country: new SortMethod((x, y) => stricmp(x.country, y.country) || defaultSort(x, y)),
            date: new SortMethod((x, y) => stricmp(x.date, y.date) || defaultSort(x, y)),
        };
    } else {
        return {
            score: new SortMethod((x, y) => y.score - x.score),
            cultivar: new SortMethod((x: AugmentedPeony, y: AugmentedPeony) => normcmp(x.cultivar_norm, y.cultivar_norm) || defaultSortNormalized(x, y)),
            originator: new SortMethod((x: AugmentedPeony, y: AugmentedPeony) => normcmp(x.originator_norm, y.originator_norm) || defaultSortNormalized(x, y)),
            group: new SortMethod((x: AugmentedPeony, y: AugmentedPeony) => normcmp(x.group_norm, y.group_norm) || defaultSortNormalized(x, y)),
            country: new SortMethod((x: AugmentedPeony, y: AugmentedPeony) => normcmp(x.country_norm, y.country_norm) || defaultSortNormalized(x, y)),
            date: new SortMethod((x: AugmentedPeony, y: AugmentedPeony) => (x.date_val - y.date_val) || normcmp(x.date_norm, y.date_norm) || defaultSortNormalized(x, y)),
        };
    }
}

const default_sorter = "cultivar";
