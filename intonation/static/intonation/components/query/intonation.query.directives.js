angular.module('pgdb.query').filter('secondsToDateTime', [function () {
    return function (seconds) {
        return new Date(1970, 0, 1).setSeconds(seconds);
    };
}]).directive('pitchPlot', function ($window) {

    var margin = {top: 30, right: 10, bottom: 30, left: 70};

    return {
        restrict: 'E',
        replace: true,
        templateUrl: static('pgdb/components/query/pitch_plot.html'),
        scope: {
            height: '=height',
            utterance: '=utterance',
            selectedAnnotation: "=",
            editable: '=editable',
            hovered: '&hovered'
        },
        link: function (scope, element, attrs) {
                scope.selection_begin = 0;
                scope.selection_end = 0;
                scope.play_begin = 0;
            var vis = d3.select(element[0]).select('.chart');

                var width = parseInt(vis.style('width'), 10)
                    , width = width - margin.left - margin.right,
                 height = parseInt(vis.style('height'), 10)
                    , height = height - margin.top - margin.bottom;
                console.log('PITCH', width, height)
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
            function resize() {
                width = parseInt(vis.style('width'), 10);
                width = width - margin.left - margin.right;
                console.log('RESiZE WIDTH', width)
                x.range([0, width]);
                xt.range([0, width]);
                vis.select('svg')
                    .style('height', (height + margin.top + margin.bottom) + 'px')
                    .style('width', (width + margin.left + margin.right) + 'px');
                vis.select('#pitch_clip').select('rect')
                    .attr("height", height)
                    .attr("width", width);
                vis.select('.pane')
                    .attr("height", height)
                    .attr("width", width);
                vis.select('.xaxis')
                    .attr("transform", "translate(0," + height + ")").call(xaxis);
                vis.select('.yaxis').call(yaxis);
                vis.select('.playline')
                    .attr("x1", xt(scope.play_begin))
                    .attr("x2", xt(scope.play_begin));

                vis.select('.yaxis-label')
                .attr("x", 0 - height / 2);

                if (selection_rect.attr('opacity') != 0) {
                    selection_rect.attr('x', xt(scope.selection_begin)).attr('width', xt(scope.selection_end) - xt(scope.selection_begin));
                }
                if (scope.selectedAnnotation) {
                    selected_annotation_rect.attr('opacity', 0.3).attr('x', xt(scope.selectedAnnotation.begin)).attr('width', xt(scope.selectedAnnotation.end) - xt(scope.selectedAnnotation.begin));
                }

                vis.selectAll('circle')
                        .attr("cx", pitch_x_function)
                        .attr("cy", function (d) {
                            return pitch_y(d.F0);
                        });
                vis.selectAll('.line')
                        .attr('d', function (d) {
                            return pitch_valueline(d);
                        });


            }

            angular.element($window).bind('resize', resize);
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
                    .style('height', (height + margin.top + margin.bottom) + 'px')
                    .style('width', (width + margin.left + margin.right) + 'px')
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
                .attr('class', 'yaxis-label')
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
                    .extent([[0, 0], [width, height]])
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
                    scope.play_begin = selection_begin;
                    scope.selection_begin = selection_begin;
                    scope.selection_end = selection_end;
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
                    scope.play_begin = time;

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
                        d['F0'] /= 2
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
        }
    }
}).directive('bestiaryPlot', function ($window) {

    var margin = {top: 30, right: 10, bottom: 30, left: 30},
        height = 300;
    return {
        restrict: 'E',
        replace: true,
        template: '<div class="chart"></div>',
        scope: {
            height: '=',
            data: '=',
            title: '=',
            color: '=',
            config: '=',
            //max_lines: '=',
            hovered: '&hovered'
        },
        link: function (scope, element, attrs) {
            var vis = d3.select(element[0]);
            var width = parseInt(vis.style('width'), 10)
                , width = width - margin.left - margin.right;

            function resize() {
                width = parseInt(vis.style('width'), 10);
                width = width - margin.left - margin.right;
                console.log('RESiZE WIDTH', width)
                x.range([0, width]);
                vis.select('svg')
                    .style('height', (height + margin.top + margin.bottom) + 'px')
                    .style('width', (width + margin.left + margin.right) + 'px');
                vis.select('.xaxis').call(xaxis);
                vis.select('.yaxis').call(yaxis);
                vis.select('.title')
                    .attr("x", (width / 2));
                renderLines();
            }

            angular.element($window).bind('resize', resize);

            function renderLines() {

                vis.selectAll("path.line")
                    .attr("d", function (d) {
                        var data = d.utterance.current.pitch_track;

                        if (scope.config.relative_time) {
                            data = data.map(x => ({
                                time: (x.time - d.utterance.current.begin) / d.utterance.current.duration,
                                F0: x.F0, F0_relativized: x.F0_relativized
                            }));
                        }
                        if (scope.config.relative_pitch) {
                            valueline = d3.line().defined(function (d) {
                                return d.F0_relativized != null;
                            })
                                .x(function (d) {
                                    return x(d.time);
                                })
                                .y(function (d) {
                                    return y(d.F0_relativized);
                                });
                        }
                        else {
                            valueline = d3.line().defined(function (d) {
                                return d.F0 != null;
                            })
                                .x(function (d) {
                                    return x(d.time);
                                })
                                .y(function (d) {
                                    return y(d.F0);
                                });
                        }
                        return valueline(data);
                    });
            }

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

            var opacity = "0.5";

            // set the colour scale
            var color = d3.scaleOrdinal(d3.schemeCategory10);
            var color_property;
            var valueline = d3.line().defined(function (d) {
                return d.F0 != null;
            })
                .x(function (d) {
                    return x(d.time);
                })
                .y(function (d) {
                    return y(d.F0);
                });


            var plotDataSet = function (newVal) {
                if (scope.config.relative_pitch) {
                    valueline = d3.line().defined(function (d) {
                        return d.F0_relativized != null;
                    })
                        .x(function (d) {
                            return x(d.time);
                        })
                        .y(function (d) {
                            return y(d.F0_relativized);
                        });

                    y.domain([d3.min(newVal, function (d) {
                        return d3.min(d.utterance.current.pitch_track, function (d2) {
                            return d2.F0_relativized
                        });
                    }), d3.max(newVal, function (d) {
                        return d3.max(d.utterance.current.pitch_track, function (d2) {
                            return d2.F0_relativized
                        });
                    })]);
                }
                else {
                    valueline = d3.line().defined(function (d) {
                        return d.F0 != null;
                    })
                        .x(function (d) {
                            return x(d.time);
                        })
                        .y(function (d) {
                            return y(d.F0);
                        });
                    y.domain([d3.min(newVal, function (d) {
                        return d3.min(d.utterance.current.pitch_track, function (d2) {
                            return d2.F0
                        });
                    }), d3.max(newVal, function (d) {
                        return d3.max(d.utterance.current.pitch_track, function (d2) {
                            return d2.F0
                        });
                    })]);

                }


                if (scope.config.relative_time) {
                    x.domain([0, 1]);
                }
                else {

                    x.domain([d3.min(newVal, function (d) {
                        return d3.min(d.utterance.current.pitch_track, function (d2) {
                            return d2.time
                        });
                    }), d3.max(newVal, function (d) {
                        return d3.max(d.utterance.current.pitch_track, function (d2) {
                            return d2.time
                        });
                    })]);
                }
                console.log(x.domain(), y.domain())
                var padding = (y.domain()[1] - y.domain()[0]) * 0.05;
                y.domain([y.domain()[0] - padding, y.domain()[1] + padding]);

                var svg = vis.append("svg")
                //class to make it responsive
                //.classed("svg-content-responsive", true)
                    .style('height', (height + margin.top + margin.bottom) + 'px')
                    .style('width', (width + margin.left + margin.right) + 'px')
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                // x axis
                svg.append("g")
                    .attr("class", "xaxis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xaxis);

                // y axis
                svg.append("g")
                    .attr("class", "yaxis")
                    .call(yaxis);

                svg.append("text")
                    .attr("class", 'title')
                    .attr("x", (width / 2))
                    .attr("y", 0 - (margin.top / 2))
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .text(scope.title);

                var parameter = svg.selectAll(".parameter")
                    .data(newVal, function (d) {
                        return d.discourse.name;
                    })
                    .enter().append("g")
                    .attr("class", "parameter");

                parameter.append("path")
                    .attr("class", "line")
                    .attr("d", function (d) {
                        var data = d.utterance.current.pitch_track;
                        if (scope.config.relative_time) {
                            data = data.map(x => ({
                                time: (x.time - d.utterance.current.begin) / d.utterance.current.duration,
                                F0: x.F0, F0_relativized: x.F0_relativized
                            }));
                        }
                        return valueline(data);
                    })
                    .style("stroke", function (d) { // Add the colours dynamically
                        if (scope.color) {
                            return d.color = color(d[color_property[0]][color_property[1]]);
                        }
                        else {
                            return "black"
                        }
                    })
                    .style("opacity", opacity)
                    .on("mouseover", mouseover)
                    .on("mouseout", mouseout)
                    .on("click", click);
            };

            scope.$watch('color', function (newVal, oldVal) {
                if (newVal) {

                    color_property = newVal.split(' ', 2);
                    console.log(color_property)
                }
                vis.selectAll("path.line")
                    .style("stroke", function (d) { // Add the colours dynamically
                        if (scope.color) {
                            return d.color = color(d[color_property[0]][color_property[1]]);
                        }
                        else {
                            return "black"
                        }
                    })
            });

            scope.$watch('config.relative_pitch', function (newVal, oldVal) {
                if (newVal) {
                    y.domain([d3.min(scope.data, function (d) {
                        return d3.min(d.utterance.current.pitch_track, function (d2) {
                            return d2.F0_relativized
                        });
                    }), d3.max(scope.data, function (d) {
                        return d3.max(d.utterance.current.pitch_track, function (d2) {
                            return d2.F0_relativized
                        });
                    })]);
                }
                else {
                    y.domain([d3.min(scope.data, function (d) {
                        return d3.min(d.utterance.current.pitch_track, function (d2) {
                            return d2.F0
                        });
                    }), d3.max(scope.data, function (d) {
                        return d3.max(d.utterance.current.pitch_track, function (d2) {
                            return d2.F0
                        });
                    })]);

                }
                vis.selectAll("path.line")
                    .attr("d", function (d) {
                        var data = d.utterance.current.pitch_track;

                        if (scope.config.relative_time) {
                            data = data.map(x => ({
                                time: (x.time - d.utterance.current.begin) / d.utterance.current.duration,
                                F0: x.F0, F0_relativized: x.F0_relativized
                            }));
                        }
                        if (newVal) {
                            valueline = d3.line().defined(function (d) {
                                return d.F0_relativized != null;
                            })
                                .x(function (d) {
                                    return x(d.time);
                                })
                                .y(function (d) {
                                    return y(d.F0_relativized);
                                });
                        }
                        else {
                            valueline = d3.line().defined(function (d) {
                                return d.F0 != null;
                            })
                                .x(function (d) {
                                    return x(d.time);
                                })
                                .y(function (d) {
                                    return y(d.F0);
                                });
                        }
                        return valueline(data);
                    });
                vis.select('.yaxis')
                    .call(yaxis);


            });

            scope.$watch('config.relative_time', function (newVal, oldVal) {
                if (newVal) {

                    x.domain([0, 1]);
                }
                else {

                    x.domain([d3.min(scope.data, function (d) {
                        return d3.min(d.utterance.current.pitch_track, function (d2) {
                            return d2.time
                        });
                    }), d3.max(scope.data, function (d) {
                        return d3.max(d.utterance.current.pitch_track, function (d2) {
                            return d2.time
                        });
                    })]);
                }
                vis.selectAll("path.line")
                    .attr("d", function (d) {
                        var data = d.utterance.current.pitch_track;

                        if (newVal) {
                            data = data.map(x => ({
                                time: (x.time - d.utterance.current.begin) / d.utterance.current.duration,
                                F0: x.F0, F0_relativized: x.F0_relativized
                            }));
                        }
                        return valueline(data);
                    });
                vis.select('.xaxis')
                    .call(xaxis);
            });

            scope.$watch('data', function (newVal, oldVal) {
                console.log(scope)
                vis.selectAll("*").remove();
                //pitch_viewplot.append('g').selectAll("circle.original").remove();
                if (!newVal) {
                    return;
                }
                //if (scope.max_lines == undefined){
                //    scope.max_lines = 100;
                //}
                console.log(newVal)
                newVal = newVal.slice(0, scope.config.max_lines);
                plotDataSet(newVal);

            });

            scope.$watch('config.max_lines', function (newVal, oldVal) {
                vis.selectAll("*").remove();
                var data = scope.data;
                data = data.slice(0, newVal);
                plotDataSet(data);
            });

            function click(d) {
                if (d3.event.shiftKey) {
                    console.log(d);
                    scope.$emit('DETAIL_REQUESTED', d.index);
                }
                else {
                    scope.$emit('SOUND_REQUESTED', d.utterance.current.id);
                }
            }

            function mouseover(d, i) {

                d3.select(this).style("stroke", "red")
                    .style("opacity", "1");

            }

            function mouseout(d, i) {
                d3.select(this)
                    .style("stroke", function (d) { // Add the colours dynamically
                        if (scope.color) {
                            return d.color = color(d[color_property[0]][color_property[1]]);
                        }
                        else {
                            return "black"
                        }
                    })
                    .style("opacity", opacity);

            }

        }
    }
});