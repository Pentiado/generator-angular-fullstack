// Generated on <%= (new Date).toISOString().split('T')[0] %> using <%= pkg.name %> <%= pkg.version %>
'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var http = require('http');
var openURL = require('open');
var lazypipe = require('lazypipe');
var wiredep = require('wiredep').stream;
var nodemon = require('nodemon');
var runSequence = require('run-sequence');
var path = require('path');
var nib = require('nib');
var config;

var paths = {
  client: {
    scripts: <% if (coffee) { %>['app/scripts/**/*.coffee']<% } else { %>['app/scripts/**/*.js']<% } %>,
    styles: <% if (stylus) { %>['app/styles/**/*.styl']<% } else { %>['app/styles/**/*.css']<% } %>,
    test: <% if (coffee) { %>['test/client/**/*.coffee']<% } else { %>['test/client/**/*.js']<% } %>,
    testRequire: [
      'app/bower_components/angular/angular.js',
      'app/bower_components/angular-mocks/angular-mocks.js',
      'app/bower_components/angular-resource/angular-resource.js',
      'app/bower_components/angular-cookies/angular-cookies.js',
      'app/bower_components/angular-sanitize/angular-sanitize.js',
      'app/bower_components/angular-route/angular-route.js',<% if (coffee) { %>
      'test/mock/**/*.coffee',
      'test/spec/**/*.coffee'<% } else { %>
      'test/mock/**/*.js',
      'test/spec/**/*.js'<% } %>
    ]
  },
  server: {<% if (coffee) { %>
    scripts: ['lib/**/*.coffee'],
    test: ['test/server/**/*.coffee'],<% } else { %>
    scripts: ['lib/**/*.js'],
    test: ['test/server/**/*.js'],<% } %>

  },
  views: {<% if (jade) { %>
    main: 'app/views/index.jade',
    files: ['app/views/**/*.jade']<% } else {%>
    main: 'app/views/index.html',
    files: ['app/views/**/*.html']<% } %>
  }
};

//////////////////////
// Helper functions //
//////////////////////

function onServerLog(log) {
  console.log($.util.colors.white('[') + $.util.colors.yellow('nodemon') + $.util.colors.white('] ') + log.message);
}

function checkAppReady(cb) {
  var options = {
    host: 'localhost',
    port: config.port,
  };
  http.get(options, function() {
    cb(true);
  }).on('error', function() {
    cb(false);
  });
}

// Call page until first success
function whenServerReady (cb) {
  var serverReady = false;
  var appReadyInterval = setInterval(function () {
    checkAppReady(function(ready){
      if (!ready || serverReady) { return; }
      clearInterval(appReadyInterval);
      serverReady = true;
      cb();
    });
  }, 100);
}

////////////////////////
// Reusable pipelines //
////////////////////////

var lintScripts = lazypipe()<% if (coffee) { %>
  .pipe($.coffeelint)
  .pipe($.coffeelint.reporter);<% } else { %>
  .pipe($.jshint, '.jshintrc')
  .pipe($.jshint.reporter, 'jshint-stylish');<% } %>

var styles = lazypipe()<% if (stylus) { %>
  .pipe($.stylus, {use: [nib()], errors: true})<% } %>
  .pipe($.autoprefixer, 'last 1 version')
  .pipe(gulp.dest, './.tmp/styles');

///////////
// Tasks //
///////////

gulp.task('styles', function () {<% if (stylus) { %>
  return gulp.src('app/styles/**/*.styl')<% } else { %>
  return gulp.src('app/styles/**/*.css')<% } %>
    .pipe(styles());
});

<% if (coffee) { %>gulp.task('coffee', function() {
  gulp.src('app/scripts/**/*.coffee')
    .pipe(lintScripts())
    .pipe($.coffee({bare: true}).on('error', $.util.log))
    .pipe(gulp.dest('.tmp/scripts'));
});<% } %>

gulp.task('lint:scripts', function () {
  var scripts = paths.client.scripts.concat(paths.server.scripts);
  return gulp.src(scripts).pipe(lintScripts());
});

gulp.task('clean:tmp', function () {
  return gulp.src('.tmp', {read: false}).pipe($.clean());
});

gulp.task('start:client', [<% if (coffee) { %>'coffee', <% } %>'styles'], function (callback) {
  whenServerReady(function () {
    openURL('http://localhost:' + config.port);
    callback();
  });
});

gulp.task('start:server', function () {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  config = require('./lib/config/config');
  nodemon('-w lib server.js')
    .on('log', onServerLog);
});

gulp.task('watch', function () {
  var testFiles = paths.client.test.concat(paths.server.test);

  $.watch({glob: paths.client.styles})
    .pipe($.plumber())
    .pipe(styles())
    .pipe($.livereload());

  $.watch({glob: paths.views.files})
    .pipe($.plumber())
    .pipe($.livereload());

  $.watch({glob: paths.client.scripts})
    .pipe($.plumber())
    .pipe(lintScripts())<% if (coffee) { %>
    .pipe($.coffee({bare: true}).on('error', $.util.log))
    .pipe(gulp.dest('.tmp/scripts'))<% } %>
    .pipe($.livereload());

  $.watch({glob: paths.server.scripts.concat(testFiles)})
    .pipe($.plumber())
    .pipe(lintScripts());

  gulp.watch('bower.json', ['bower']);
});

gulp.task('serve', function (callback) {
  runSequence('clean:tmp',
    ['lint:scripts'],
    ['start:server', 'start:client'],
    'watch', callback);
});

gulp.task('test:server', function () {
  process.env.NODE_ENV = 'test';
  return gulp.src(paths.server.test)
    .pipe($.mocha({reporter: 'spec'}));
});

gulp.task('test:client', function () {
  gulp.src(testFiles)
    .pipe($.karma({
      configFile: 'karma.conf.js',
      action: 'watch'
    }));
});

gulp.task('test:client:single', function () {
  return gulp.src(testFiles)
    .pipe($.karma({
      configFile: 'karma.conf.js',
      action: 'run'
    })).on('error', function (err) {
      // Make sure failed tests cause gulp to exit non-zero
      throw err;
    });
});

// inject bower components
gulp.task('bower', function () {
  return gulp.src(paths.views.main)
    .pipe(wiredep({
      directory: './app/bower_components',
      ignorePath: '..'
    }))
  .pipe(gulp.dest('app/views/'));
});

///////////
// Build //
///////////

gulp.task('build', function (callback) {
  runSequence('clean:dist',
    ['images', 'copy:extras', 'copy:server', 'client:build'],
    callback);
});

gulp.task('clean:dist', function () {
  return gulp.src('dist', {read: false}).pipe($.clean());
});

gulp.task('client:build', ['html'], function () {
  var jsFilter = $.filter('**/*.js');
  var cssFilter = $.filter('**/*.css');<% if (jade) { %>
  var assets = $.filter('**/*.{js,css}');<% } %>

  return gulp.src(paths.views.main)<% if (jade) { %>
    .pipe($.jade({pretty: true}))<% } %>
    .pipe($.useref.assets({searchPath: ['./app/', './.tmp/']}))
    .pipe(jsFilter)
    .pipe($.uglify())
    .pipe(jsFilter.restore())
    .pipe(cssFilter)
    .pipe($.csso())
    .pipe(cssFilter.restore())
    .pipe($.rev())
    .pipe($.useref.restore())
    .pipe($.revReplace())
    .pipe($.useref())<% if (jade) { %>
    .pipe(assets)<% } %>
    .pipe(gulp.dest('dist/public'));
});

gulp.task('html', function () {
  return gulp.src('app/views/**/*')
    .pipe(gulp.dest('dist/public/views'));
});

gulp.task('images', function () {
  return gulp.src('app/images/**/*')
    .pipe($.cache($.imagemin({
        optimizationLevel: 5,
        progressive: true,
        interlaced: true
    })))
    .pipe(gulp.dest('dist/public/images'));
});

gulp.task('copy:extras', function () {
  return gulp.src('app/*.*', { dot: true })
    .pipe(gulp.dest('dist/public'));
});

gulp.task('copy:server', function(){
  return gulp.src([
    'package.json',
    'server.js',
    'lib/**/*'
  ], {cwdbase: true}).pipe(gulp.dest('dist'));
});
