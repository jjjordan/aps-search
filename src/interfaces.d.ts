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

interface ScoredPeony extends AugmentedPeony {
    score?: number;
}

interface AugmentedPeony extends Peony {
    originator_norm?: string[];
    cultivar_norm?: string[];
    description_norm?: string[];
    group_norm?: string[];
}

interface Searcher {
    search(query: string, db: Peony[], results: ko.ObservableArray<Peony>);
}
