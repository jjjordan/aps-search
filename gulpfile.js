const gulp = require('gulp');
const ts = require('gulp-typescript');
const esbuild = require('gulp-esbuild');

const tsProject = ts.createProject('tsconfig.json');

gulp.task('ts', () => {
    return gulp.src(['src/*.ts'])
        .pipe(tsProject())
        .pipe(gulp.dest('out/int/js'));
});

gulp.task('esbuild', gulp.series('ts', () => {
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

gulp.task('copydata', () => {
    return gulp.src(['data/registry.json']).pipe(gulp.dest('out/rel/data'));
});

gulp.task('default', gulp.parallel('esbuild', 'copyhtml', 'copydata'));
