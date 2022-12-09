import { applyBindings } from "knockout";
import { NaiveSearch } from "./naivesearch";
import { DumbScoredSearch, ScoredSearch } from "./scoredsearch";
import { makeResultsTable } from "./display";
import { ViewModel } from "./viewmodel";

declare var jQuery;

jQuery(() => {
    let search = new ScoredSearch();
    //search = new NaiveSearch();       // Simple implementation to compare against.
    //search = new DumbScoredSearch();  // Simpler version of scored search.

    if (typeof aps_registry !== "object") {
        console.log("aps_registry undefined: Not loading registry.");
    }

    if (makeResultsTable()) {
        let vm = new ViewModel(search, window.history.state)
        applyBindings(vm);
        
        // Save state ...
        window.addEventListener('beforeunload', () => replaceState(vm.pageState()));

        let stateTimeout: NodeJS.Timeout = null;
        vm.pageState.subscribe(() => {
            if (stateTimeout) {
                clearTimeout(stateTimeout);
            }

            stateTimeout = setTimeout(() => {
                replaceState(vm.pageState());
                stateTimeout = null;
            }, 500);
        });
    }
});

function replaceState(state: HistoryState): void {
    window.history.replaceState(state, null, window.location.href);
}
