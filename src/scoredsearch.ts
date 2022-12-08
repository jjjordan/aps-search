import { ObservableArray } from "knockout";
import { resourceLimits } from "worker_threads";
import { normalize } from "./util";

const BATCH_COUNT = 1000;
const BATCH_DELAY = 5;

export class ScoredSearch implements Searcher {
    private db: AugmentedPeony[];

    // Database must be prepared on the first query -- this will be the query to run when it's ready.
    private nextQuery: () => void;

    // Quiescence timers
    private delayTimer: NodeJS.Timeout;
    private forceTimer: NodeJS.Timeout;
    
    private searchProgress: NodeJS.Timeout;

    public normalized: boolean = true;

    constructor() {
        this.delayTimer = null;
        this.forceTimer = null;
        this.searchProgress = null;
        this.nextQuery = null;
        this.db = null;
    }

    public initDb(db: Peony[]): Promise<void> {
        return new Promise((resolve, reject) => {
            this.prepareDb(db, resolve);
        });
    }

    public search(query: string, kind: SearchKind, results: IResultPaginator): void {
        if (!this.db) {
            // Run this query when the DB is ready.
            this.nextQuery = () => this.search(query, kind, results);
            return;
        }
        
        const incrementalDelay = 100;
        const maxDelay = 700;

        if (this.delayTimer !== null) {
            clearTimeout(this.delayTimer);
            this.delayTimer = setTimeout(() => this.execSearch(), incrementalDelay);
            //console.log("Canceling search");
        } else {
            this.delayTimer = setTimeout(() => this.execSearch(), incrementalDelay);
            this.forceTimer = setTimeout(() => this.execSearch(), maxDelay);
        }

        if (this.searchProgress !== null) {
            // Cancel any currently-running search.
            clearTimeout(this.searchProgress);
            this.searchProgress = null;
            //console.log("Interrupting search");
        }

        this.nextQuery = () => this.startSearch(query, kind, results);
    }

    private execSearch(): void {
        clearTimeout(this.delayTimer);
        clearTimeout(this.forceTimer);
        this.delayTimer = this.forceTimer = null;
        let f = this.nextQuery;
        this.nextQuery = null;
        return f();
    }

    private startSearch(query: string, kind: SearchKind, results: IResultPaginator): void {
        //console.log("RUNNING search");
        let query_norm = normalize(query).split(" ").filter(s => s.length > 0);
        let intermediate: ScoredPeony[] = [];
        this.scoreResults(0, query_norm, intermediate, kind, results);
    }

    private scoreResults(start: number, query: string[], output: ScoredPeony[], kind: SearchKind, results: IResultPaginator): void {
        for (let i = start, until = Math.min(this.db.length, start + BATCH_COUNT); i < until; i++) {
            let scored = <ScoredAugmentedPeony>this.db[i];
            if (scorePeony(query, scored, kind) > 0) {
                output.push(scored);
            }
        }

        if (start + BATCH_COUNT >= this.db.length) {
            // Done!
            this.searchProgress = null;
            results.searchResults(output);
        } else {
            this.searchProgress = setTimeout(() => this.scoreResults(start + BATCH_COUNT, query, output, kind, results), BATCH_DELAY);
        }
    }

    private prepareDb(db: Peony[], done: () => void): void {
        this.prepSegment(db, 0, done);
    }

    private prepSegment(db: Peony[], start: number, done: () => void) {
        for (let i = start, until = Math.min(db.length, start + BATCH_COUNT); i < until; i++) {
            let aug: AugmentedPeony = db[i];
            aug.cultivar_norm = normalize(aug.cultivar).split(" ");
            aug.description_norm = normalize(aug.description).split(" ");
            aug.originator_norm = normalize(aug.originator).split(" ");
            aug.group_norm = normalize(aug.group).split(" ");
            aug.date_norm = normalize(aug.date).split(" ");
            aug.country_norm = normalize(aug.country).split(" ");
        }

        if (start + BATCH_COUNT >= db.length) {
            // Done.
            this.db = db;
            if (this.nextQuery) {
                setTimeout(this.nextQuery, 0);
            }

            done();
        } else {
            setTimeout(() => this.prepSegment(db, start + BATCH_COUNT, done), BATCH_DELAY);
        }
    }
}

function scorePeony(query: string[], peony: ScoredAugmentedPeony, kind: SearchKind): number {
    let scores: number[] = [];
    let prevs: boolean[] = [];

    for (let i = 0; i < query.length; i++) {
        scores.push(0);
        prevs.push(false);
    }

    switch (kind) {
    case "All":
        matchScore(query, peony.cultivar_norm, scores, prevs, 3);
        matchScore(query, peony.description_norm, scores, prevs);
        matchScore(query, peony.group_norm, scores, prevs, 1.5);
        matchScore(query, peony.originator_norm, scores, prevs, 2);
        matchScore(query, peony.country_norm, scores, prevs);
        matchScore(query, peony.date_norm, scores, prevs);
        break;
    case "Cultivar":
        matchScore(query, peony.cultivar_norm, scores, prevs);
        break;
    case "Group":
        matchScore(query, peony.group_norm, scores, prevs);
        break;
    case "Originator":
        matchScore(query, peony.originator_norm, scores, prevs);
        break;
    case "Date":
        matchScore(query, peony.date_norm, scores, prevs);
        break;
    case "Country":
        matchScore(query, peony.country_norm, scores, prevs);
        break;
    }
    
    let result: number = 0;
    for (let i = 0; i < query.length; i++) {
        if (scores[i] == 0) {
            // Failed to match a term? Discard.
            peony.score = 0;
            return 0;
        }

        result += scores[i];
    }

    peony.score = result;
    return result;
}

function matchScore(query: string[], data: string[], scores: number[], prevs: boolean[], weight: number = 1) {
    for (let j = 0; j < query.length; j++) {
        prevs[j] = false;
    }

    let anyPrev = false; // Did the previous token match any term?
    for (let i = 0; i < data.length; i++) {
        let anyMatch = false; // Does the current token match any term?
        let precPrevMatch = false; // Did the previous term match the previous token?
        for (let j = 0; j < query.length; j++) {
            let match = false;
            if (query[j].length <= data[i].length) {
                let score = 0;
                let idx = data[i].indexOf(query[j]);
                if (idx > -1) {
                    match = true;
                    if (idx == 0) {
                        if (query[j].length == data[i].length) {
                            score += 1;
                        } else {
                            score += 0.5;
                        }
                    } else {
                        score += 0.25;
                    }

                    if (precPrevMatch) {
                        score += 0.5;
                    } else if (anyPrev) {
                        score += 0.2;
                    }

                    scores[j] = Math.max(scores[j], score * weight);
                }
            }

            precPrevMatch = prevs[j]; // Save for next term before clobbering.
            prevs[j] = match;
            anyMatch ||= match;
        }

        anyPrev = anyMatch;
    }
}

export class DumbScoredSearch implements Searcher {
    private db: AugmentedPeony[];

    public normalized: boolean = true;

    constructor() {
        this.db = [];
    }

    public initDb(db: Peony[]): Promise<void> {
        this.db = <AugmentedPeony[]>db;
        this.db.forEach(p => {
            p.cultivar_norm = normalize(p.cultivar).split(" ");
            p.description_norm = normalize(p.description).split(" ");
            p.group_norm = normalize(p.group).split(" ");
            p.originator_norm = normalize(p.originator).split(" ");
            p.country_norm = normalize(p.country).split(" ");
            p.date_norm = normalize(p.date).split(" ");
        });

        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    public search(query: string, kind: SearchKind, results: IResultPaginator) {
        let terms = normalize(query).split(" ");
        let res = [];
        this.db.forEach(p => {
            if (scorePeony(terms, p, kind) > 0) {
                res.push(p);
            }
        });

        results.searchResults(res);
    }
}
