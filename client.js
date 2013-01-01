"use strict";

/* The configuration file for require.js module loading.
 * Also launches the application.
 */
 
var libBase = "../../../lib/";

requirejs.config({
    baseUrl: "src/js",
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
            deps: ["underscore"],
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
    "moment"
], function (app, domReady) {
    domReady(start);
});

// Constants
var TIME_FORMAT = 'MM-DD-YYYY, h:mm:ss a',
    MS_PER_SECOND = 1000,
    MS_PER_MINUTE = MS_PER_SECOND * 60,
    MS_PER_HOUR = MS_PER_MINUTE * 60,
    MS_PER_DAY = MS_PER_HOUR * 24,
    MS_PER_WEEK = MS_PER_DAY * 7;

function start () {
    
    Handlebars.registerPartial("duration", $("#duration-template").html());
    
    var App = Backbone.View.extend({
        // Templates
        activityTmpl: Handlebars.compile($("#activity-template").html()),
        durationTmpl: Handlebars.compile($("#duration-template").html()),
        
        el: "body",
        events: {
            "click #new-activity": "showNewActivity",
            "click #cancel-new-activity": "hideNewActivity",
            "click #create-activity": "createActivity",
            "click #start-activity": "startActivity",
            "click #stop-activity": "stopActivity"
        },
        start: function () {
            this.renderActivities();
            this.setupTickEvents();
            this.on("tick", this.updateRunningDurations, this);
        },
        
        activities: null, // cache of activity data, when fetched
        
        // Render
        renderActivities: function () {
            var self = this;
            this.ajax("fetchActivities", {}, function (data) {
                $("#activities").empty();
                var activities =  _.map(data, function (value, key) {
                    var running = !_.isUndefined(_.find(value.sessions, function (s) { return !!s.start && !s.stop; }));
                    var totalDuration = 0;
                    for (var i = 0; i < value.sessions.length; i++) {
                        var session = value.sessions[i];
                        if (session.start && session.stop) {
                            var start = moment(session.start, TIME_FORMAT),
                                end = moment(session.stop, TIME_FORMAT),
                                duration = end - start;
                            session.duration = duration;
                            totalDuration += session.duration;
                        } else if (session.start && !session.stop) {
                            var start = moment(session.start, TIME_FORMAT),
                                end = moment(),
                                duration = end - start;
                            session.duration = duration;
                            totalDuration += session.duration;
                        }
                    }
                    return { 
                        "name": key, 
                        "value": value, 
                        "running": running,
                        "durationMs": totalDuration,
                        "duration": self.durationJson(totalDuration)
                    };
                });
                self.activities = activities;
                $("#activities").append(self.activityTmpl({ activities: activities }));
            });
        },
        updateRunningDurations: function () {
            var duration, el, newEl;
            $(".duration-value[data-running]").each(function () {
                el = $(this);
                duration = parseInt(el.attr('data-duration-ms'));
                duration += 1000;
                newEl = app.durationTmpl({
                    running: true,
                    durationMs: duration,
                    duration: app.durationJson(duration)
                });
                el.replaceWith(newEl);
            });
        },
        
        // Utility
        ajax: function (action, json, callback) {
            $.ajax({
                url: "server.php?action=" + action,
                type: "post",
                data: JSON.stringify(json),
                success: function (data) {
                    callback(data);
                },
                error: function (data) {
                    console.log('error:', data);
                }
            });
        },
        durationJson: function (millis) {
            var json = {};
            
            json.weeks = Math.floor(millis / MS_PER_WEEK);
            millis = millis % MS_PER_WEEK;
            
            json.days = Math.floor(millis / MS_PER_DAY);
            millis = millis % MS_PER_DAY;
            
            json.hours = Math.floor(millis / MS_PER_HOUR);
            millis = millis % MS_PER_HOUR;
            
            json.minutes = Math.floor(millis / MS_PER_MINUTE);
            millis = millis % MS_PER_MINUTE;
            
            json.seconds = Math.floor(millis / MS_PER_SECOND);
            millis = millis % MS_PER_SECOND;
            
            return json;
        },
        setupTickEvents: function () {
            function startTicking() {
                app.trigger("tick");
                setInterval(function () { app.trigger("tick"); }, 1000);
            }
            
            var now = new Date(),
                ms = now.getMilliseconds();
            
            if (ms) {
                setTimeout(function () {
                    startTicking();
                }, 1000-ms+10);
            }
        },
        
        // Event Handlers
        showNewActivity: function (e) {
            e.preventDefault();
            $("#new-activity-form")[0].reset();
            $("#new-activity-form").show();
        },
        hideNewActivity: function (e) {
            e.preventDefault();
            $("#new-activity-form").hide();
        },
        createActivity: function (e) {
            e.preventDefault();
            var self = this;
            this.ajax("createActivity", { activity: $("#activityName").val() }, function (data) {
                self.renderActivities();
                self.hideNewActivity(e);
            });
        },
        startActivity: function (e) {
            var self = this;
            e.preventDefault();
            var el = $(e.currentTarget);
            var data = {
                activity: el.parents("tr").attr("data-activity"),
                start: moment().format(TIME_FORMAT)
            };
            this.ajax("startActivity", data, function (data) {
                self.renderActivities();
            });
        },
        stopActivity: function (e) {
            var self = this;
            e.preventDefault();
            var el = $(e.currentTarget);
            var data = {
                activity: el.parents("tr").attr("data-activity"),
                stop: moment().format(TIME_FORMAT)
            };
            this.ajax("stopActivity", data, function (data) {
                self.renderActivities();
            });
        }
    });
    window.app = new App();
    app.start();
}

/*

Ajax request template:

$.ajax({
    url: "server.php?action=createActivity",
    type: "post",
    data: JSON.stringify({ activity: $("#activityName").val() }),
    success: function (data) {
        console.log('success:', data);
    },
    error: function (data) {
        console.log('error:', data);
    }
});

 */
