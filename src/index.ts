import { applyBindings, Observable } from "knockout";
import { ScoredSearch } from "./scoredsearch";
import { makeResultsTable } from "./display";
import { pageState, homeState, registryCacheState } from "./storage";
import { makeLoader, handleRegistryCacheStateChange } from "./loader";
import { ViewModel } from "./viewmodel";

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
        let loader = makeLoader(aps_registry.data_url, registryCacheState(handleRegistryCacheStateChange));
        // Update our copy of the home state if it changes elsewhere.
        let homeStateObservable = homeState((val: HistoryState, obs: Observable<HistoryState>) => obs(val));
        let vm = new ViewModel(search, aps_registry.search, loader, pageState(), homeStateObservable);
        applyBindings(vm);
    }
})();
