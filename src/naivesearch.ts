export class NaiveSearch implements Searcher {
    private updated: number = 0;

    public search(query: string, db: Peony[], results: ko.ObservableArray<Peony>) {
        results.splice(0, results().length);
        if (!query.length) {
            return;
        }

        let terms = query.toUpperCase().split(" ");
        console.log(terms);
        console.log(db.length);
        let allResults = [];
        db.forEach(peony => {
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

        results(allResults);
    }
}
