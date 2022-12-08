export class NaiveSearch implements Searcher {
    private db: Peony[];
    private updated: number = 0;

    public normalized: boolean = false;

    constructor() {
        this.db = [];
    }

    public initDb(db: Peony[]): Promise<void> {
        this.db = db.slice();
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    public search(query: string, kind: SearchKind, results: IResultPaginator) {
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
            let group = peony.group.toUpperCase();
            let country = peony.country.toUpperCase();
            let hits = 0;
            for (let i = 0; i < terms.length; i++) {
                if (kind == "All" || kind == "Cultivar") {
                    if (cultivarUpper.indexOf(terms[i]) >= 0) {
                        hits++;
                        continue;
                    }
                }

                if (kind == "All" || kind == "Originator") {
                    if (origUpper.indexOf(terms[i]) >= 0) {
                        hits++;
                        continue;
                    }
                }

                if (kind == "All") {
                    if (description.indexOf(terms[i]) >= 0) {
                        hits++;
                        continue;
                    }
                }

                if (kind == "All" || kind == "Group") {
                    if (group.indexOf(terms[i]) >= 0) {
                        hits++;
                        continue;
                    }
                }

                if (kind == "All" || kind == "Country") {
                    if (country.indexOf(terms[i]) >= 0) {
                        hits++;
                        continue;
                    }
                }

                if (kind == "All" || kind == "Date") {
                    if (peony.date.indexOf(terms[i]) >= 0) {
                        hits++;
                        continue;
                    }
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
