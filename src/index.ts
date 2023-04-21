import { applyBindings } from "knockout";
import { NaiveSearch } from "./naivesearch";
import { DumbScoredSearch, ScoredSearch } from "./scoredsearch";
import { makeResultsTable } from "./display";
import { pageState, homeState } from "./storage";
import { ViewModel } from "./viewmodel";

// NOTE: This module is intended to isolate the nitty-gritty of the registry page from
// the bulk of the registry search functions, so that they can (conceivably) be tested
// in isolation.

// Provided in the wordpress data.
declare var aps_registry: ApsRegistryInputs;

// Onload ...
(function () {
    let search = new ScoredSearch();
    //search = new NaiveSearch();       // Simple implementation to compare against.
    //search = new DumbScoredSearch();  // Simpler version of scored search.

    if (typeof aps_registry !== "object") {
        console.log("aps_registry undefined: Not loading registry.");
    } else if (makeResultsTable()) {
        applyBindings(new ViewModel(search, aps_registry, pageState(), homeState()));
    }
})();
