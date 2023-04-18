# American Peony Society registry search source code
This is the source code to the
[American Peony Society](https://americanpeonysociety.org/) website's
[registry search](https://americanpeonysociety.org/cultivars/peony-registry/)
feature. This is the result of some volunteering effort on my part to
improve upon the previous version. I've decided to open source it to
encourage contributions from others.

## How to build
Build requires Node.JS and npm to be installed. Dependencies can be
installed with `npm install`, then build can be invoked with `npm run gulp
rel`.

A development server can be started with `npm run gulp dev`, which will
enable browsersync and hot reloads.

## Technology stack
Some of the dependencies used here are:

* [Knockout.JS](https://knockoutjs.com/): databinding
* [JSX-Dom](https://github.com/alex-kinokon/jsx-dom): React-like html literals
* [Typescript](https://www.typescriptlang.org/): Type-checking compiler
* [ESBuild](https://esbuild.github.io/): Dependency bundling
* [Gulp](https://gulpjs.com/): Build automation
* [BrowserSync](https://browsersync.io/): Development server

## Architecture overview
Some of the design is inherited from the version preceding my work, and I
tried to change as little as possible so that this could be incorporated
without extensive changes. I might have done it a little differently, but
I'm not unhappy with the current state.

The registry data is compiled into a JSON file (all of it) and downloaded to
the client, which must parse it, perform any normalization and indexing
on-the-fly, and execute any search client-side. This takes advantage of a
CDN and the load on the server (which the APS must pay for) is minimal. The
database isn't very large -- weighing in just under a megabyte
compressed and containing about 7,500 records.

My implementation will fetch the registry, perform normalization, and search
by scanning each record.  As much as possible, it carries operations out
asynchronously in smaller batches.  Search employs a quiescence timer to
accommodate further input (so as to not spin the thread while the user is
typing) and can cancel in-progress searches.  Results are scored such that
exact matches > prefix matches > partial matches; consecutive search terms
get a bonus; and different fields carry different weights. Diacritics are
normalized away allowing the mostly-American audience a break from trickier
characters.

## License
This work is licensed under AGPLv3, though the APS is granted more
permissive terms.
