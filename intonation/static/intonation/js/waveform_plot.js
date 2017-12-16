var waveform_height = parseInt(d3.select('#waveform').style('height'), 10) - margin.top - margin.bottom;
var waveform_y = d3.scaleLinear().range([waveform_height, 0]).nice();
waveform_y.domain(d3.extent(waveform, function (d) {
    return d.y;
}));
var selection_begin = null;
var selection_end = null;
var waveform_padding = (waveform_y.domain()[1] - waveform_y.domain()[0]) * 0.05;
waveform_y.domain([waveform_y.domain()[0] - waveform_padding, waveform_y.domain()[1] + waveform_padding]);

var waveform_valueline = d3.line()
    .x(function (d) {
        return x(d.x);
    }).y(function (d) {
        return waveform_y(d.y);
    });

var waveform_x_function = function (d) {
    return x(d.x);
};
var waveform_yaxis = d3.axisLeft(waveform_y)
    .ticks(5);

var waveform_vis = d3.select("#waveform")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", waveform_height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Draw the Plotting region------------------------------
// X axis lines (bottom and top).
waveform_vis.append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + waveform_height + ")")
    .call(xaxis);

waveform_vis.append("g")
    .attr("class", "yaxis")
    .call(waveform_yaxis);

waveform_vis.append("text")
    .attr("x", 0 - waveform_height / 2)
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
    .attr("height", waveform_height);

var waveform_viewplot = waveform_vis.append("g").attr("clip-path", "url(#waveform_clip)");

var waveform_playline_x = x(0);

var waveform_playline = waveform_viewplot.append('line').attr("class", "playline").style("stroke", "red")
    .attr("x1", xt(0))
    .attr("y1", 0)
    .attr("x2", xt(0))
    .attr("y2", waveform_height);

waveform_viewplot.append("path")
    .attr("class", "line").data([waveform]).attr('d', function (d) {
    return waveform_valueline(d);
})
    .style('stroke', 'black');

var waveform_pane = waveform_vis.append("rect")
    .attr("class", "pane")
    .attr("width", width)
    .attr("height", waveform_height);

var drag = d3.drag()
    .on("start", function () {
        if (!snd.playing()) {
            waveform_viewplot.selectAll('rect.selection').remove();
            var coords = d3.mouse(this);
            selection_begin = xt.invert(coords[0]);
            waveform_playline.attr("x1", xt(selection_begin))
                .attr("x2", xt(selection_begin));
            snd.seek(selection_begin - begin_time);
            waveform_viewplot.append("rect")
                .attr('class', "selection")
                .attr('x', coords[0])
                .attr('y', 0)
                .attr('width', 0)
                .attr('height', waveform_height)
                .attr('fill', 'red')
                .attr('opacity', 0.3);
        }
    })
    .on("drag", function () {
        var p = d3.mouse(this);
        var diff = p[0] - xt(selection_begin);
        if (diff < 0) {
            selection_begin = xt.invert(p[0]);
            waveform_playline.attr("x1", xt(selection_begin))
                .attr("x2", xt(selection_begin));
            snd.seek(selection_begin - begin_time);
            if (selection_end == null) {
                selection_end = selection_begin + xt.invert(diff);
            }
            waveform_viewplot.select("rect.selection").attr('x', p[0]).attr('width', xt(selection_end) - xt(selection_begin));
        }
        else {
            waveform_viewplot.select("rect.selection").attr('width', diff);
            selection_end = xt.invert(p[0]);
        }
    });

waveform_vis.call(d3.zoom()
    .scaleExtent(zoom_scales)
    .translateExtent([[0, 0], [width, waveform_height]])
    .on("zoom", zoomed)
    .on('end', zoomended))
    .on("mousedown.zoom", null)
    .on("touchstart.zoom", null)
    .on("touchmove.zoom", null)
    .on("touchend.zoom", null)
    .on('click', function () {
        if (d3.event.defaultPrevented) return; // click suppressed
        if (!snd.playing()) {
            var coords = d3.mouse(this);
            var selection_begin = xt.invert(coords[0]);
            selection_end = null;
            waveform_playline.attr("x1", xt(selection_begin))
                .attr("x2", xt(selection_begin));
            snd.seek(selection_begin - begin_time);
        }
    })
    .call(drag);

function zoomended() {
    var e = d3.event.sourceEvent;
    console.log(e);
    if (e != null && e.button == 0 && e.movementX < 10) {
        if (!snd.playing()) {
            var coords = d3.mouse(this);
            selection_begin = xt.invert(coords[0]);
            waveform_playline.attr("x1", xt(selection_begin))
                .attr("x2", xt(selection_begin));
            snd.seek(selection_begin - begin_time);
        }
    }
}

function drawWaveform() {
    waveform_vis.select('.yaxis').call(waveform_yaxis);
    waveform_vis.selectAll("path.line")
        .attr('d', function (d) {
            return waveform_valueline(d);
        });
}

function resizeWaveform() {

    waveform_valueline = d3.line()
        .x(function (d) {
            return x(d.x);
        })
        .y(function (d) {
            return waveform_y(d.y);
        });

    waveform_pane.call(d3.zoom()
        .scaleExtent(zoom_scales)
        .translateExtent([[0, 0], [width, waveform_height]])
        .on("zoom", zoomed));
    waveform_height = parseInt(d3.select('#waveform').style('height'), 10) - margin.top - margin.bottom;
    d3.select('#waveform').select('svg').attr('height', waveform_height + margin.top + margin.bottom).attr('width', width + margin.right + margin.left);
    d3.select('#waveform_clip').attr('height', waveform_height).attr('width', width);
    d3.select('#waveform_clip').select('rect').attr('height', waveform_height).attr('width', width);
    waveform_vis.attr('height', waveform_height + margin.top + margin.bottom).attr('width', width + margin.right + margin.left);
    waveform_pane.attr("width", width).attr("height", waveform_height);
    waveform_y.range([waveform_height, 0]);
}

function updatePlayLine() {
    var actual_time = snd.seek() + begin_time
    waveform_playline.attr('x1', xt(actual_time))
        .attr('x2', xt(actual_time));
    if (snd.playing()) {
        if (selection_end != null && actual_time > selection_end - 0.1) {
            snd.stop();
            snd.seek(selection_begin - begin_time);
        }
        requestAnimationFrame(updatePlayLine);
    }
}