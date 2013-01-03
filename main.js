

/* The configuration file for require.js module loading.
 * Also launches the application.
 * Expects libBase to be set to the path from the html document to the lib folder.
 */

var libBase = "../lib/";

requirejs.config({
    paths: {
        "jquery":        libBase + "jquery-1.8.3",
        "jquery.cookie": libBase + "jquery.cookie",
        "backbone":      libBase + "backbone",
        "underscore":    libBase + "underscore",
        "handlebars":    libBase + "handlebars-1.0.rc.1",
        "text":          libBase + "require-text",
        "domReady":      libBase + "require-domReady",
        "bootstrap":     libBase + "bootstrap/js/bootstrap",
        "moment":        libBase + "moment"
    },
    shim: {
        "jquery": {
            exports: "$"
        },
        "jquery.cookie": {
            deps: ["jquery"]
        },
        "underscore": {
            exports: "_"
        },
        "backbone": {
            deps: ["underscore", "jquery"],
            exports: "Backbone"
        },
        "handlebars": {
            exports: "Handlebars"
        },
        "bootstrap": {
            deps: ["jquery"]
        },
        "moment": {
            exports: "moment"
        }
    }
});

require([
    "domReady", 
    "jquery", 
    "backbone", 
    "handlebars", 
    "bootstrap",
    "moment",
    "jquery.cookie"
], function (domReady) {
    domReady(start);
});
