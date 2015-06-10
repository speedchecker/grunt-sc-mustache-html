/*
 * grunt-sc-mustache-html
 *
 * Copyright (c) 2015 Optimal Software s.r.o.
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
	// Requires
	var fs = require('fs');
	var hogan = require('hogan.js');
	var _ = require('underscore');

	// Private module
	var privateModule = {
		// Models
		models: {
			template: {
				name: '',
				vanilla: {},
				data: {
					render: {
						layout: '',
					},

					page: {},
				},
			},
		},
	};

	// Task module
	var taskModule = {
		// Properties
		properties: {
			globals: {},
			options: {
				src: '',
				dist: '',
				type: '',
			},
		},

		// Templates
		templates: {
			layouts: [],
			partials: [],
		},

		// Methods
		init: function(globals, options) {
			var self = this;

			// Properties
			self.properties.globals = _.extend({}, self.properties.options, globals);
			self.properties.options = _.extend({}, self.properties.options, options);

			var fileTypeMatcher = new RegExp('\\.' + self.properties.options.type + '$');

			// Templates
			self.templates.layouts = self.createTemplatesInFolder(self.properties.options.src + '/layouts', fileTypeMatcher);
			grunt.log.ok(self.templates.layouts.length, 'layouts');

			self.templates.partials = self.createTemplatesInFolder(self.properties.options.src + '/partials', fileTypeMatcher);
			grunt.log.ok(self.templates.partials.length, 'partials');

			// Pages
			var pagesPath = (self.properties.options.src + '/pages');
			var pages = self.createTemplatesInFolder(pagesPath, fileTypeMatcher);
			if (pages.length < 1) { grunt.log.error('No page found in folder: ' + pagesPath); return null; }

			self.processPageTemplates(pages);
			grunt.log.ok(pages.length, 'pages');
		},

		processPageTemplates: function(value) {
			var self = this;

			if (!_.isArray(value) || value.length < 1) { return null; }

			value.forEach(function(item, index) {
				// Content
				var content = self.createContentFromTemplate(item);
				if (!_.isString(content) || (content === '')) { content = ''; }

				// Path
				var abspath = ''.concat(self.properties.options.dist, '/', item.name, '.', (item.data.render.extension || 'html'));

				// Process
				grunt.file.write(abspath, content);
			});
		},

		getProperTemplatePath: function(folderPath, name) {
			var self = this;

			if ((typeof(folderPath) !== 'string') || (folderPath === '')) { return null; }
			if ((typeof(name) !== 'string') || (name === '')) { return null; }

			var result = ''.concat(folderPath, '/', name, '.', self.properties.options.type);

			// Process
			return result;
		},

		createTemplatesInFolder: function(value, fileTypeMatcher) {
			var self = this;

			if ((typeof(value) !== 'string') || (value === '')) { return []; }

			var result = [];
			grunt.file.recurse(value, function (abspath, rootdir, subdir, filename) {
		        if (!filename.match(fileTypeMatcher)) { return null; }

		        // Properties
		        var name = (subdir? (subdir + '/') : '') + filename.replace(fileTypeMatcher, '');
		        var dataPath = abspath.replace(fileTypeMatcher, '.json');

			    // Result
			    result.push(_.extend({}, privateModule.models.template, {
				    name: name,
				    vanilla: hogan.compile(grunt.file.read(abspath), { sectionTags: [{o:'_i', c:'i'}] }),
				    data: grunt.file.exists(dataPath)? grunt.file.readJSON(dataPath) : null,
				}));
		    });

		    // Process
		    return result;
		},

		createContentFromTemplate: function(value) {
			var self = this;
			var value = _.extend({}, privateModule.models.template, value);

			// Case: layout
			var layout = self.getLayoutTemplate(value.data.render.layout);
			if (layout) {
				var partials = self.getTemplatesAsVanilla(self.templates.partials);
				partials['content'] = value.vanilla;

				return layout.vanilla.render(
					_.extend({}, self.properties.globals, value.data),
					partials
				);
			}

			// Other case
			return value.vanilla.render(
				_.extend({}, self.properties.globals, value.data),
				self.getTemplatesAsVanilla(self.templates.partials)
			);
		},

		getLayoutTemplate: function(value) {
			var self = this;

			if ((typeof(value) !== 'string') || (value === '')) { return null; }

			// Results
			var results = self.templates.layouts.filter(function (item) {
				if (item.name === value) { return item; }
			});
			if (results.length < 1) { return null; }

			// Process
			return results[0];

		},

		getTemplatesAsVanilla: function(value) {
			var self = this;

			if (!_.isArray(value) || (value.length < 1)) { return []; }

			// Result
			var result = [];
			for (var i = 0; i < value.length; i++) {
				result[value[i].name] = value[i].vanilla;
			}

			// Process
			return result;
		},
	};

	// Process
	grunt.registerMultiTask('sc_mustache_html', 'Compile mustache|hbs templates to HTML', function() {
		try {

		taskModule.init(this.data.globals, this.options({
			src: 'src',
			dist: 'dist',
			type: 'mustache',
		}));

		} catch(e) {
			grunt.log.error(e.stack);
		}
	});
};
