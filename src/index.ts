import { applyBindings } from "knockout";
import { ScoredSearch } from "./scoredsearch";
import { makeResultsTable } from "./display";
import { pageState, homeState, registryCacheState } from "./storage";
import { makeLoader } from "./loader";
import { ViewModel } from "./viewmodel";
import { unescapeQuery } from "./util";

// NOTE: This module is intended to isolate the nitty-gritty of the registry page from
// the bulk of the registry search functions, so that they can (conceivably) be tested
// in isolation.

// Provided in the wordpress data.
declare var aps_registry: ApsRegistryInputs;

// Onload ...
(function () {
    let search = new ScoredSearch();

    if (typeof aps_registry !== "object") {
        console.log("aps_registry undefined: Not loading registry.");
    } else if (makeResultsTable()) {
        let loader = makeLoader(aps_registry.data_url, registryCacheState());
        let query = unescapeQuery(aps_registry.search); // The PHP double escapes :-\
        let vm = new ViewModel(search, query, loader, pageState(), homeState());
        applyBindings(vm);
    }
})();
