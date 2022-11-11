import { observable, Observable, observableArray, ObservableArray } from 'knockout';

export class ResultPaginator {
    public view: ObservableArray<Peony>;
    public pages: ObservableArray<BreadCrumb>;
    public pageNo: number;

    constructor(private results: ObservableArray<Peony>, private resultCount: number) {
        this.results.subscribe(val => this.update(val));
        this.pages = observableArray();
        this.view = observableArray();
    }

    private update(peonies: Peony[]): void {
        // Update page crumbs length.
        const pageCount = Math.ceil(peonies.length / this.resultCount);
        let i = 0;
        for (; i < Math.min(this.pages.length, pageCount); i++) {
            this.pages()[i].elided(false);
            this.pages()[i].active(false);
        }

        if (i < this.pages.length) {
            this.pages.splice(i, this.pages.length - i);
        }

        for (; i < pageCount; i++) {
            this.pages.push(new BreadCrumb(this, i));
        }

        this.goto(0);
    }

    public goto(idx: number): void {
        let start = idx * this.resultCount;
        let end = Math.min(start + this.resultCount, this.results().length);
        this.view.splice(0, this.view().length, ...this.results.slice(start, end));
        if (this.pageNo < this.pages().length) {
            this.pages()[this.pageNo].active(false);
        }

        if (this.pages().length > 0)
            this.pages()[idx].active(true);
        this.pageNo = idx;
    }
}

export class BreadCrumb {
    public elided: Observable<boolean>;
    public active: Observable<boolean>;
    public indexLabel: Observable<string>;

    constructor(private results: ResultPaginator, public index: number) {
        this.indexLabel = observable((this.index + 1) + "");
        this.elided = observable(false);
        this.active = observable(false);
    }

    public click(): void {
        this.results.goto(this.index);
    }
}
