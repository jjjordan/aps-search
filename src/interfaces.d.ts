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

interface ScoredPeony extends Peony {
    score?: number;
}

interface AugmentedPeony extends Peony {
    originator_norm?: string[];
    cultivar_norm?: string[];
    description_norm?: string[];
    group_norm?: string[];
    country_norm?: string[];
    date_norm?: string[];
    date_val?: number;
}

interface ScoredAugmentedPeony extends ScoredPeony, AugmentedPeony {}

interface Searcher {
    initDb(db: Peony[]): Promise<void>;
    search(query: string, kind: SearchKind, results: IResultPaginator);
    normalized: boolean;
}

interface IResultPaginator {
    searchResults(results: Peony[]);
    resetResults();
    initDb(db: Peony[]);
}

type SearchKind = "All" | "Cultivar" | "Originator" | "Group" | "Date" | "Country";
