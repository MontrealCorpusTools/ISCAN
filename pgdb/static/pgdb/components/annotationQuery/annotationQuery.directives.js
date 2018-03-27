angular.module('pgdb.annotationQuery').filter('secondsToDateTime', [function () {
    return function (seconds) {
        return new Date(1970, 0, 1).setSeconds(seconds);
    };
}])
    .directive('annotationPlot', function () {

        var margin = {top: 40, right: 30, bottom: 40, left: 90},
            height = 150;
        var width = 900;
        return {
            restrict: 'E',
            replace: true,
            templateUrl: static('pgdb/components/annotationQuery/annotation_plot.html'),

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
                var vis = d3.select(element[0]).select('.plot');

                vis.on("contextmenu", function (d, i) {
                    d3.event.preventDefault();
                    // react on right-clicking
                });
                var x = d3.scaleLinear().range([0, width]).nice();

                var xt = x;

// Make x axis
                var xaxis = d3.axisBottom(x)
                    .ticks(10);

                var zoom_scales = [1, 30];
                var annotation_y = d3.scaleLinear().range([height, 0]).nice();
                annotation_y.domain([0, 3]);

                var annotation_x_function = function (d) {
                    return x(d.begin);
                };
                var annotation_yaxis = d3.axisLeft(annotation_y)
                    .tickValues([0.5, 1.5, 2.5])
                    .tickFormat(function (d) {
                        if (d === 0.5) {
                            return 'Phone'
                        }
                        if (d === 1.5) {
                            return 'Syllable'
                        }
                        if (d === 2.5) {
                            return 'Word'
                        }
                    });

                var annotation_vis = vis
                    .append("svg")
                    .attr("width", width + margin.right + margin.left)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Draw the Plotting region------------------------------
// X axis lines (bottom and top).
                annotation_vis.append("g")
                    .attr("class", "xaxis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xaxis);

                annotation_vis.append("g")
                    .attr("class", "yaxis")
                    .call(annotation_yaxis);

                annotation_vis.append("text")
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

                var annotation_playline = annotation_viewplot.append('line').attr("class", "playline").style("stroke", "red")
                    .attr("x1", xt(0))
                    .attr("y1", 0)
                    .attr("x2", xt(0))
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


                scope.$watch('data', function (newVal, oldVal) {
                    if (!newVal) {
                        return;
                    }
                    console.log('datachanged', newVal)
                    x.domain([newVal.begin, newVal.end]);
                    annotation_vis.select('.xaxis').call(xaxis.scale(xt));
                    if (scope.selectedAnnotation) {
                        selected_annotation_rect.attr('opacity', 0.3).attr('x', xt(scope.selectedAnnotation.begin)).attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                    }

                    var drag = d3.drag()
                        .filter(function () {
                            return event.button == 0;
                        })
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
                        annotation_playline.attr("x1", xt(selection_begin))
                            .attr("x2", xt(selection_begin));
                        if (selection_end == null) {
                            annotation_viewplot.select("rect.selection").attr('opacity', 0);
                        }
                        else {
                            annotation_viewplot.select("rect.selection").attr('opacity', 0.3).attr('x', xt(selection_begin)).attr('width', xt(selection_end) - xt(selection_begin));
                        }
                    });

                    annotation_vis.call(d3.zoom()
                        .scaleExtent(zoom_scales)
                        .translateExtent([[0, 0], [width, height]])
                        .filter(function () {
                            return event.button == 2 || event.type == 'wheel';
                        })
                        .on("zoom", zoomed)
                        .on('end', zoomended))
                    //.on("mousedown.zoom", null)
                    //.on("touchstart.zoom", null)
                    //.on("touchmove.zoom", null)
                    //.on("touchend.zoom", null)
                        .on('click', function () {
                            if (d3.event.defaultPrevented) return; // click suppressed
                            var coords = d3.mouse(this);
                            var point_time = xt.invert(coords[0]);
                            scope.$emit('BEGIN_SELECTION', point_time);

                        })
                        .call(drag);
                    scope.$on('UPDATEPLAY', function (e, time) {

                        annotation_playline.attr('x1', xt(time))
                            .attr('x2', xt(time));
                    });

                    function zoomFunc(transform) {
                        var selection_begin = xt.invert(annotation_playline.attr("x1"));
                        if (selection_rect.attr('opacity') != 0) {
                            var selection_end = xt.invert(parseFloat(selection_rect.attr('width')) + parseFloat(selection_rect.attr('x')))
                        }
                        transform.x = Math.min(transform.x, 0);
                        xt = transform.rescaleX(x);
                        annotation_x_function = function (d) {
                            return xt(d.begin);
                        };
                        annotation_vis.select('.xaxis').call(xaxis.scale(xt));

                        annotation_playline.attr("x1", xt(selection_begin))
                            .attr("x2", xt(selection_begin));

                        if (selection_rect.attr('opacity') != 0) {
                            selection_rect.attr('x', xt(selection_begin)).attr('width', xt(selection_end) - xt(selection_begin));
                        }
                        if (selected_annotation_rect.attr('opacity') != 0) {
                            selected_annotation_rect.attr('x', xt(scope.selectedAnnotation.begin)).attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
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

                    var boxes = annotation_viewplot;

                    function updateAnnotations() {
                        boxes.selectAll('g.annotation').remove();


                        var b = boxes.selectAll('g.annotation.phone').data(newVal.phone)
                            .enter().append("g");
                        b.append("rect")
                            .classed("annotation", true)
                            .classed("phone", true)
                            .attr("x", annotation_x_function)
                            .attr("stroke", 'black')
                            .attr('fill-opacity', 0)
                            .attr("width", function (d) {
                                return xt(d.end) - xt(d.begin)
                            });
                        b.append("text")
                            .classed("annotation", true)
                            .classed("phone", true)
                            .style("text-anchor", "middle")
                            .text(function (d) {
                                return d.label
                            });
                        b = boxes.selectAll('g.annotation.syllable').data(newVal.syllable)
                            .enter().append("g");
                        b.append("rect")
                            .classed("annotation", true)
                            .classed("syllable", true)
                            .attr("x", annotation_x_function)
                            .attr('fill-opacity', 0)
                            .attr("stroke", 'black')
                            .attr("width", function (d) {
                                return xt(d.end) - xt(d.begin)
                            });
                        b.append("text")
                            .classed("annotation", true)
                            .classed("syllable", true)
                            .style("text-anchor", "middle")
                            .text(function (d) {
                                return d.label
                            });
                        b = boxes.selectAll('g.annotation.word').data(newVal.word)
                            .enter().append("g");
                        b.append("rect")
                            .classed("annotation", true)
                            .classed("word", true)
                            .attr("x", annotation_x_function)
                            .attr('fill-opacity', 0)
                            .attr("stroke", 'black')
                            .attr("width", function (d) {
                                return xt(d.end) - xt(d.begin)
                            });
                        b.append("text")
                            .classed("annotation", true)
                            .classed("word", true)
                            .style("text-anchor", "middle")
                            .text(function (d) {
                                return d.label
                            });

                        drawAnnotations();
                    }

                    updateAnnotations();

                    function drawAnnotations() {
                        annotation_vis.select('.yaxis').call(annotation_yaxis);

                        annotation_vis.selectAll("rect.annotation")
                            .attr("height", function (d) {
                                return annotation_y(1) - annotation_y(2)
                            })
                            .attr("x", annotation_x_function)
                            .attr("width", function (d) {
                                return xt(d.end) - xt(d.begin)
                            });

                        annotation_vis.selectAll("text.annotation")
                            .attr("x", function (d) {
                                return (xt(d.end) - xt(d.begin)) / 2 + xt(d.begin)
                            });


                        annotation_vis.selectAll("rect.phone")
                            .attr("y", function (d) {
                                return annotation_y(1)
                            });

                        annotation_vis.selectAll("text.phone")
                            .attr("y", function (d) {
                                return annotation_y(0.5)
                            });


                        annotation_vis.selectAll("rect.syllable")
                            .attr("y", function (d) {
                                return annotation_y(2)
                            });

                        annotation_vis.selectAll("text.syllable")
                            .attr("y", function (d) {
                                return annotation_y(1.5)
                            });


                        annotation_vis.selectAll("rect.word")
                            .attr("y", function (d) {
                                return annotation_y(3)
                            });

                        annotation_vis.selectAll("text.word")
                            .attr("y", function (d) {
                                return annotation_y(2.5)
                            });

                    }
                });
            }
        }
    })
    .directive('waveformPlot', function () {

        var margin = {top: 40, right: 30, bottom: 40, left: 90},
            height = 300;
        var width = 900;

        return {
            restrict: 'E',
            replace: true,
            templateUrl: static('pgdb/components/annotationQuery/waveform_plot.html'),

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
                var vis = d3.select(element[0]).select('.plot');

                vis.on("contextmenu", function (d, i) {
                    d3.event.preventDefault();
                    // react on right-clicking
                });
                var x = d3.scaleLinear().range([0, width]).nice();

                var xt = x;
                var xaxis = d3.axisBottom(x)
                        .ticks(10);

                    var zoom_scales = [1, 30];
                    var waveform_y = d3.scaleLinear().range([height, 0]).nice();
                    var waveform_padding = (waveform_y.domain()[1] - waveform_y.domain()[0]) * 0.05;
                    waveform_y.domain([waveform_y.domain()[0] - waveform_padding, waveform_y.domain()[1] + waveform_padding]);

                    var waveform_valueline = d3.line()
                        .x(function (d) {
                            return x(d.time);
                        }).y(function (d) {
                            return waveform_y(d.amplitude);
                        });

                    var waveform_x_function = function (d) {
                        return x(d.time);
                    };
                    var waveform_yaxis = d3.axisLeft(waveform_y)
                        .ticks(5);

                    var waveform_vis = vis
                        .append("svg")
                        .attr("width", width + margin.right + margin.left)
                        .attr("height", height + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Draw the Plotting region------------------------------
// X axis lines (bottom and top).
                    waveform_vis.append("g")
                        .attr("class", "xaxis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(xaxis);

                    waveform_vis.append("g")
                        .attr("class", "yaxis")
                        .call(waveform_yaxis);

                    waveform_vis.append("text")
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
                        .attr("y1", 0)
                        .attr("x2", xt(0))
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
                    if (!newVal) {
                        return;
                    }
                    x.domain([newVal, x.domain()[1]]);
                });

                scope.$watch('end', function (newVal, oldVal) {
                    if (!newVal) {
                        return;
                    }
                    x.domain([x.domain()[0], newVal]);
                });


                scope.$watch('data', function (newVal, oldVal) {
                    if (!newVal) {
                        return;
                    }
                    waveform_y.domain(d3.extent(newVal, function (d) {
                        return d.amplitude;
                    }));
                    waveform_vis.select('.xaxis').call(xaxis.scale(xt));
                    waveform_vis.select('.yaxis').call(waveform_yaxis.scale(waveform_y));
                    if (scope.selectedAnnotation) {
                        selected_annotation_rect.attr('opacity', 0.3).attr('x', xt(scope.selectedAnnotation.begin)).attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                    }

// Make x axis


                    waveform_viewplot.append("path")
                        .attr("class", "line").data([newVal]).attr('d', function (d) {
                        return waveform_valueline(d);
                    })
                        .style('stroke', 'black');

                    var drag = d3.drag()
                        .filter(function () {
                            return event.button == 0;
                        })
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
                        waveform_playline.attr("x1", xt(selection_begin))
                            .attr("x2", xt(selection_begin));
                        if (selection_end == null) {
                            waveform_viewplot.select("rect.selection").attr('opacity', 0);
                        }
                        else {
                            waveform_viewplot.select("rect.selection").attr('opacity', 0.3).attr('x', xt(selection_begin)).attr('width', xt(selection_end) - xt(selection_begin));
                        }
                    });

                    waveform_vis.call(d3.zoom()
                        .scaleExtent(zoom_scales)
                        .translateExtent([[0, 0], [width, height]])
                        .filter(function () {
                            return event.button == 2 || event.type == 'wheel';
                        })
                        .on("zoom", zoomed)
                        .on('end', zoomended))
                    //.on("mousedown.zoom", null)
                    //.on("touchstart.zoom", null)
                    //.on("touchmove.zoom", null)
                    //.on("touchend.zoom", null)
                        .on('click', function () {
                            if (d3.event.defaultPrevented) return; // click suppressed
                            var coords = d3.mouse(this);
                            var point_time = xt.invert(coords[0]);
                            scope.$emit('BEGIN_SELECTION', point_time);

                        })
                        .call(drag);
                    scope.$on('UPDATEPLAY', function (e, time) {

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
                            .x(function (d) {
                                return xt(d.time);
                            })
                            .y(function (d) {
                                return waveform_y(d.amplitude);
                            });
                        waveform_playline.attr("x1", xt(selection_begin))
                            .attr("x2", xt(selection_begin));

                        if (selection_rect.attr('opacity') != 0) {
                            selection_rect.attr('x', xt(selection_begin)).attr('width', xt(selection_end) - xt(selection_begin));
                        }
                        if (selected_annotation_rect.attr('opacity') != 0) {
                            selected_annotation_rect.attr('x', xt(scope.selectedAnnotation.begin)).attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
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
                        waveform_vis.select('.yaxis').call(waveform_yaxis);
                        waveform_vis.selectAll("path.line")
                            .attr('d', function (d) {
                                return waveform_valueline(d);
                            });
                    }
                });
            }
        }
    }).directive('spectrogramPlot', function () {

    var margin = {top: 0, right: 45, bottom: 40, left: 90},
        height = 300;
    var width = 900;
    return {
        restrict: 'E',
        replace: true,
        templateUrl: static('pgdb/components/annotationQuery/spectrogram_plot.html'),
        scope: {
            height: '=height',
            data: '=data',
            begin: '=',
            end: '=',
            hovered: '&hovered'
        },
        link: function (scope, element, attrs) {
            var vis = d3.select(element[0]).select('.plot');

            vis.on("contextmenu", function (d, i) {
                d3.event.preventDefault();
                // react on right-clicking
            });

            var x = d3.scaleLinear().range([0, width]).nice();

            scope.$watch('begin', function (newVal, oldVal) {
                if (!newVal) {
                    return;
                }
                x.domain([newVal, x.domain()[1]]);
            });

            scope.$watch('end', function (newVal, oldVal) {
                if (!newVal) {
                    return;
                }
                x.domain([x.domain()[0], newVal]);
            });
            scope.$watch('data', function (newVal, oldVal) {
                vis.selectAll("*").remove();
                //pitch_viewplot.append('g').selectAll("circle.original").remove();
                if (!newVal) {
                    return;
                }

                // Make x axis
                var xaxis = d3.axisBottom(x)
                    .ticks(10);
                var xt = x;

                var zoom_scales = [1, 30];
                var specgram_y = d3.scaleLinear().range([height, 0]),
                    specgram_z = d3.scaleLinear().range(["white", "black"]);

                specgram_y.domain(d3.extent(newVal.values, function (d) {
                    return d.frequency;
                }));
                specgram_y.domain([specgram_y.domain()[0], specgram_y.domain()[1] + newVal.freq_step]);
                specgram_z.domain(d3.extent(newVal.values, function (d) {
                    return d.power;
                }));


                var specgram_yaxis = d3.axisLeft(specgram_y)
                    .ticks(5);


                var specgram_svg = vis.attr('height', height + margin.top + margin.bottom).append('svg')
                    .attr('class', 'combined')
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                var specgram_canvas = vis.append("canvas")
                    .attr('class', 'combined')
                    //.attr("x",  margin.left)
                    //.attr("y", margin.top)
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
                    .call(specgram_yaxis)
                    .append("text")
                    .attr("class", "label")
                    .attr("x", 0 - height / 2)
                    .attr("y", -margin.left + 20)
                    .style("text-anchor", "middle")
                    .attr("transform", "rotate(-90)")
                    .style("font-size", "16px")
                    .text("Frequency (Hz)");


                var specgram_context = specgram_canvas.node().getContext("2d");

                var xGridSize = x(newVal.time_step) - x(0) + 2,
                    yGridSize = specgram_y(newVal.freq_step) - specgram_y(0) - 2;

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

                var zoomed = function () {
                    scope.$emit('ZOOM_REQUESTED', d3.event.transform);


                };
                scope.$on('ZOOM', function (e, res) {
                    zoomFunc(res);
                });


                var drag = d3.drag()
                    .filter(function () {
                        return event.button == 0;
                    })
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
                specgram_canvas.call(d3.zoom()
                    .scaleExtent(zoom_scales)
                    .translateExtent([[0, 0], [width, height]])
                    .filter(function () {
                        return event.button == 2 || event.type == 'wheel';
                    })
                    .on("zoom", zoomed))
                    .call(drag);

                function drawSpectrogram() {
                    specgram_svg.select('.yaxis').call(specgram_yaxis);
                    newVal.values.forEach(drawRect);
                }

                function drawRect(d) {
                    var begin = xt.invert(0);
                    var end = xt.invert(width);
                    //Draw the rectangle
                    if (d.time >= begin - 0.01 && d.time <= end + 0.01) {
                        specgram_context.fillStyle = specgram_z(d.power);
                        specgram_context.fillRect(x(d.time), specgram_y(d.frequency), xGridSize + 2, yGridSize);
                    }
                }

                drawSpectrogram();

            });

        }
    }
}).directive('pitchPlot', function () {

    var margin = {top: 40, right: 30, bottom: 40, left: 90},
        height = 300;
    var width = 900;

    return {
        restrict: 'E',
        replace: true,
        templateUrl: static('pgdb/components/annotationQuery/pitch_plot.html'),
        scope: {
            height: '=height',
            utterance: '=utterance',
            selectedAnnotation: "=",
            editable: '=editable',
            hovered: '&hovered'
        },
        link: function (scope, element, attrs) {
            var vis = d3.select(element[0]).select('.plot');


            vis.on("contextmenu", function (d, i) {
                d3.event.preventDefault();
                // react on right-clicking
            });

            var x = d3.scaleLinear().range([0, width]).nice();
            var xt = x;
            var selection_begin, selection_end, selection_anchor;
            scope.savable = true;
            scope.save_pitch_text = 'Save pitch';
            scope.available_pitch_sources = ['praat', 'reaper'];
            scope.newPitchSettings = {};
            scope.newPitchSettings.source = 'praat';
            scope.newPitchSettings.min_pitch = 50;
            scope.newPitchSettings.max_pitch = 500;

                scope.generateNewTrack = function () {
                    scope.$emit('TRACK_REQUESTED', scope.newPitchSettings);
                    scope.save_pitch_text = 'Save pitch';
                };

                scope.saveTrack = function () {
                    if (scope.savable) {
                        scope.$emit('SAVE_TRACK', scope.utterance.pitch_track);
                        scope.save_pitch_text = 'Saving...';

                    }

                };
                scope.$on('SAVE_RESPONSE', function (e, res) {

                    if (res.data.success) {
                        scope.save_pitch_text = 'Saved!';
                    }
                    else {
                        scope.save_pitch_text = 'Error';
                    }
                });
                var div = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

                // Make x axis
                var xaxis = d3.axisBottom(x)
                    .ticks(10);

                var zoom_scales = [1, 30];
var pitch_y = d3.scaleLinear().range([height, 0]).nice();
                var pitch_padding = (pitch_y.domain()[1] - pitch_y.domain()[0]) * 0.05;
                pitch_y.domain([pitch_y.domain()[0] - pitch_padding, pitch_y.domain()[1] + pitch_padding]);

                var pitch_x_function = function (d) {
                    return x(d.time);
                };
                var pitch_valueline = d3.line()
                    .x(pitch_x_function).y(function (d) {
                        return pitch_y(d.F0);
                    });

                var pitch_yaxis = d3.axisLeft(pitch_y)
                    .ticks(5);

                var pitch_vis = vis
                    .append("svg")
                    .attr("width", width + margin.right + margin.left)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Draw the Plotting region------------------------------
// X axis lines (bottom and top).
                pitch_vis.append("g")
                    .attr("class", "xaxis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xaxis);

                pitch_vis.append("g")
                    .attr("class", "yaxis")
                    .call(pitch_yaxis);

                pitch_vis.append("text")
                    .attr("x", 0 - height / 2)
                    .attr("y", -margin.left + 20)
                    .attr("transform", "rotate(-90)")
                    .style("text-anchor", "middle")
                    .style("font-size", "16px")
                    .text("F0");

                pitch_vis.append("clipPath")
                    .attr("id", "pitch_clip")
                    .append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", width)
                    .attr("height", height);


                var pitch_viewplot = pitch_vis.append("g").attr("clip-path", "url(#pitch_clip)");

                var playline = pitch_viewplot.append('line').attr("class", "playline").style("stroke", "red")
                    .attr("x1", xt(0))
                    .attr("y1", 0)
                    .attr("x2", xt(0))
                    .attr("y2", height);

                var selection_rect = pitch_viewplot.append("rect")
                    .attr('class', "selection")
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', 0)
                    .attr('height', height)
                    .attr('fill', 'red')
                    .attr('opacity', 0);

                var selected_annotation_rect = pitch_viewplot.append("rect")
                    .attr('class', "selected-annotation")
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', 0)
                    .attr('height', height)
                    .attr('fill', 'yellow')
                    .attr('opacity', 0);


                var pitch_pane = pitch_vis.append("rect")
                    .attr("class", "pane")
                    .attr("width", width)
                    .attr("height", height);


            scope.$watch('utterance', function (newVal, oldVal) {
                //pitch_viewplot.append('g').selectAll("circle.original").remove();
                if (!newVal) {
                    return;
                }
                console.log(newVal);
                x.domain([newVal.begin, newVal.end]);
                    pitch_vis.select('.xaxis').call(xaxis.scale(xt));
                    if (scope.selectedAnnotation) {
                        selected_annotation_rect.attr('opacity', 0.3).attr('x', xt(scope.selectedAnnotation.begin)).attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                    }





                var zoomFunc = function (lastTransform) {
                    var selection_begin = xt.invert(playline.attr("x1"));
                    if (selection_rect.attr('opacity') != 0) {
                        var selection_end = xt.invert(parseFloat(selection_rect.attr('width')) + parseFloat(selection_rect.attr('x')))
                    }
                    lastTransform.x = Math.min(lastTransform.x, 0);
                    xt = lastTransform.rescaleX(x);
                    pitch_vis.select('.xaxis').call(xaxis.scale(xt));
                    pulse_x_function = function (d) {
                        return xt(d.time);
                    };
                    pitch_x_function = function (d) {
                        return xt(d.time);
                    };
                    pitch_valueline = pitch_valueline.x(pitch_x_function);
                    playline.attr("x1", xt(selection_begin))
                        .attr("x2", xt(selection_begin));

                    if (selection_rect.attr('opacity') != 0) {
                        selection_rect.attr('x', xt(selection_begin)).attr('width', xt(selection_end) - xt(selection_begin));
                    }
                        if (selected_annotation_rect.attr('opacity') != 0) {
                            selected_annotation_rect.attr('x', xt(scope.selectedAnnotation.begin)).attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                        }
                    drawPitchTrack();
                };

                var zoomed = function () {
                    scope.$emit('ZOOM_REQUESTED', d3.event.transform);


                };
                scope.$on('ZOOM', function (e, res) {
                    zoomFunc(res);
                });
                var drawPitchTrack = function () {
                    pitch_vis.select('.yaxis').call(pitch_yaxis);
                    pitch_vis.selectAll("path.line")
                        .attr('d', function (d) {
                            return pitch_valueline(d);
                        });
                    pitch_vis.selectAll('circle')
                        .attr("cx", pitch_x_function)
                        .attr("cy", function (d) {
                            return pitch_y(d.F0);
                        })
                        .on("mouseover", function (d) {
                            div.transition()
                                .duration(200)
                                .style("opacity", .9);
                            div.html(d.time + "<br/>" + d.F0.toFixed(2))
                                .style("left", (d3.event.pageX) + "px")
                                .style("top", (d3.event.pageY - 28) + "px");
                        })
                        .on("mouseout", function (d) {
                            div.transition()
                                .duration(500)
                                .style("opacity", 0);
                        });
                };



                var drag = d3.drag()
                    .filter(function () {
                        return event.button == 0;
                    })
                    .on("start", function () {
                        console.log('drag started!')
                        var coords = d3.mouse(this);
                        var point_time = xt.invert(coords[0]);
                        scope.$emit('BEGIN_SELECTION', point_time);
                    })
                    .on("drag", function () {
                        var p = d3.mouse(this);
                        var point_time = xt.invert(p[0]);
                        scope.$emit('UPDATE_SELECTION', point_time);
                    });
                pitch_vis.call(d3.zoom()
                    .scaleExtent(zoom_scales)
                    .translateExtent([[0, 0], [width, height]])
                    .filter(function () {
                        return event.button == 2 || event.type == 'wheel';
                    })
                    .on("zoom", zoomed))
                    .on('click', function () {
                        //if (d3.event.defaultPrevented) return; // click suppressed
                        var coords = d3.mouse(this);
                        var point_time = xt.invert(coords[0]);
                        scope.$emit('BEGIN_SELECTION', point_time);

                    })
                    .call(drag);

                var line = pitch_viewplot;
                var circles = pitch_viewplot;


                scope.$on('SELECTION_UPDATE', function (e, selection_begin, selection_end) {
                    playline.attr("x1", xt(selection_begin))
                        .attr("x2", xt(selection_begin));
                    pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected", false);
                    if (selection_end == null) {
                        selection_rect.attr('opacity', 0).attr('x', 0).attr('y', 0);
                    }
                    else {
                        selection_rect.attr('opacity', 0.3).attr('x', xt(selection_begin)).attr('width', xt(selection_end) - xt(selection_begin));
                        pitch_viewplot.selectAll('circle').filter(function (d) {
                            return (d.time >= selection_begin && d.time <= selection_end)
                        }).style("fill", 'red').classed('selected', true);
                    }
                });
                scope.$on('UPDATEPLAY', function (e, time) {

                    playline.attr('x1', xt(time))
                        .attr('x2', xt(time));
                });

                scope.$on('UPDATE_PITCH_TRACK', function (e, res) {
                    updateTrack();
                });

                function updateTrack() {
                    line.selectAll('path').remove();
                    line.append("path")
                        .attr("class", "line")
                        .classed("original", true).data([newVal.pitch_track]).attr('d', function (d) {
                        return pitch_valueline(d);
                    })
                        .style('stroke', 'blue');
                    circles.selectAll('circle').remove();
                    circles.selectAll('circle').data(newVal.pitch_track)
                        .enter().append("circle")
                        .classed("original", true)
                        .attr("r", 5)
                        .attr("cx", pitch_x_function)
                        .attr("cy", function (d) {
                            return pitch_y(d.F0);
                        })
                        .style("fill", 'blue')
                        .on("click", function () {
                            if (!d3.event.shiftKey) {
                                pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected", false);
                            }
                            d3.select(this).attr('class', 'selected').style("fill", "red");
                        });
                    pitch_y.domain(d3.extent(newVal.pitch_track, function (d) {
                        return d.F0;
                    }));
                    x.domain([newVal.begin, newVal.end]);
                    pitch_padding = (pitch_y.domain()[1] - pitch_y.domain()[0]) * 0.05;
                    pitch_y.domain([pitch_y.domain()[0] - pitch_padding, pitch_y.domain()[1] + pitch_padding]);
                    console.log(pitch_y.domain());
                    drawPitchTrack();
                }

                updateTrack();

                scope.doubleSelected = function () {
                    pitch_viewplot.selectAll('circle.selected').data().forEach(function (d) {
                        d['F0'] *= 2
                    });
                    pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected", false);

                    var new_domain = d3.extent(pitch_viewplot.selectAll('circle').data(), function (d) {
                        return d.F0;
                    });

                    pitch_padding = (new_domain[1] - new_domain[0]) * 0.05;
                    pitch_y.domain([new_domain[0] - pitch_padding, new_domain[1] + pitch_padding]);
                    drawPitchTrack();
                    scope.save_pitch_text = 'Save pitch';
                };

                scope.halveSelected = function () {
                    pitch_viewplot.selectAll('circle.selected').data().forEach(function (d) {
                        d['y'] /= 2
                    });
                    pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected", false);

                    var new_domain = d3.extent(pitch_viewplot.selectAll('circle').data(), function (d) {
                        return d.F0;
                    });

                    pitch_padding = (new_domain[1] - new_domain[0]) * 0.05;
                    pitch_y.domain([new_domain[0] - pitch_padding, new_domain[1] + pitch_padding]);
                    drawPitchTrack();
                    scope.save_pitch_text = 'Save pitch';
                };

                scope.smoothSelected = function () {
                    var all_data = pitch_viewplot.selectAll('circle').data();
                    pitch_viewplot.selectAll('circle.selected').data().forEach(function (d) {
                        var ind = all_data.findIndex(function (e) {
                            return e['time'] == d['time'];
                        });
                        if (ind != 0 && ind != all_data.length - 1) {
                            d['F0'] = (all_data[ind + 1]['F0'] - all_data[ind - 1]['F0']) / 2 + all_data[ind - 1]['F0'];
                        }
                    });
                    //pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected",false);

                    var new_domain = d3.extent(pitch_viewplot.selectAll('circle').data(), function (d) {
                        return d.F0;
                    });

                    pitch_padding = (new_domain[1] - new_domain[0]) * 0.05;
                    pitch_y.domain([new_domain[0] - pitch_padding, new_domain[1] + pitch_padding]);
                    drawPitchTrack();
                    scope.save_pitch_text = 'Save pitch';
                };

                scope.removeSelected = function () {
                    pitch_viewplot.selectAll('circle.selected').data().forEach(function (d) {
                        var ind = newVal.pitch_track.findIndex(function (e) {
                            return e['time'] == d['time'];
                        });
                        newVal.pitch_track.splice(ind, 1);
                    });
                    updateTrack();
                    pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected", false);
                };

                drawPitchTrack();
                scope.save_pitch_text = 'Save pitch';

            });

            scope.$watch('height', function (d, i) {

            })
        }
    }
}).directive('bestiaryPlot', function () {

    var margin = {top: 40, right: 30, bottom: 40, left: 90},
        height = 300;
    var width = 900;
    return {
        restrict: 'E',
        replace: true,
        template: '<div class="chart"></div>',
        scope: {
            height: '=height',
            data: '=data',
            hovered: '&hovered'
        },
        link: function (scope, element, attrs) {
            var vis = d3.select(element[0]);
            var x = d3.scaleLinear().range([0, width]).nice();
            // Adjusted Close
            var y = d3.scaleLinear().range([height, 0]).nice();

            // Make x axis
            var xaxis = d3.axisBottom()
                .scale(x)
                .ticks(10);

            // Make y axis
            var yaxis = d3.axisLeft()
                .scale(y)
                .ticks(5);

            var valueline = d3.line().defined(function (d) {
                return d.F0 != null;
            })
                .x(function (d) {
                    return x(d.time);
                })
                .y(function (d) {
                    return y(d.F0);
                });
            scope.$watch('data', function (newVal, oldVal) {
                vis.selectAll("*").remove();
                //pitch_viewplot.append('g').selectAll("circle.original").remove();
                if (!newVal) {
                    return;
                }
                y.domain([d3.min(newVal, function (d) {
                    return d3.min(d.utterance.pitch_track, function (d2) {
                        return d2.F0
                    });
                }), d3.max(newVal, function (d) {
                    return d3.max(d.utterance.pitch_track, function (d2) {
                        return d2.F0
                    });
                })]);
                var padding = (y.domain()[1] - y.domain()[0]) * 0.05;
                y.domain([y.domain()[0] - padding, y.domain()[1] + padding]);

                var svg = vis.append("svg")
                //responsive SVG needs these 2 attributes and no width and height attr
                //.attr("preserveAspectRatio", "xMinYMin meet")
                //.attr("viewBox", "0 0 600 400")
                //class to make it responsive
                //.classed("svg-content-responsive", true)
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                // x axis
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xaxis);

                // y axis
                svg.append("g")
                    .attr("class", "y axis")
                    .call(yaxis);

                var parameter = svg.selectAll(".parameter")
                    .data(newVal, function (d) {
                        return d.discourse.name;
                    })
                    .enter().append("g")
                    .attr("class", "parameter");

                parameter.append("path")
                    .attr("class", "line")
                    .attr("d", function (d) {
                        return valueline(d.utterance.pitch_track);
                    })
                    .style("stroke", "black")
                    .style("opacity", "0.3")
                    .on("mouseover", mouseover)
                    .on("mouseout", mouseout)
                    .on("click", click);
            });

            function click(d) {
                if (d3.event.shiftKey) {
                    scope.$emit('DETAIL_REQUESTED', d.utterance.id);
                }
                else {
                    scope.$emit('SOUND_REQUESTED', d.utterance.id);
                }
            }

            function mouseover(d, i) {

                d3.select(this).style("stroke", "red")
                    .style("opacity", "1");

            }

            function mouseout(d, i) {
                d3.select(this).style("stroke", "black")
                    .style("opacity", "0.3");

            }

        }
    }
});