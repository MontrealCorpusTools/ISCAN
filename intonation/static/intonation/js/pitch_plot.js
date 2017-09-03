var pitch_height = parseInt(d3.select('#pitchtrack').style('height'), 10) - margin.top - margin.bottom;
var pitch_y = d3.scaleLinear().range([pitch_height, 0]).nice();
pitch_y.domain(d3.extent(pitch_track, function (d) {
    return d.y;
}));
var pitch_padding = (pitch_y.domain()[1] - pitch_y.domain()[0]) * 0.05
pitch_y.domain([pitch_y.domain()[0] - pitch_padding, pitch_y.domain()[1] + pitch_padding]);

var pitch_x_function = function (d) {
    return x(d.x);
}
var pitch_valueline = d3.line()
    .x(pitch_x_function).y(function (d) {
        return pitch_y(d.y);
    });


var pitch_yaxis = d3.axisLeft(pitch_y)
    .ticks(5);

var pitch_vis = d3.select("#pitchtrack")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", pitch_height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Draw the Plotting region------------------------------
// X axis lines (bottom and top).
pitch_vis.append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + pitch_height + ")")
    .call(xaxis);

pitch_vis.append("g")
    .attr("class", "yaxis")
    .call(pitch_yaxis);

pitch_vis.append("text")
    .attr("x", 0 - pitch_height / 2)
    .attr("y", -margin.left + 20)
    .attr("transform", "rotate(-90)")
    .style("text-anchor", "middle")
    .style("font-size", "16px")
    .text("F0");


// End Draw the Plotting region------------------------------


var pitch_clippath = pitch_vis.append("clipPath")
    .attr("id", "pitch_clip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", pitch_height);
var pitch_viewplot = pitch_vis.append("g").attr("clip-path", "url(#pitch_clip)");

pitch_viewplot.append("path")
    .attr("class", "line").data([pitch_track]).attr('d', function (d) {
    return pitch_valueline(d);
})
    .style('stroke', 'blue');

pitch_viewplot.append('g').selectAll("circle")
    .data(pitch_track)
    .enter().append("circle")
    .attr("r", 5)
    .attr("cx", pitch_x_function)
    .attr("cy", function (d) {
        return pitch_y(d.y);
    })
    .style("fill", 'blue');


var pitch_pane = pitch_vis.append("rect")
    .attr("class", "pane")
    .attr("width", width)
    .attr("height", pitch_height);

pitch_pane.call(d3.zoom()
    .scaleExtent(zoom_scales)
    .translateExtent([[0, 0], [width, pitch_height]])
    .on("zoom", zoomed));


function drawPitchTrack() {
    pitch_vis.select('.yaxis').call(pitch_yaxis);
    pitch_vis.selectAll("path.line")
        .attr('d', function (d) {
            return pitch_valueline(d);
        });
    pitch_vis.selectAll('circle')
        .attr("cx", pitch_x_function)
        .attr("cy", function (d) {
            return pitch_y(d.y);
        });
}

function resizePitch() {
    pitch_valueline = d3.line()
        .x(function (d) {
            return x(d.x);
        })
        .y(function (d) {
            return pitch_y(d.y);
        });
    pitch_x_function = function (d) {
        return x(d.x);
    }

    pitch_pane.call(d3.zoom()
        .scaleExtent(zoom_scales)
        .translateExtent([[0, 0], [width, pitch_height]])
        .on("zoom", zoomed));
    pitch_height = parseInt(d3.select('#pitchtrack').style('height'), 10) - margin.top - margin.bottom;
    d3.select('#pitchtrack').select('svg').attr('height', pitch_height + margin.top + margin.bottom).attr('width', width + margin.right + margin.left);
    d3.select('#pitch_clip').attr('height', pitch_height).attr('width', width);
    pitch_vis.attr('height', pitch_height + margin.top + margin.bottom).attr('width', width + margin.right + margin.left);
    pitch_pane.attr("width", width).attr("height", pitch_height);
    pitch_clippath.attr("width", width).attr("height", pitch_height);
    pitch_viewplot.attr("width", width).attr("height", pitch_height);
    pitch_y.range([pitch_height, 0]);
    pitch_vis.select('.xaxis').attr("transform", "translate(0," + (pitch_height) + ")");
    waveform_vis.select('.xaxis').attr("transform", "translate(0," + (waveform_height) + ")");
}