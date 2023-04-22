import { ObservableArray } from "knockout";
import { resourceLimits } from "worker_threads";
import { normalize, populateNormalized } from "./util";

const BATCH_COUNT = 1000;
const BATCH_DELAY = 5;

// ScoredSearch delays searches so that the user can finish typing (quiescence timer). It will first wait
// for INCREMENTAL_DELAY. If a keystroke or search change is received within that timeframe, then another
// INCREMENTAL_DELAY is waited until a max of MAX_DELAY has elapsed. If no changes happen or MAX_DELAY has
// elapsed, then the search is started. (NOTE: the search may still be interrupted after being started).
const INCREMENTAL_DELAY = 50;
const MAX_DELAY = 250;

// ScoredSearch is meant as the advanced search strategy. Search terms are compared against a fully-
// normalized database (including case and diacritics) and scored depending on where they are found
// within the database entry. E.g., in terms of scoring: full word match > prefix match > substring match;
// and consecutive terms get a bonus. Most everything is run asynchronously in smaller batches so the UI
// is not completely blocked while the user is typing.
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

    // The top-level search method manages keystroke delays and search interruption.
    // execSearch is called (with nextQuery set) when the search is ready to proceed.
    public search(query: string, kind: SearchKind, results: IResultPaginator): void {
        if (!this.db) {
            // Run this query when the DB is ready.
            this.nextQuery = () => this.search(query, kind, results);
            return;
        }
        
        if (!query) {
            // If empty query, we only need to cancel any active search.
            if (this.delayTimer !== null) {
                clearTimeout(this.delayTimer);
                this.delayTimer = null;
            }

            if (this.forceTimer !== null) {
                clearTimeout(this.forceTimer);
                this.forceTimer = null;
            }

            if (this.searchProgress !== null) {
                clearTimeout(this.searchProgress);
                this.searchProgress = null;
            }

            return;
        }

        // Call execSearch if no keystroke comes in before INCREMENTAL_DELAY elapses...
        if (this.delayTimer !== null) {
            clearTimeout(this.delayTimer);
            this.delayTimer = setTimeout(() => this.execSearch(), INCREMENTAL_DELAY);
            //console.log("Canceling search");
        } else {
            this.delayTimer = setTimeout(() => this.execSearch(), INCREMENTAL_DELAY);
            this.forceTimer = setTimeout(() => this.execSearch(), MAX_DELAY);
        }

        if (this.searchProgress !== null) {
            // Cancel any currently-running search.
            clearTimeout(this.searchProgress);
            this.searchProgress = null;
            //console.log("Interrupting search");
        }

        this.nextQuery = () => this.startSearch(query, kind, results);
    }

    // Transition between search() and startSearch(): cleans up timers and data used by the
    // former and executes the latter.
    private execSearch(): void {
        // Clear keystroke delay timers ...
        clearTimeout(this.delayTimer);
        clearTimeout(this.forceTimer);
        this.delayTimer = this.forceTimer = null;

        // Reset nextQuery and run the current occupant.
        let f = this.nextQuery;
        this.nextQuery = null;
        return f();
    }

    // The first step to a search: normalize the query and process the first batch of database entries.
    // scoreResults will then recurse through the rest of the database.
    private startSearch(query: string, kind: SearchKind, results: IResultPaginator): void {
        //console.log("RUNNING search");
        let query_norm = normalize(query).split(" ").filter(s => s.length > 0);
        let intermediate: ScoredPeony[] = [];
        this.scoreResults(0, query_norm, intermediate, kind, results);
    }

    // Scores db[start:start + BATCH_COUNT], and either delay/recurse to the next batch or supply the results
    // to the paginator.
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

    // DB Initialization routine: start the first segment which will recursively process all batches.
    private prepareDb(db: Peony[], done: () => void): void {
        this.prepSegment(db, 0, done);
    }

    // Normalize entries db[start:start + BATCH_COUNT], then delay for BATCH_DELAY before handling the
    // next batch.
    private prepSegment(db: Peony[], start: number, done: () => void) {
        for (let i = start, until = Math.min(db.length, start + BATCH_COUNT); i < until; i++) {
            populateNormalized(db[i]);
        }

        if (start + BATCH_COUNT >= db.length) {
            // Done.
            this.db = db;

            // If a search came in before the DB finished loading, debounce and execute it now.
            if (this.nextQuery) {
                setTimeout(this.nextQuery, 0);
            }

            done();
        } else {
            setTimeout(() => this.prepSegment(db, start + BATCH_COUNT, done), BATCH_DELAY);
        }
    }
}

// This is the main scoring function. Compares `peony` against normalized `query` of type `kind` and returns a score.
function scorePeony(query: string[], peony: ScoredAugmentedPeony, kind: SearchKind): number {
    let scores: number[] = [];
    let prevs: boolean[] = [];

    for (let i = 0; i < query.length; i++) {
        scores.push(0);
        prevs.push(false);
    }

    switch (kind) {
    case "All":
        matchScore(query, peony.cultivar_norm, scores, prevs, 3);       // Cultivar gets 3x bonus
        matchScore(query, peony.description_norm, scores, prevs);
        matchScore(query, peony.group_norm, scores, prevs, 1.5);        // Group gets 1.5x bonus
        matchScore(query, peony.originator_norm, scores, prevs, 2);     // Originator gets 2x bonus
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

// Compares normalized data against a query and awards scores for full/prefix/partial matches and
// consecutive term bonuses. Returns partial scores in `scores`. `prevs` is owned by the caller
// but only used within this function to remember previous terms.
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
                            // Full match
                            score += 1;
                        } else {
                            // Prefix match
                            score += 0.5;
                        }
                    } else {
                        // Partial match
                        score += 0.25;
                    }

                    if (precPrevMatch) {
                        // If previous search term matched previous token.
                        score += 0.5;
                    } else if (anyPrev) {
                        // If previous token matched any search term
                        score += 0.2;
                    }

                    if (i == j) {
                        // Extra bonus if terms are located in the same position
                        score += 0.15;
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

// DumbScoredSearch is a variant of ScoredSearch that uses the same comparison logic, but
// runs everything synchronously.
export class DumbScoredSearch implements Searcher {
    private db: AugmentedPeony[];

    public normalized: boolean = true;

    constructor() {
        this.db = [];
    }

    public initDb(db: Peony[]): Promise<void> {
        this.db = <AugmentedPeony[]>db;
        this.db.forEach(populateNormalized);

        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    public search(query: string, kind: SearchKind, results: IResultPaginator) {
        if (!query) {
            return;
        }
        
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
