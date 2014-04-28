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
var config;

<% if (compass) { %>
var styleType = 'scss';
<% } else if (less) { %>
var styleType = 'less';
<% } else if (stylus) { %>
var styleType = 'styl';
var nib = require('nib');
<% } %>

<% if (coffee) { %>
var jsType = 'coffee';
<% } else { %>
var jsType = 'js';
<% } %>

<% if (jade) { %>
  var htmlType = 'jade'
<% } else { %>
  var htmlType = 'html'
<% } %>

var files = {
  testFiles: [
    'app/bower_components/angular/angular.js',
    'app/bower_components/angular-mocks/angular-mocks.js',
    'app/bower_components/angular-resource/angular-resource.js',
    'app/bower_components/angular-cookies/angular-cookies.js',
    'app/bower_components/angular-sanitize/angular-sanitize.js',
    'app/bower_components/angular-route/angular-route.js',
    'app/scripts/*.js',
    'app/scripts/**/*.js',
    'test/mock/**/*.js',
    'test/spec/**/*.js'
  ]
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

var lintScripts = lazypipe()
  <% if (coffee) { %>
  .pipe($.coffeelint)
  .pipe($.coffeelint.reporter);
  <% } else { %>
  .pipe($.jshint, '.jshintrc')
  .pipe($.jshint.reporter, 'jshint-stylish');
  <% } %>

var styles = lazypipe()
  <% if (compass) { %>
  .pipe(compass({
    css: 'app/styles',
    sass: 'app/styles',
    image: 'app/images'
  }))
  <% } else if (less) { %>
    .pipe($.less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
  <% } else if (stylus) { %>
    .pipe($.stylus, {use: [nib()], errors: true})
  <% } %>
  .pipe($.autoprefixer, 'last 1 version')
  .pipe(gulp.dest, './.tmp/styles');

///////////
// Tasks //
///////////

gulp.task('styles', function () {
  return gulp.src('app/styles/**/*.' + styleType)
    .pipe(styles());
});

<% if (coffee) { %>
gulp.task('coffee', function() {
  gulp.src('app/scripts/**/*.coffee')
    .pipe(coffeelint())
    .pipe($.coffee({bare: true}).on('error', $.util.log))
    .pipe(gulp.dest('.tmp/scripts'));
});
<% } %>

gulp.task('lint:scripts', function () {
  return gulp.src([
    'app/scripts/**/*.' + jsType,
    'lib/**/*.' + jsType,
    'server.' + jsType,
  ]).pipe(lintScripts());
});

gulp.task('clean:tmp', function () {
  return gulp.src('.tmp', {read: false}).pipe($.clean());
});

<% if (coffee) { %>
gulp.task('start:client', ['coffee', 'styles'], function (callback) {
<% } else { %>
gulp.task('start:client', ['styles'], function (callback) {
<% %>
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

  $.watch({glob: 'app/styles/**/*.' + styleType})
    .pipe($.plumber())
    .pipe(styles())
    .pipe($.livereload());

  $.watch({glob: 'app/views/**/*'})
    .pipe($.plumber())
    .pipe($.livereload());

  $.watch({glob: 'app/scripts/**/*.' + jsType})
    .pipe($.plumber())
    .pipe(lintScripts())
    <% if (coffee) %>
    .pipe($.coffee({bare: true}).on('error', $.util.log))
    .pipe(gulp.dest('.tmp/scripts'))
    <% } %>
    .pipe($.livereload());

  $.watch({glob: [
    'app/lib/**/*.' + jsType,
    './*.' + jsType,
    'test/**/*.' + jsType
  ])
    .pipe($.plumber())
    .pipe(jshint());

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
  return gulp.src('test/server/**/*.' + jsType)
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
  return gulp.src('app/views/index.jade')
    .pipe(wiredep({
      directory: './app/bower_components',
      exclude: ['bootstrap-sass-official'],
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
  var cssFilter = $.filter('**/*.css');
  var assets = $.filter('**/*.{js,css}');

  return gulp.src('app/views/index.jade')
    .pipe($.jade({pretty: true}))
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
    .pipe($.useref())
    .pipe(assets)
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
