var margin = {top: 30, right: 10, bottom: 40, left: 70};

angular.module('pgdb.query').filter('secondsToDateTime', [function () {
    return function (seconds) {
        return new Date(1970, 0, 1).setSeconds(seconds);
    };
}])
    .directive('annotationPlot', function ($window) {

        return {
            restrict: 'E',
            replace: true,
            template: '<div class="annotation-chart"></div>',

            controllerAs: 'ctrl',
            scope: {
                data: '=data',
                begin: '=',
                end: "=",
                selectedAnnotation: "=",
                hovered: '&hovered',
                seekFn: '&seekFn',
                selectEndUpdateFn: '&selectEndUpdateFn',
                playFn: '&playFn'
            },
            link: function (scope, element, attrs) {
                scope.selection_begin = 0;
                scope.selection_end = 0;
                scope.play_begin = 0;
                var vis = d3.select(element[0]);
                var width = parseInt(vis.style('width'), 10) - margin.left - margin.right;
                var height = parseInt(vis.style('height'), 10) - margin.top - margin.bottom;
                console.log(width, height)

                //react on right clicking
                vis.on("contextmenu", () => d3.event.preventDefault());

                var x = d3.scaleLinear().range([0, width]).nice();
                var xt = x;

                function drawAnnotations() {
                    vis.select('.yaxis').call(yaxis);

                    const annotations = vis.selectAll("g.annotation");
        
                    annotations.select("rect")
                               .attr("height", y(1) - y(2))
                               .attr("x", annotation_x_function)
                               .attr("width", d => xt(d.end) - xt(d.begin));

                    annotations.select("text")
                               .attr("x", d => (xt(d.end) - xt(d.begin)) / 2 + xt(d.begin));

                    ['phone', 'syllable', 'word'].forEach((tier, i) => {
                        vis.selectAll("g.annotation."+tier).select("rect").attr("y", y(i+1))
                        vis.selectAll("g.annotation."+tier).select("text").attr("y", y(i+0.5))
                    });

                    scope.data.viewableSubannotations.forEach((x, i) => {
                        vis.selectAll("g.annotation."+x[1]).select("rect")
                           .attr("y", y(-i));
                    });
                }

                function resize() {
                    width = parseInt(vis.style('width'), 10);
                    width = width - margin.left - margin.right;
                    height = parseInt(vis.style('height'), 10);
                    height = height - margin.top - margin.bottom;

                    console.log('RESiZE', width, height)
                    x.range([0, width]);
                    xt.range([0, width]);
                    y.range([height, 0]);

                    vis.select('svg')
                       .style('height', (height + margin.top + margin.bottom) + 'px')
                       .style('width', (width + margin.left + margin.right) + 'px');
                    vis.select('#annotation_clip').select('rect')
                       .attr("height", height)
                       .attr("width", width);
                    vis.select('.pane')
                       .attr("height", height)
                       .attr("width", width);
                    vis.select('.xaxis')
                       .attr("transform", `translate(0,${height})`)
                       .call(xaxis);
                    vis.select('.yaxis').call(yaxis);
                    vis.select('.playline')
                       .attr("x1", xt(scope.play_begin))
                       .attr("x2", xt(scope.play_begin));

                    vis.select('.yaxis-label')
                       .attr("x", 0 - height / 2)

                    if (selection_rect.attr('opacity') != 0) {
                        selection_rect.attr('x', xt(scope.selection_begin))
                                      .attr('width', xt(scope.selection_end) - xt(scope.selection_begin));
                    }
                    if (scope.selectedAnnotation) {
                        selected_annotation_rect.attr('opacity', 0.3)
                                                .attr('x', xt(scope.selectedAnnotation.begin))
                                                .attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                    }
                    drawAnnotations();
                }

                angular.element($window).bind('resize', resize);

// Make x axis
                var xaxis = d3.axisBottom(x)
                              .ticks(10);

                var zoom_scales = [1, 30];
                var y = d3.scaleLinear()
                          .range([height, 0])
                          .domain([0, 3])
                          .nice();

                var annotation_x_function = d => x(d.begin);
                var yaxis = d3.axisLeft(y)
                              .tickValues([0.5, 1.5, 2.5])
                              .tickFormat((_, i) => ['Phone', 'Syllable', 'Word'][i]);

                var annotation_vis = vis
                    .append("svg")
                    .style('height', (height + margin.top + margin.bottom) + 'px')
                    .style('width', (width + margin.left + margin.right) + 'px')
                    .append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

// Draw the Plotting region------------------------------
// X axis lines (bottom and top).
                annotation_vis.append("g")
                    .attr("class", "xaxis")
                    .attr("transform", `translate(0,${height})`)
                    .call(xaxis);

                annotation_vis.append("g")
                    .attr("class", "yaxis")
                    .call(yaxis);

                annotation_vis.append("text")
                    .attr('class', 'yaxis-label')
                    .attr("x", 0 - height / 2)
                    .attr("y", -margin.left + 20)
                    .attr("transform", "rotate(-90)")
                    .style("text-anchor", "middle")
                    .style("font-size", "16px")
                    .text("Linguistic units");


// End Draw the Plotting region------------------------------


                annotation_vis.append("clipPath")
                    .attr("id", "annotation_clip")
                    .append("rect")
                    .attr('fill-opacity', 0)
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", width)
                    .attr("height", height);

                var annotation_viewplot = annotation_vis.append("g").attr("clip-path", "url(#annotation_clip)");

                var annotation_pane = annotation_vis.append("rect")
                    .attr("class", "pane")
                    .attr("width", width)
                    .attr("height", height)
                    .attr('fill-opacity', 0);

                var annotation_playline = annotation_viewplot.append('line')
                    .attr("class", "playline")
                    .style("stroke", "red")
                    .attr("x1", xt(0))
                    .attr("x2", xt(0))
                    .attr("y1", 0)
                    .attr("y2", height);

                var selection_rect = annotation_viewplot.append("rect")
                    .attr('class', "selection")
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', 0)
                    .attr('height', height)
                    .attr('fill', 'red')
                    .attr('opacity', 0);

                var selected_annotation_rect = annotation_viewplot.append("rect")
                    .attr('class', "selected-annotation")
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', 0)
                    .attr('height', height)
                    .attr('fill', 'yellow')
                    .attr('opacity', 0);


                function onDataUpdate(newVal, oldVal) {
                    if (!newVal) return;
                    console.log('datachanged', newVal)
                    y.domain([-(scope.data.viewableSubannotations.length), 3]);
            
                    //Updates ticks to be from the bottom of subannotations up.
                    //The array from just dynamically makes the ticks, unfortunately it's ugly
                    yaxis.tickValues(Array.from(new Array(y.domain()[1]-y.domain()[0]), (x,i) => i + y.domain()[0] + 0.5))
                          .tickFormat((_, i) => scope.data.viewableSubannotations
                                  .map(j=>j[1]).concat(['Phone', 'Syllable', 'Word'])[i]
                          );
                    x.domain([newVal.begin, newVal.end]);
                    annotation_vis.select('.xaxis').call(xaxis.scale(xt));
                    if (scope.selectedAnnotation){
                        selected_annotation_rect.attr('opacity', 0.3)
                            .attr('x', xt(scope.selectedAnnotation.begin))
                            .attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                    }
                    updateAnnotations();
                }

                scope.$watch('data', onDataUpdate);
                scope.$watch('data.viewableSubannotations', () => onDataUpdate(scope.data, scope.data), true);

                var drag = d3.drag()
                    .filter(() => d3.event.button == 0)
                    .on("start", function () {
                        var coords = d3.mouse(this);
                        var point_time = xt.invert(coords[0]);
                        scope.$emit('BEGIN_SELECTION', point_time);
                    })
                    .on("drag", function () {
                        var p = d3.mouse(this);
                        var point_time = xt.invert(p[0]);
                        scope.$emit('UPDATE_SELECTION', point_time);
                    });


                scope.$on('SELECTION_UPDATE', function (e, selection_begin, selection_end) {
                    scope.selection_begin = selection_begin;
                    scope.selection_end = selection_end;
                    scope.play_begin = selection_begin;
                    annotation_playline.attr("x1", xt(selection_begin))
                        .attr("x2", xt(selection_begin));
                    if (selection_end == null) {
                        annotation_viewplot.select("rect.selection")
                            .attr('opacity', 0);
                    }
                    else {
                        annotation_viewplot.select("rect.selection")
                            .attr('opacity', 0.3)
                            .attr('x', xt(selection_begin))
                            .attr('width', xt(selection_end) - xt(selection_begin));
                    }
                });

                annotation_vis.call(d3.zoom()
                    .scaleExtent(zoom_scales)
                    .translateExtent([[0, 0], [width, height]])
                    .filter(() => d3.event.button == 2 || d3.event.type == 'wheel')
                    .on("zoom", zoomed)
                    .on('end', zoomended))
                    .on('click', function () {
                        if (d3.event.defaultPrevented) return; // click suppressed
                        var coords = d3.mouse(this);
                        var point_time = xt.invert(coords[0]);
                        scope.$emit('BEGIN_SELECTION', point_time);
                    })
                    .call(drag);

                scope.$on('UPDATEPLAY', function (e, time) {
                    scope.play_begin = time;
                    annotation_playline.attr('x1', xt(time))
                        .attr('x2', xt(time));
                });

                function zoomFunc(transform) {
                    transform.x = Math.min(transform.x, 0);
                    xt = transform.rescaleX(x);
                    annotation_x_function = d => xt(d.begin);
                    annotation_vis.select('.xaxis').call(xaxis.scale(xt));
                    annotation_playline.attr("x1", xt(scope.selection_begin))
                        .attr("x2", xt(scope.selection_begin));

                    if (selection_rect.attr('opacity') != 0) {
                        selection_rect.attr('x', xt(scope.selection_begin))
                            .attr('width', xt(scope.selection_end) - xt(scope.selection_begin));
                    }
                    if (selected_annotation_rect.attr('opacity') != 0) {
                        selected_annotation_rect.attr('x', xt(scope.selectedAnnotation.begin))
                            .attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                    }
                    drawAnnotations();
                }

                function zoomed() {
                    scope.$emit('ZOOM_REQUESTED', d3.event.transform);
                }

                scope.$on('ZOOM', function (e, lastTransform) {
                    zoomFunc(lastTransform);
                });

                function zoomended() {
                    var e = d3.event.sourceEvent;
                    if (e != null && e.button == 0 && e.movementX < 10) {
                        var coords = d3.mouse(this);
                        selection_begin = xt.invert(coords[0]);
                        annotation_playline.attr("x1", xt(selection_begin))
                            .attr("x2", xt(selection_begin));
                    }
                }

                function updateAnnotations() {
                    ['phone', 'syllable', 'word'].forEach(tier => {
                        var tier_items = annotation_viewplot.selectAll('g.annotation.'+tier)
                            .data(scope.data[tier], d => d.id);

                        tier_items.exit().remove();
                        tier_items = tier_items.enter().append('g');
                        tier_items.classed("annotation", true)
                              .classed(tier, true);
                        tier_items.append("rect")
                            .attr("x", annotation_x_function)
                            .attr("stroke", 'black')
                            .attr('fill-opacity', 0)
                            .attr("width", d => xt(d.end) - xt(d.begin));
                        tier_items.append("text")
                            .style("text-anchor", "middle")
                            .text(d => d.label);
                    });

                    scope.data.subannotations.forEach(x => {
                        var annotation_type = x[0];
                        var subannotation = x[1];
                        subannotation_items = annotation_viewplot
                            .selectAll('g.annotation.'+subannotation)
                            .data(scope.data.viewableSubannotations.filter(d => d[0] == x[0] && d[1] == x[1]).length > 0 
                                  ? scope.data[annotation_type].map(x => x[subannotation]).flat()
                                  : [], d => d.id)
                            //apologies

                        subannotation_items.exit().remove();
                        subannotation_items.enter().append('g')
                            .classed("annotation", true)
                            .classed(subannotation, true)
                            .append("rect")
                            .attr("x", annotation_x_function)
                            .attr('fill-opacity', 0)
                            .attr("stroke", 'black')
                            .attr("width", d => xt(d.end) - xt(d.begin));
                    });
                    drawAnnotations();
                }
            }
        }
    })
    .directive('waveformPlot', function ($window) {

        return {
            restrict: 'E',
            replace: true,
            template: '<div class="chart"></div>',
            controllerAs: 'ctrl',
            scope: {
                height: '=height',
                data: '=data',
                begin: '=',
                end: "=",
                selectedAnnotation: "=",
                hovered: '&hovered',
                seekFn: '&seekFn',
                selectEndUpdateFn: '&selectEndUpdateFn',
                playFn: '&playFn'
            },
            link: function (scope, element, attrs) {
                scope.selection_begin = 0;
                scope.selection_end = 0;
                scope.play_begin = 0;
                var vis = d3.select(element[0]);
                var width = parseInt(vis.style('width'), 10) - margin.left - margin.right;
                var height = parseInt(vis.style('height'), 10) - margin.top - margin.bottom;

        // react on right-clicking
                vis.on("contextmenu",() => d3.event.preventDefault());

                var x = d3.scaleLinear().range([0, width]).nice();
                var y = d3.scaleLinear().range([height, 0]).nice();

                var xt = x;

                function resize() {
                    width = parseInt(vis.style('width'), 10);
                    width = width - margin.left - margin.right;

                    height = parseInt(vis.style('height'), 10);
                    height = height - margin.top - margin.bottom;
                    console.log('RESiZE WIDTH', width)
                    y.range([height, 0]);
                    x.range([0, width]);
                    xt.range([0, width]);
                    vis.select('svg')
                        .style('height', (height + margin.top + margin.bottom) + 'px')
                        .style('width', (width + margin.left + margin.right) + 'px');
                    vis.select('#waveform_clip').select('rect')
                        .attr("height", height)
                        .attr("width", width);
                    vis.select('.pane')
                        .attr("height", height)
                        .attr("width", width);
                    vis.select('.xaxis')
                        .attr("transform", "translate(0," + height + ")").call(xaxis);
                    vis.select('.yaxis').call(yaxis);
                    vis.select('.playline')
                        .attr("y1", 0)
                        .attr("y2", height)
                        .attr("x1", xt(scope.play_begin))
                        .attr("x2", xt(scope.play_begin));

                    vis.select('.yaxis-label')
                        .attr("x", 0 - height / 2)

                    if (selection_rect.attr('opacity') != 0) {
                        selection_rect.attr('x', xt(scope.selection_begin))
                            .attr('width', xt(scope.selection_end) - xt(scope.selection_begin));
                    }
                    if (scope.selectedAnnotation) {
                        selected_annotation_rect.attr('opacity', 0.3)
                            .attr('x', xt(scope.selectedAnnotation.begin))
                            .attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                    }
                    vis.select('.line')
                       .attr('d',d => waveform_valueline(d));
                }

                angular.element($window).bind('resize', resize);

                var xaxis = d3.axisBottom(x)
                        .ticks(10);

                var zoom_scales = [1, 30];
                var waveform_padding = (y.domain()[1] - y.domain()[0]) * 0.05;
                y.domain([y.domain()[0] - waveform_padding, y.domain()[1] + waveform_padding]);

                var waveform_valueline = d3.line()
                    .x(d => x(d.time))
                    .y(d => y(d.amplitude));

                var waveform_x_function = d => x(d.time);
                var yaxis = d3.axisLeft(y)
                    .ticks(5);

                var waveform_vis = vis
                    .append("svg")
                    .style('height', (height + margin.top + margin.bottom) + 'px')
                    .style('width', (width + margin.left + margin.right) + 'px')
                    .append("g")
                    .attr("transform", `translate(${margin.left},${ margin.top})`);

// Draw the Plotting region------------------------------
// X axis lines (bottom and top).
                waveform_vis.append("g")
                    .attr("class", "xaxis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xaxis);

                waveform_vis.append("g")
                    .attr("class", "yaxis")
                    .call(yaxis);

                waveform_vis.append("text")
                    .attr('class', 'yaxis-label')
                    .attr("x", 0 - height / 2)
                    .attr("y", -margin.left + 20)
                    .attr("transform", "rotate(-90)")
                    .style("text-anchor", "middle")
                    .style("font-size", "16px")
                    .text("Amplitude");


// End Draw the Plotting region------------------------------


                waveform_vis.append("clipPath")
                    .attr("id", "waveform_clip")
                    .append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", width)
                    .attr("height", height);

                var waveform_viewplot = waveform_vis.append("g").attr("clip-path", "url(#waveform_clip)");

                var waveform_playline = waveform_viewplot.append('line').attr("class", "playline").style("stroke", "red")
                    .attr("x1", xt(0))
                    .attr("x2", xt(0))
                    .attr("y1", 0)
                    .attr("y2", height);

                var waveform_pane = waveform_vis.append("rect")
                    .attr("class", "pane")
                    .attr("width", width)
                    .attr("height", height);

                var selection_rect = waveform_viewplot.append("rect")
                    .attr('class', "selection")
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', 0)
                    .attr('height', height)
                    .attr('fill', 'red')
                    .attr('opacity', 0);

                var selected_annotation_rect = waveform_viewplot.append("rect")
                    .attr('class', "selected-annotation")
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', 0)
                    .attr('height', height)
                    .attr('fill', 'yellow')
                    .attr('opacity', 0);

                scope.$watch('begin', function (newVal, oldVal) {
                    if (!newVal) return;
                    x.domain([newVal, x.domain()[1]]);
                });

                scope.$watch('end', function (newVal, oldVal) {
                    if (!newVal) return;
                    x.domain([x.domain()[0], newVal]);
                });


                scope.$watch('data', function (newVal, oldVal) {
                    if (!newVal) return;

                    y.domain(d3.extent(newVal, d => d.amplitude));
                    waveform_vis.select('.xaxis').call(xaxis.scale(xt));
                    waveform_vis.select('.yaxis').call(yaxis.scale(y));
                    if (scope.selectedAnnotation) {
                        selected_annotation_rect.attr('opacity', 0.3)
                            .attr('x', xt(scope.selectedAnnotation.begin))
                            .attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                    }

// Make x axis


                    waveform_viewplot.append("path")
                        .data([newVal])
                        .attr("class", "line")
                        .attr('d', d => waveform_valueline(d))
                        .style('stroke', 'black');
                });

                var drag = d3.drag()
                    .filter(() => d3.event.button == 0)
                    .on("start", function () {
                        var coords = d3.mouse(this);
                        var point_time = xt.invert(coords[0]);
                        scope.$emit('BEGIN_SELECTION', point_time);
                    })
                    .on("drag", function () {
                        var p = d3.mouse(this);
                        var point_time = xt.invert(p[0]);
                        scope.$emit('UPDATE_SELECTION', point_time);
                    });


                scope.$on('SELECTION_UPDATE', function (e, selection_begin, selection_end) {
                    scope.selection_begin = selection_begin;
                    scope.selection_end = selection_end;
                    scope.play_begin = selection_begin;
                    waveform_playline.attr("x1", xt(selection_begin))
                        .attr("x2", xt(selection_begin));
                    if (selection_end == null) {
                        waveform_viewplot.select("rect.selection")
                            .attr('opacity', 0);
                    }
                    else {
                        waveform_viewplot.select("rect.selection")
                            .attr('opacity', 0.3)
                            .attr('x', xt(selection_begin))
                            .attr('width', xt(selection_end) - xt(selection_begin));
                    }
                });

                waveform_vis.call(d3.zoom()
                    .scaleExtent(zoom_scales)
                    .translateExtent([[0, 0], [width, height]])
                    .extent([[0, 0], [width, height]])
                    .filter(() => d3.event.button == 2 || d3.event.type == 'wheel')
                    .on("zoom", zoomed)
                    .on('end', zoomended))
                    .on('click', function () {
                        if (d3.event.defaultPrevented) return; // click suppressed
                        var coords = d3.mouse(this);
                        var point_time = xt.invert(coords[0]);
                        scope.$emit('BEGIN_SELECTION', point_time);
                    })
                    .call(drag);

                scope.$on('UPDATEPLAY', function (e, time) {
                    scope.play_begin = time;
                    waveform_playline.attr('x1', xt(time))
                        .attr('x2', xt(time));
                });

                function zoomFunc(transform) {
                    var selection_begin = xt.invert(waveform_playline.attr("x1"));
                    if (selection_rect.attr('opacity') != 0) {
                        var selection_end = xt.invert(parseFloat(selection_rect.attr('width')) + parseFloat(selection_rect.attr('x')))
                    }
                    transform.x = Math.min(transform.x, 0);
                    xt = transform.rescaleX(x);

                    waveform_vis.select('.xaxis').call(xaxis.scale(xt));

                    waveform_valueline = d3.line()
                        .x(d => xt(d.time))
                        .y(d => y(d.amplitude));

                    waveform_playline.attr("x1", xt(selection_begin))
                        .attr("x2", xt(selection_begin));

                    if (selection_rect.attr('opacity') != 0) {
                        selection_rect.attr('x', xt(selection_begin))
                            .attr('width', xt(selection_end) - xt(selection_begin));
                    }
                    if (selected_annotation_rect.attr('opacity') != 0) {
                        selected_annotation_rect.attr('x', xt(scope.selectedAnnotation.begin))
                            .attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                    }
                    drawWaveform();
                }

                function zoomed() {
                    scope.$emit('ZOOM_REQUESTED', d3.event.transform);
                }

                scope.$on('ZOOM', function (e, lastTransform) {
                    zoomFunc(lastTransform);
                });

                function zoomended() {
                    var e = d3.event.sourceEvent;
                    if (e != null && e.button == 0 && e.movementX < 10) {
                        var coords = d3.mouse(this);
                        selection_begin = xt.invert(coords[0]);
                        waveform_playline.attr("x1", xt(selection_begin))
                            .attr("x2", xt(selection_begin));
                    }
                }

                function drawWaveform() {
                    waveform_vis.select('.yaxis').call(yaxis);
                    waveform_vis.selectAll("path.line")
                        .attr('d', d => waveform_valueline(d));
                }
            }
        }
    }).directive('spectrogramPlot', function ($window) {

    return {
        restrict: 'E',
        replace: true,
        template: '<div class="chart"></div>',
        controllerAs: 'ctrl',
        scope: {
            height: '=height',
            data: '=data',
            begin: '=',
            end: '=',
            hovered: '&hovered'
        },
        link: function (scope, element, attrs) {
            scope.selection_begin = 0;
            scope.selection_end = 0;
            scope.play_begin = 0;
            var vis = d3.select(element[0]);
            var width = parseInt(vis.style('width'), 10) - margin.left - margin.right;
            height = parseInt(vis.style('height'), 10) - margin.top - margin.bottom;
            console.log(width)
            var specgram_context, xGridSize, yGridSize;

            // react on right-clicking
            vis.on("contextmenu", () => d3.event.preventDefault());

            var x = d3.scaleLinear().range([0, width]).nice();

            var zoom_scales = [1, 30];
            var xaxis = d3.axisBottom(x)
                .ticks(10);
            var xt = x;
            var y = d3.scaleLinear().range([height, 0]),
                z = d3.scaleLinear().range(["white", "black"]);

            var yaxis = d3.axisLeft(y)
                .ticks(5);


            var specgram_svg = vis.append('svg')
                .attr('class', 'combined')
                .style('height', (height + margin.top + margin.bottom) + 'px')
                .style('width', (width + margin.left + margin.right) + 'px')
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            var specgram_canvas = vis.append("canvas")
                .attr('class', 'combined')
                .style("padding", margin.top + "px " + margin.right + "px " + margin.bottom + "px " + margin.left + "px ")
                .attr("width", width + "px")
                .attr("height", height + "px");


            specgram_svg.append("g")
                .attr("class", "xaxis")
                .attr("transform", "translate(0," + height + ")")
                .call(xaxis)
                .append("text")
                .attr("class", "label")
                .attr("x", width / 2)
                .attr("y", margin.bottom - 10)
                .style("text-anchor", "middle")
                .text("Time (s)");

            specgram_svg.append("g")
                .attr("class", "yaxis")
                .call(yaxis)
                .append("text")
                .attr("class", "label")
                .attr("x", 0 - height / 2)
                .attr("y", -margin.left + 20)
                .style("text-anchor", "middle")
                .attr("transform", "rotate(-90)")
                .style("font-size", "16px")
                .text("Frequency (Hz)");

            function drawSpectrogram() {
                vis.select('.yaxis').call(yaxis);
                scope.data.values.forEach(drawRect);
            }

            function drawRect(d) {
                var begin = xt.invert(0);
                var end = xt.invert(width);
                //Draw the rectangle
                if (d.time >= begin - 0.01 && d.time <= end + 0.01) {
                    specgram_context.fillStyle = z(d.power);
                    specgram_context.fillRect(x(d.time), y(d.frequency), xGridSize + 2, yGridSize);
                }
            }

            function resize() {
                width = parseInt(vis.style('width'), 10);
                width = width - margin.left - margin.right;
                height = parseInt(vis.style('height'), 10);
                height = height - margin.top - margin.bottom;
                console.log('RESiZE WIDTH', width)
                x.range([0, width]);
                y.range([height, 0]);
                xt.range([0, width]);
                vis.select('svg')
                    .style('height', (height + margin.top + margin.bottom) + 'px')
                    .style('width', (width + margin.left + margin.right) + 'px');
                vis.select('#annotation_clip').select('rect')
                    .attr("height", height)
                    .attr("width", width);
                vis.select('svg.combined')
                    .attr("height", height)
                    .attr("width", width);
                vis.select('canvas.combined')
                    .attr("height", height + "px")
                    .attr("width", width + "px");
                vis.select('.xaxis')
                    .attr("transform", `translate(0,${height})`).call(xaxis);
                vis.select('.yaxis').call(yaxis);
                drawSpectrogram();
            }

            angular.element($window).bind('resize', resize);

            scope.$watch('begin', function (newVal, oldVal) {
                if (!newVal) return;
                x.domain([newVal, x.domain()[1]]);
            });

            scope.$watch('end', function (newVal, oldVal) {
                if (!newVal) return;
                x.domain([x.domain()[0], newVal]);
            });

            scope.$watch('data', function (newVal, oldVal) {
                if (!newVal) return;

                // Make x axis
                y.domain(d3.extent(newVal.values, d => d.frequency));
                y.domain([y.domain()[0], y.domain()[1] + newVal.freq_step]);
                z.domain(d3.extent(newVal.values, d => d.power));


                specgram_context = specgram_canvas.node().getContext("2d");

                xGridSize = x(newVal.time_step) - x(0) + 2;
                yGridSize = y(newVal.freq_step) - y(0) - 2;

                specgram_canvas.call(d3.zoom()
                    .scaleExtent(zoom_scales)
                    .translateExtent([[0, 0], [width, height]])
                    .extent([[0, 0], [width, height]])
                    .filter(() => d3.event.button == 2 || d3.event.type == 'wheel')
                    .on("zoom", zoomed))
                    .call(drag);

                drawSpectrogram();
            });

            function zoomFunc(lastTransform) {
                lastTransform.x = Math.min(lastTransform.x, 0);
                xt = lastTransform.rescaleX(x);
                specgram_svg.select('.xaxis').call(xaxis.scale(xt));
                specgram_context.save();
                specgram_context.clearRect(0, 0, width, height);
                specgram_context.translate(lastTransform.x, 0);
                specgram_context.scale(lastTransform.k, 1);
                drawSpectrogram();
                specgram_context.restore();
            }

            function zoomed() {
                scope.$emit('ZOOM_REQUESTED', d3.event.transform);
            }

            scope.$on('ZOOM', function (e, res) {
                zoomFunc(res);
            });

            var drag = d3.drag()
                .filter(() => d3.event.button == 0)
                .on("start", function () {
                    var coords = d3.mouse(this);
                    var point_time = xt.invert(coords[0] - margin.left);
                    scope.$emit('BEGIN_SELECTION', point_time);
                })
                .on("drag", function () {
                    var p = d3.mouse(this);
                    var point_time = xt.invert(p[0] - margin.left);
                    scope.$emit('UPDATE_SELECTION', point_time);
                });
        }
    }
});
