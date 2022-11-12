import { observable, Observable, observableArray, ObservableArray } from 'knockout';

export class ResultPaginator {
    public view: ObservableArray<Peony>;
    public pages: ObservableArray<BreadCrumb>;
    public range: Observable<string>;
    private pageNo: number;

    constructor(private results: ObservableArray<Peony>, private resultCount: number) {
        this.results.subscribe(val => this.goto(0));
        this.pages = observableArray();
        this.view = observableArray();
        this.range = observable("");
        this.pageNo = 0;
    }

    private update(): void {
        // Update page crumbs length.
        const pageCount = Math.ceil(this.results().length / this.resultCount);
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
    }

    public goto(idx: number): void {
        if (idx < 0) {
            return;
        }

        let start = idx * this.resultCount;
        let end = Math.min(start + this.resultCount, this.results().length);
        this.view(this.results.slice(start, end));
        this.range(start < end ? `[${start + 1} - ${end} of ${this.results().length}]` : "");
        
        this.pageNo = idx;
        this.update();
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
