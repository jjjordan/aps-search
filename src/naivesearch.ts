export class NaiveSearch implements Searcher {
    private db: Peony[];
    private updated: number = 0;

    constructor() {
        this.db = [];
    }

    public initDb(db: Peony[]) {
        this.db = db.slice();
    }

    public search(query: string, results: IResultPaginator) {
        if (!query.length) {
            return;
        }

        let terms = query.toUpperCase().split(" ");
        //console.log(terms);
        //console.log(this.db.length);
        let allResults = [];
        this.db.forEach(peony => {
            let cultivarUpper = peony.cultivar.toUpperCase();
            let origUpper = peony.originator.toUpperCase();
            let description = peony.description.toUpperCase();
            let hits = 0;
            for (let i = 0; i < terms.length; i++) {
                if (cultivarUpper.indexOf(terms[i]) >= 0) {
                    hits++;
                    continue;
                }

                if (origUpper.indexOf(terms[i]) >= 0) {
                    hits++;
                    continue;
                }

                if (description.indexOf(terms[i]) >= 0) {
                    hits++;
                    continue;
                }

                break;
            }

            if (hits == terms.length) {
                allResults.push(peony);
            }
        });

        results.searchResults(allResults);
    }
}
