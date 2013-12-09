
var _ = require('underscore');

module.exports = function(grunt) {

	// Load required NPM tasks.
	// You must first run `npm install` in the project's root directory to get these dependencies.
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-watch'); // Very useful for development. See README.


	// read config files, and combine into one "meta" object
	var packageConfig	= grunt.file.readJSON('package.json');
	var bowerConfig		= grunt.file.readJSON('bower.json');
	var pluginConfig	= grunt.file.readJSON('firecollab.json');
	var meta			= _.extend({}, packageConfig, bowerConfig, pluginConfig);


	var config = {	// this will eventually get passed to grunt.initConfig
		meta: meta,	// do this primarily for templating (<%= %>)

		// initialize multitasks
		shell: {
			jotJs: {
				command: [
					'mkdir -p lib/jot',
					'mkdir -p build/out/jot',
					'cp -r jot/jot build/out/jot',
					'cp jot/build_browser_lib.js build/out/jot',
					'mkdir -p build/out/jot/node_modules/deep-equal',
					'cp node_modules/deep-equal/index.js build/out/jot/node_modules/deep-equal',
					'mkdir -p build/out/jot/node_modules/googlediff/javascript',
					'cp node_modules/googlediff/javascript/diff_match_patch_uncompressed.js build/out/jot/node_modules/googlediff/javascript',
					'cd build/out/jot',
					'node build_browser_lib.js > ../../../lib/jot/jot.js',
					'cd ../../..',
					'rm -rf build/out/jot'
				].join('&&'),
				options: {
					stdout: true,
					stderr: true
				}
			},
			subclassJs: {
				command: [
					'mkdir -p lib/subclass',
					'cp subclass/subclass.js lib/subclass/subclass.js'
				].join('&&'),
				options: {
					stdout: true,
					stderr: true
				}
			}
		},
		concat	: {},
		uglify	: {},
		copy	: {},
		compress: {},
		clean	: {},
		watch	: {}	// we will add watch tasks whenever we do concats, so files get re-concatenated upon save
	};


	// files that the examples might need in the distributable
	var depFiles = require('./deps.js');


	/* Important Top-Level Tasks
	----------------------------------------------------------------------------------------------------*/

	grunt.registerTask('default', 'dist'); // what will be run with a plain old "grunt" command

	grunt.registerTask('dist', 'Create a distributable ZIP file', [
		'clean:build',
		'submodules',
		'uglify',
		'copy:deps',
		'copy:examples',
		'copy:misc',
		'compress'
	]);

	grunt.registerTask('submodules', 'Build all FireCollab submodules', [
		'jot',
		'subclass',
		'main'
	]);

	grunt.registerTask('dev', 'Build necessary files for developing and debugging', [
		'submodules',
		'copy:deps'
	]);

	grunt.registerTask('min', 'The same as dev + uglify', [
		'dev',
		'uglify'
	]);

	/* JOT Submodule
	----------------------------------------------------------------------------------------------------*/

	grunt.registerTask('jot', 'Build the JOT submodule', [
		'shell:jotJs'
	]);

	config.watch.jotJs = {
		files: 'jot/*/**',
		tasks: 'shell:jotJs'
	};


	/* SubclassJS Submodule
	----------------------------------------------------------------------------------------------------*/

	grunt.registerTask('subclass', 'Build the SubclassJS submodule', [
		'shell:subclassJs'
	]);

	config.watch.jotJs = {
		files: 'subclass/**',
		tasks: 'shell:subclassJs'
	};


	/* Main Submodule
	----------------------------------------------------------------------------------------------------*/

	grunt.registerTask('main', 'Build the FireCollab', [
		'concat:mainJs'
	]);

	// JavaScript
	config.concat.mainJs = {
		options: {
			process: true	// replace template variables
		},
		src: [
			'source/header.js',
			'source/utils.js',
			'source/firecollab.js',
			'source/adapter.js'
		],
		dest: 'build/out/js/firecollab.js'
	};

	config.watch.mainJs = {
		files: config.concat.mainJs.src,
		tasks: 'concat:mainJs'
	};


	/* Minify the JavaScript
	----------------------------------------------------------------------------------------------------*/

	config.uglify.all = {
		options: {
			preserveComments: 'some'	// keep comments starting with /*!
		},
		expand: true,
		src: 'build/out/js/firecollab.js',
		ext: '.min.js'
	}


	/* Copy Dependencies
	----------------------------------------------------------------------------------------------------*/

	config.copy.deps = {
		expand: true,
		flatten: true,
		src: depFiles,
		dest: 'build/out/js'
	};


	/* Examples
	----------------------------------------------------------------------------------------------------*/

	config.copy.examples = {
		options: {
			process: true,	// replace template variables
			// while copying demo files over, rewrite <script> and <link> tags for new dependency locations
			processContentExclude: 'examples/*/*/**',	// don't process anything more than 2 levels deep (like assets)
			processContent: function(content) {
				// content = rewriteDemoStylesheetTags(content);
				content = rewriteDemoScriptTags(content);
				return content;
			}
		},
		src: 'examples/**',
		dest: 'build/out/'
	};

	function rewriteDemoStylesheetTags(content) {
		return content.replace(
			/(<link[^>]*href=['"])(.*?\.css)(['"][^>]*>)/g,
			function(full, before, href, after) {
				href = href.replace('../build/out/css', '../css');
				return before + href + after;
			}
		);
	}

	function rewriteDemoScriptTags(content) {
		return content.replace(
			/(<script[^>]*src=['"])(.*?)(['"][\s\S]*?<\/script>)/g,
			function(full, before, src, after) {
				if (src == '../../deps.js') {
					return buildDepScriptTags();
				}
				else {
					src = src.replace('../build/out/js', '../js');
					src = src.replace('/firecollab.js', '/firecollab.min.js');	// use minified version of main JS file
					return before + src + after;
				}
			}
		);
	}

	function buildDepScriptTags() {
		var tags = [];
		for (var i=0; i<depFiles.length; i++) {
			var fileName = depFiles[i].replace(/.*\//, ''); // get file's basename
			tags.push("<script src='../../js/" + fileName + "'></script>"); // all dependencies are in jot/ for now
		}
		return tags.join("\n");
	}


	/* Copy Misc Files
	----------------------------------------------------------------------------------------------------*/

	config.copy.misc = {
		src: "*.txt", // licenses and changelog
		dest: 'build/out/'
	};


	/* Create ZIP file
	----------------------------------------------------------------------------------------------------*/

	config.compress.all = {
		options: {
			archive: 'dist/FireCollab-<%= meta.version %>.zip'
		},
		expand: true,
		cwd: 'build/out/',
		src: '**',
		dest: 'FireCollab-<%= meta.version %>/' // have a top-level directory in the ZIP file
	};


	/* Bower Component
	----------------------------------------------------------------------------------------------------*/
	// http://twitter.github.com/bower/

	grunt.registerTask('bower', 'Build FireCollab package for the Bower package manager', [
		'clean:build',
		'submodules',
		'uglify',
		'copy:deps',
		'copy:bower',
		'copy:bowerReadme',
		'bowerConfig'
	]);

	config.copy.bower = {
		expand: true,
		cwd: 'build/out/',
		src: '**',
		dest: 'build/bower/',
	};

	config.copy.bowerReadme = {
		src: 'bower-readme.md',
		dest: 'build/bower/README.md'
	};

	grunt.registerTask('bowerConfig', function() {
		grunt.file.write(
			'build/bower/bower.json',
			JSON.stringify(
				_.extend({}, pluginConfig, bowerConfig), // combine the 2 configs
				null, // replacer
				2 // indent
			)
		);
	});


	/* Clean Up Files
	----------------------------------------------------------------------------------------------------*/

	config.clean.build = [
		'build/out/*',
		'build/bower/*'
	];

	config.clean.dist = 'dist/*';


	/* Finish Up
	----------------------------------------------------------------------------------------------------*/

	// finally, give grunt the config object...
	grunt.initConfig(config);
};
