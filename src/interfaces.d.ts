// This is the data for a peony as it is found in the database.
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

// This is a Peony object that has been scored by a Searcher.
interface ScoredPeony extends Peony {
    score?: number;
}

// This is a Peony object that has been analyzed and augmented by the normalizer.
// (See: util.normalize)
interface AugmentedPeony extends Peony {
    originator_norm?: string[];
    cultivar_norm?: string[];
    description_norm?: string[];
    group_norm?: string[];
    country_norm?: string[];
    date_norm?: string[];
    date_val?: number;
}

// This is a Peony object with the above two extensions.
interface ScoredAugmentedPeony extends ScoredPeony, AugmentedPeony {}

// A Searcher class implements a strategy to search the database and supply the results
// to a paginator.
interface Searcher {
    // initDb is called when the database has finished loading.
    // This object is expected to keep a local copy.
    initDb(db: Peony[]): Promise<void>;

    // search is called when a search is requested. The Searcher is expected to supply
    // the results to the specified paginator.
    search(query: string, kind: SearchKind, results: IResultPaginator): void;

    // normalized indicates whether this Searcher emits results that are normalized.
    // (for use with sorters)
    normalized: boolean;
}

// A ResultPaginator receives search results from a Searcher (and can supply a viewmodel
// on the other end).
interface IResultPaginator {
    // initDb is called when the database has finished loading.
    // This object is expected to keep a local copy.
    initDb(db: Peony[]): Promise<void>;

    // Clears the result of the previous search and resets to the default view.
    resetResults();

    // Method to supply search results to this paginator.
    searchResults(results: Peony[]): void;
}

// These are the kinds of searches that can be performed on the database.
type SearchKind = "All" | "Cultivar" | "Originator" | "Group" | "Date" | "Country";

// This is the data supplied by the WP plugin/theme.
interface ApsRegistryInputs {
    // The search string entered by the user (in the site header, usually from another page).
    search: string;

    // The registry database location.
    data_url: string;
}

// State stored by the search tool: info to be restored after navigating away and back again.
interface HistoryState {
    // Last search string.
    search: string;

    // Filter by alpha? Empty if not.
    alpha: string;

    // State used by the paginator.
    results: ResultsState;
}

// History state supplied/used by the paginator.
interface ResultsState {
    // Version number
    version: number;

    // The active sorter
    sorter: string;

    // The sorter that was active before applying the score sorter
    nonScoreSorter: string;

    // Current page number
    pageNo: number;

    // Sort direction
    direction: "ASC" | "DESC";

    // Result snapshot
    results: CachedResults;

    // Result count
    count: number;
}

interface CachedResults {
    // Current visible results
    view: ScoredAugmentedPeony[];

    // Displayed result range, e.g. "1-25 of XX"
    range: string;

    // Whether the NEXT button is enabled
    hasNext: boolean;

    // Whether the PREV button is enabled
    hasPrev: boolean;
}

interface RegistryCacheState {
    // When was the last time we downloaded the registry json?
    // (js timestamp = UNIX timestamp * 1000)
    lastAccess: number;
}
