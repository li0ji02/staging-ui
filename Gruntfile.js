module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({

		// Add CSS prefixes for other browsers
		autoprefixer: {
			options: {
				browsers: ['last 2 versions', 'ie 9']
			},
			dist: {
				options: {
					map: true
				},
				expand: true,
				cwd: 'dist/css',
				src: '*.css',
				dest: ''
			},
		},

		// Delete existing dist folder
		clean: {
			dist: {
				src: "dist"
			},
			tmp: {
				src: ".tmp"
			}
		},

		// Copy required files
		copy: {
			all: {
				files: [
					// TODO: Don't copy api folder
					{expand: true, cwd: 'www/api', src: ['**'], dest: 'dist/api'},
					{expand: true, cwd: 'www/fonts', src: ['**'], dest: 'dist/fonts'},
					{expand: true, cwd: 'www/img', src: ['**'], dest: 'dist/img'},
					{expand: true, cwd: 'www/', src: ['favicon.ico', 'index.html'], dest: 'dist/'},
					{expand: true, cwd: 'www/js/', src: [
						'bootstrap.min.js',
						'jquery-1.11.3.min.js',
						'respond.min.js'
					], dest: 'dist/js/'},
				]
			},
		},

		// Tell usemin to find all script/style references in index.html
		useminPrepare: {
			html: 'www/index.html',
			options: {
				dest: 'dist'
			}
		},

		// Tell usemin to do its thing
		usemin: {
			html: ['dist/index.html']
		},

	});

	// Load the tasks
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-autoprefixer');
	grunt.loadNpmTasks('grunt-usemin');

	// Register default task. Call using just 'grunt'
	grunt.registerTask('default', [
		'clean:dist',
		'copy',
		'useminPrepare',
		'autoprefixer',
		'concat',
		'cssmin',
		'uglify',
		'usemin',
		'clean:tmp',
	]);
};
