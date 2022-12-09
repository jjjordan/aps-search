const gulp = require('gulp');
const ts = require('gulp-typescript');
const esbuild = require('gulp-esbuild');
const download = require('gulp-download2');
const browserSync = require('browser-sync');
const fs = require('fs');

const tsProject = ts.createProject('tsconfig.json');
const server = browserSync.create();

gulp.task('ts', () => {
    return gulp.src(['src/*.ts', 'src/*.tsx'])
        .pipe(tsProject())
        .pipe(gulp.dest('out/int/js'));
});

gulp.task('esbuild', gulp.series('ts', () => {
    return gulp.src('out/int/js/index.js')
        .pipe(esbuild({
            outfile: 'bundle.js',
            bundle: true,
            minify: false,
        }))
        .pipe(gulp.dest('out/rel'));
}));

gulp.task('esbuild-min', gulp.series('ts', () => {
    return gulp.src('out/int/js/index.js')
        .pipe(esbuild({
            outfile: 'bundle.js',
            bundle: true,
            minify: true,
        }))
        .pipe(gulp.dest('out/rel'));
}));

gulp.task('copyhtml', () => {
    return gulp.src(['html/*.css', 'html/*.html']).pipe(gulp.dest('out/rel'));
});

gulp.task('downloaddb', done => {
    const dburl = 'https://americanpeonysociety.org/cultivars/peony-registry/?registry_data=true';
    const dboutPath = 'out/rel/data';
    const dboutName = 'registry.json';
    const dbout = dboutPath + '/' + dboutName;
    if (fs.existsSync(dbout)) {
        done();
    } else {
        return download({url: dburl, file: dboutName}).pipe(gulp.dest(dboutPath));
    }
});

function serve(done) {
    server.init({
        server: {
            baseDir: 'out/rel',
        },
    });

    done();
}

function notify(done) {
    server.reload();
    done();
}

function watch_ts(done) {
    return gulp.watch(['src/*.ts', 'src/*.tsx'], gulp.series('esbuild', notify));
}

function watch_html(done) {
    return gulp.watch(['html/*.html', 'html/*.css'], gulp.series('copyhtml', notify));
}

gulp.task('watch', gulp.parallel(watch_ts, watch_html));

gulp.task('default', gulp.parallel('esbuild', 'copyhtml', 'downloaddb'));
gulp.task('dev', gulp.series('default', serve, 'watch'));
gulp.task('rel', gulp.parallel('esbuild-min', 'copyhtml', 'downloaddb'));
