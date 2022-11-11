interface Peony {
    id: number;
    cultivar: string;
    originator: string;
    date: string;
    group: string;
    reference: string;
    country: string;
    description: string;
    image: string;
    url: string;
}

interface Searcher {
    search(query: string, db: Peony[], results: ko.ObservableArray<Peony>);
}
