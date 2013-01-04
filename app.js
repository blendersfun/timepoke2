"use strict";

// Constants
var STORE_TIME_FORMAT = 'MM-DD-YYYY, h:mm:ss a',
    INPUT_TIME_FORMAT = 'M-D-YYYY',
    MS_PER_SECOND = 1000,
    MS_PER_MINUTE = MS_PER_SECOND * 60,
    MS_PER_HOUR = MS_PER_MINUTE * 60,
    MS_PER_DAY = MS_PER_HOUR * 24,
    MS_PER_WEEK = MS_PER_DAY * 7,
    DATE_INPUT_REGEXP = /^\s*(\d\d?-\d\d?-\d\d\d\d)\s*$/;

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
            "click #stop-activity": "stopActivity",
            "change #startDate": "updateDateRange",
            "change #endDate": "updateDateRange",
            "click #today":      "setToday",
            "click #thisWeek":   "setThisWeek",
            "click #last2Weeks": "setLastTwoWeeks",
            "click #thisMonth":  "setThisMonth"
        },
        start: function () {
            this.setupDateRange();
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
                        var session = value.sessions[i], start = null, stop = null, duration = 0;
                        
                        if (session.start) {
                            start = moment(session.start, STORE_TIME_FORMAT).toDate();
                        }
                        if (session.stop) {
                            stop = moment(session.stop, STORE_TIME_FORMAT).toDate();
                        }
                        if (!stop) {
                            stop = new Date();
                        }
                        
                        var inPast = start < app.startDate && stop < app.startDate,
                            inFuture = start > app.endDate && stop > app.endDate;
                        if (!inPast && !inFuture) {
                            if (start < app.startDate) {
                                start = app.startDate;
                            }
                            if (stop > app.endDate) {
                                stop = app.endDate;
                            }
                            duration = stop - start;
                            
                            session.duration = duration;
                            totalDuration += duration;
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
        setupDateRange: function () {
            var cookieStartDate = $.cookie("startDate");
            var cookieEndDate = $.cookie("endDate");
            
            if (cookieStartDate) {
                this.startDate = moment(cookieStartDate, STORE_TIME_FORMAT).toDate();
            }
            else {
                this.startDate = new Date();
                this.startDate.setHours(0, 0, 0, 0);
            }
            
            if (cookieEndDate) {
                this.endDate = moment(cookieEndDate, STORE_TIME_FORMAT).toDate();
            }
            else {
                this.endDate = new Date(this.startDate);
                this.endDate.setHours(23, 59, 59, 999);
            }
            
            var startStr = moment(this.startDate).format(INPUT_TIME_FORMAT);
            var endStr = moment(this.endDate).format(INPUT_TIME_FORMAT);
            $("#startDate").val(startStr);
            $("#endDate").val(endStr);
        },
        updateDateRange: function () {
            var changeOccurred = false;
            
            var startStr = $("#startDate").val();
            if (startStr.match(DATE_INPUT_REGEXP)) {
                this.startDate = moment(startStr, INPUT_TIME_FORMAT).toDate();
                this.startDate.setHours(0, 0, 0, 0);
                $.cookie("startDate", moment(this.startDate).format(STORE_TIME_FORMAT));
                changeOccurred = true;
            }
            else {
                var inputStr = moment(this.startDate).format(INPUT_TIME_FORMAT);
                $("#startDate").val(inputStr);
            }
            
            var endStr = $("#endDate").val();
            if (endStr.match(DATE_INPUT_REGEXP)) {
                this.endDate = moment(endStr, INPUT_TIME_FORMAT).toDate();
                this.endDate.setHours(23, 59, 59, 999);
                $.cookie("endDate", moment(this.endDate).format(STORE_TIME_FORMAT));
                changeOccurred = true;
            }
            else {
                var inputStr = moment(this.endDate).format(INPUT_TIME_FORMAT);
                $("#endDate").val(inputStr);
            }
            
            if (changeOccurred) {
                this.renderActivities();
            }
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
                start: moment().format(STORE_TIME_FORMAT)
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
                stop: moment().format(STORE_TIME_FORMAT)
            };
            this.ajax("stopActivity", data, function (data) {
                self.renderActivities();
            });
        },
        setToday: function (e) {
            e.preventDefault();
            var inputStr = moment().format(INPUT_TIME_FORMAT);
            $("#startDate").val(inputStr);
            $("#endDate").val(inputStr);
            this.updateDateRange();
        },
        setThisWeek: function (e) {
            e.preventDefault();
            var startStr = moment().subtract("days", moment().day()).format(INPUT_TIME_FORMAT);
            var endStr = moment().format(INPUT_TIME_FORMAT);
            $("#startDate").val(startStr);
            $("#endDate").val(endStr);
            this.updateDateRange();
            
        },
        setLastTwoWeeks: function (e) {
            e.preventDefault();
            var startStr = moment().subtract("days", moment().day() + 7).format(INPUT_TIME_FORMAT);
            var endStr = moment().format(INPUT_TIME_FORMAT);
            $("#startDate").val(startStr);
            $("#endDate").val(endStr);
            this.updateDateRange();
        },
        setThisMonth: function (e) {
            e.preventDefault();
            var startStr = moment().date(1).format(INPUT_TIME_FORMAT);
            var endStr = moment().format(INPUT_TIME_FORMAT);
            $("#startDate").val(startStr);
            $("#endDate").val(endStr);
            this.updateDateRange();
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
