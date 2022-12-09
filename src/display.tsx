import * as React from "jsx-dom";

export function makeResultsTable(): boolean {
    let appDiv = document.getElementById("app");
    if (appDiv) {
        appDiv.parentElement.replaceChild(
            <div id="peonies-list" class="registry-archive">
                <div class="filter-wrap registry">
                    <div class="container">
                        <div class="row">
                            <div class="col-24 col-lg-12 main-filter">
                                <select data-bind="options: searchKinds, optionsText: 'label', value: searchKind"></select>
                                <input type="text" placeholder="Search Registry" data-bind="textInput: searchBox, valueUpdate: 'afterkeydown'" />
                            </div>
                            <div class="col-24 col-lg-12 alpha-filter">
                                {/* There's a select/option here but it appears to be inactive ... */}
                                <ul class="d-none d-md-block list__alpha" data-bind="foreach: prefixes">
                                    <li>
                                        <span class="" data-bind="text: $data, class: ($parent.alphaFilter() == $data ? 'active' : ''), click: $parent.setFilter.bind($parent, $data)"></span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="interior-wrap">
                    <div class="flower-wrap left loaded">
                        <div class="flower" style="background-position: center -134px;"></div>
                    </div>
                    <main class="main-content container" role="main">
                        <section class="row">
                            <div class="col-24">
                                <header class="row cultivar-header">
                                    <div class="col-24 col-md-12 results">
                                        <h2>Results</h2>
                                        <span class="registry_load active" data-bind="text: results.range"></span>
                                    </div>
                                    <div class="col-24 col-md-12 text-right clear__results">
                                        <a href="#" data-bind="click: reset">Clear Search Results</a>
                                    </div>
                                    <div class="col-24 cultivar-row d-none d-sm-block">
                                        <div class="cultivar-inner">
                                            <div class="cult-col filterable cultivar" data-bind="click: results.setSorter.bind(results, 'cultivar'), class: (results.sorters.cultivar.ascending() ? 'down' : 'up') + (results.sorters.cultivar.selected() ? ' active' : '')">
                                                <span data-toggle="tooltip" data-placement="top" title="" data-original-title="Sort by Cultivar">Cultivar</span>
                                            </div>
                                            <div class="cult-col image">
                                                Photo
                                            </div>
                                            <div class="cult-col filterable originator" data-bind="click: results.setSorter.bind(results, 'originator'), class: (results.sorters.originator.ascending() ? 'down' : 'up') + (results.sorters.originator.selected() ? ' active' : '')">
                                                <span data-toggle="tooltip" data-placement="top" title="" data-original-title="Sort by Originator">Originator</span>
                                            </div>
                                            <div class="cult-col filterable group" data-bind="click: results.setSorter.bind(results, 'group'), class: (results.sorters.group.ascending() ? 'down' : 'up') + (results.sorters.group.selected() ? ' active' : '')">
                                                <span data-toggle="tooltip" data-placement="top" title="" data-original-title="Sort by Group">Group</span>
                                            </div>
                                            <div class="cult-col filterable country" data-bind="click: results.setSorter.bind(results, 'country'), class: (results.sorters.country.ascending() ? 'down' : 'up') + (results.sorters.country.selected() ? ' active' : '')">
                                                <span data-toggle="tooltip" data-placement="top" title="" data-original-title="Sort by Country">Country</span>
                                            </div>
                                            <div class="cult-col filterable year" data-bind="click: results.setSorter.bind(results, 'date'), class: (results.sorters.date.ascending() ? 'down' : 'up') + (results.sorters.date.selected() ? ' active' : '')">
                                                <span data-toggle="tooltip" data-placement="top" title="" data-original-title="Sort by Introduction Date">Introduction Date</span>
                                            </div>
                                        </div>
                                    </div>
                                </header>
                                <section class="row cultivar-list registry_load active" data-bind="foreach: results.view">
                                    <div class="col-24 cultivar-row">
                                        <div class="cultivar-inner">
                                            <div class="cult-col cultivar">
                                                {/* TODO: Should not target top */}
                                                <a data-bind="attr: {href: url}, text: cultivar" target="top"></a>
                                            </div>
                                            <div class="cult-col image">
                                                {/* Note: Wrapping in a link prevents the image from showing, seems like a CSS bug */}
                                                <img data-bind="attr: {src: image}" width="85" height="85" />
                                            </div>
                                            <div class="cult-col originator">
                                                <span data-bind="text: originator"></span>
                                            </div>
                                            <div class="cult-col group">
                                                <span data-bind="text: group"></span>
                                            </div>
                                            <div class="cult-col country">
                                                <span data-bind="text: country"></span>
                                            </div>
                                            <div class="cult-col year">
                                                <span data-bind="text: date"></span>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                                <footer class="pagination registry_load active">
                                    <button data-bind="attr: results.hasPrev() ? {disabled: undefined} : {disabled: 'disabled'}, click: prev">Previous</button>
                                    <button data-bind="attr: results.hasNext() ? {disabled: undefined} : {disabled: 'disabled'}, click: next">Next</button>
                                </footer>
                            </div>
                        </section>
                    </main>
                    <div class="flower-wrap right loaded">
                        <div class="flower" style="background-position: center -524px;"></div>
                    </div>
                </div>
            </div>, appDiv);

        return true;
    }

    return false;
}
