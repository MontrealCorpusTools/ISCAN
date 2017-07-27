

var waveform_height = parseInt(d3.select('#waveform').style('height'), 10)- margin.top - margin.bottom;
var waveform_y = d3.scaleLinear().range([waveform_height, 0]).nice();
waveform_y.domain(d3.extent(waveform, function(d) { return d.y; }));
var waveform_padding = (waveform_y.domain()[1] - waveform_y.domain()[0]) * 0.05
waveform_y.domain([waveform_y.domain()[0] - waveform_padding, waveform_y.domain()[1] + waveform_padding]);

var waveform_valueline = d3.line()
                      .x( function(d) { return x(d.x); }).y( function(d) { return waveform_y(d.y); });

var waveform_x_function = function(d) { return x(d.x); }
var waveform_yaxis = d3.axisLeft(waveform_y)
                  .ticks(5);

var waveform_vis = d3.select("#waveform")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", waveform_height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", "translate("+margin.left+","+margin.top+")");

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
    .attr("x", 0-waveform_height/2)
    .attr("y", -margin.left+20)
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

waveform_viewplot.append("path")
    .attr("class", "line").data([waveform]).attr('d', function(d) {return waveform_valueline(d);})
   .style('stroke', 'black');

var waveform_pane = waveform_vis.append("rect")
    .attr("class", "pane")
      .attr("width", width)
      .attr("height", waveform_height);

waveform_pane.call(d3.zoom()
    .scaleExtent(zoom_scales)
    .translateExtent([[0, 0], [width, waveform_height]])
    .on("zoom", zoomed));

function drawWaveform(){
  waveform_vis.select('.yaxis').call(waveform_yaxis);
waveform_vis.selectAll("path.line")
        .attr('d', function(d) {return waveform_valueline(d);});
}

function resizeWaveform(){

 waveform_valueline = d3.line()
      .x(function(d) { return x(d.x); })
      .y(function(d) { return waveform_y(d.y); });

waveform_pane.call(d3.zoom()
    .scaleExtent(zoom_scales)
    .translateExtent([[0, 0], [width, waveform_height]])
    .on("zoom", zoomed));

  waveform_height = parseInt(d3.select('#waveform').style('height'), 10)- margin.top - margin.bottom;
  d3.select('#waveform').select('svg').attr('height', waveform_height + margin.top + margin.bottom).attr('width', width+margin.right+margin.left);
  d3.select('#waveform_clip').attr('height', waveform_height).attr('width', width);
  d3.select('#waveform_clip').select('rect').attr('height', waveform_height).attr('width', width);
    waveform_vis.attr('height', waveform_height + margin.top + margin.bottom).attr('width', width+margin.right+margin.left);
    waveform_pane.attr("width", width).attr("height", waveform_height);
  waveform_y.range([waveform_height, 0]);
}