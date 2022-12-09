const gulp = require('gulp');
const ts = require('gulp-typescript');
const esbuild = require('gulp-esbuild');
const browserSync = require('browser-sync');

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

gulp.task('copyhtml', () => {
    return gulp.src(['html/*.css', 'html/*.html']).pipe(gulp.dest('out/rel'));
});

gulp.task('copydata', () => {
    return gulp.src(['data/registry.json']).pipe(gulp.dest('out/rel/data'));
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

gulp.task('default', gulp.parallel('esbuild', 'copyhtml', 'copydata'));
gulp.task('dev', gulp.series('default', serve, 'watch'));
