const app = angular.module('cs-app', []);

app.controller('MainView', ['$scope', '$interval', '$element', '$http', '$q', MainView]);

function MainView(scope, $interval, element, $http, $q) {

    const dots = scope.dots = [];

    scope.time = 0;
    scope.minTime = 0;
    scope.maxTime = 0;

    scope.events = [];

    scope.doers = {};

    // Remove numbers
    $('a', element)
        .filter((i, a) => $('ellipse', a).length > 0 && $('text', a).text().trim() != '')
        .each((i, a) => $('text', a).text(' '))

    $('a', element)
        .filter((i, a) => $('polygon', a).length > 0 && $('path', a).length === 0)
        .each((i, a) => {
            let color = $('polygon', a).attr('fill');
            let method = $(a).attr('xlink:title');
            if (!scope.doers[color]) {
                scope.doers[color] = {color: color, methods: [], runners: 2, active: 0};
            }
            scope.doers[color].methods.push(method);
        });

    scope.load = function(file) {
        return $http.get(file).then(res => {
                scope.events = res.data;
                scope.events.forEach(e => e._created = Date.parse(e.created));
                // scope.events.sort((a, b) => a._created - b._created);

                scope.time = scope.events[0]._created;
                scope.minTime = scope.time;
                scope.maxTime = scope.events[scope.events.length - 1]._created;
                console.log("min", scope.time);
                console.log("max", scope.maxTime);
            }
        );
    }

    scope.load('mar5.json');

    scope.setTime = function(time) {
        var startIndex = firstIndexAfter(scope.time);
        var endIndex = firstIndexAfter(time);
        scope.time = time;
        if (startIndex === endIndex) {
            return;

        }

        var tasksAtEnd = (startIndex < endIndex ?
            getTasksAtEnd(scope.dots, startIndex, endIndex) :
            getTasksAtEnd([], 0, endIndex));
        updatePositions(tasksAtEnd);
        scope.dots = tasksAtEnd;

    }

    scope.b1click = function() {
        $interval.cancel(scope.stopper);

        scope.stopper = $interval(() => {
            scope.setTime(Math.min(scope.time + 2000, scope.maxTime));
            if (scope.time >= scope.maxTime) {
                $interval.cancel(scope.stopper);
                console.log('stopped');
            }
        }, 100);
        // let n1 = getStateNode('CSAP File validated');
        // // let img = $('.t1');
        // // img.css('transform', "translate(" + n1.attr('cx') + "px," + (2824 + parseInt(n1.attr('cy'))) + "px)");
        // dots[0].cx = parseInt(n1.attr('cx')) + 4;
        // dots[0].cy = parseInt(n1.attr('cy')) + 2824;
    };

    scope.b2click = function() {
        $interval.cancel(scope.stopper);
        // let n1 = getStateNode('VAN File validated');
        // let img = $('.t1');`
        // img.css('transform', "translate(" + n1.attr('cx') + "px," + (2824 + parseInt(n1.attr('cy'))) + "px)");
        // dots[0].cx = parseInt(n1.attr('cx')) + 4;
        // dots[0].cy = parseInt(n1.attr('cy')) + 2824;

    };

    scope.b_backward_click = function() {
        let index = scope.events.findIndex(e => e._created >= scope.time);
        if (index > 0) {
            scope.setTime(scope.events[index - 1]._created);
        }
    };

    scope.b_forward_click = function() {
        let e = scope.events.find(e => e._created > scope.time);
        if (e) {
            scope.setTime(e._created);
        }
    };

    function getStateNode(state) {
        return $('ellipse', $("a", element).filter((i, n) => $(n).attr('xlink:title') === state));
    }

    function getMethodNode(name) {
        return $('polygon', $("a", element).filter((i, n) => $(n).attr('xlink:title') === name));
    }

    function firstIndexAfter(time) {
        const index = scope.events.findIndex(e => e._created > time);
        return index >= 0 ? index : scope.events.length;
    }

    function getTasksAtEnd(base, startIndex, endIndex) {
        const tasks = {};
        base.forEach(t => tasks[t.taskId] = t);
        const result = base.slice(0);
        for (var i = startIndex; i < endIndex; i++) {
            let event = scope.events[i];
            if (tasks[event.task_id]) {
                let task = tasks[event.task_id];
                task.color = event.exception_type == null ? '#000000' : '#ff0000';
                task.visible = true;
                task.status = event.final_status;
                task.lastUpdate = event._created;
            } else {
                let task = {
                    color: event.exception_type == null ? '#000000' : '#ff0000',
                    cx: 0,
                    cy: 0,
                    visible: true,
                    taskId: event.task_id,
                    status: event.final_status,
                    lastUpdate: event._created,
                }
                tasks[task.taskId] = task;
                result.push(task);
            }
        }
        return result;
    }

    function updatePositions(tasks) {
        let statusPositions = {};
        tasks.forEach(t => {
            if (!statusPositions[t.status]) {
                let cx;
                let cy;
                let n = getStateNode(t.status);
                if (n.length > 0) {
                    cx = parseInt(n.attr('cx')) + 4;
                    cy = parseInt(n.attr('cy')) + 2824;
                } else {
                    let p = getMethodNode(t.status);
                    cx = getCenterFromPoligon(p.attr('points')).x + 4;
                    cy = getCenterFromPoligon(p.attr('points')).y + 2824;
                }
                statusPositions[t.status] = {
                    cx: cx,
                    cy: cy,
                    total: 1,
                    count: 0,
                }
            } else {
                statusPositions[t.status].total++;
            }
        });
        tasks.forEach(t => {
            let statusPosition = statusPositions[t.status];
            statusPosition.count++;
            let cols = Math.round(Math.sqrt(10 * statusPosition.total / 5));

            let row = Math.floor(statusPosition.count / cols);
            let col = statusPosition.count % cols;

            t.cx = statusPosition.cx + (col - cols / 2) * 10 + (row % 2 * 5);
            t.cy = statusPosition.cy - row * 10;
        });
    }

    function getCenterFromPoligon(s) {
        let points = s.split(' ')
            .map(i => i.split(','))
            .map(arr => {
                return {
                    x: parseFloat(arr[0]),
                    y: parseFloat(arr[1])
                };
            });
        let minX = points.map(p => p.x).reduce((a, b) => Math.min(a, b));
        let maxX = points.map(p => p.x).reduce((a, b) => Math.max(a, b));
        let minY = points.map(p => p.y).reduce((a, b) => Math.min(a, b));
        let maxY = points.map(p => p.y).reduce((a, b) => Math.max(a, b));
        return {
            x: Math.round((minX + maxX) / 2),
            y: Math.round((minY + maxY) / 2)
        };
    }
}
