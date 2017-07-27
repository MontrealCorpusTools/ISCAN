
var margin = {top: 40, right: 30, bottom: 40, left: 90},
    height = parseInt(d3.select('#chart').style('height'), 10)/3- margin.top - margin.bottom;
var width = parseInt(d3.select('#chart').style('width'), 10)-margin.right-margin.left;

var x = d3.scaleLinear().range([0, width]).nice();
x.domain([0, duration]);

// Make x axis
var xaxis = d3.axisBottom(x)
                  .ticks(10);

var zoom_scales = [1,30];