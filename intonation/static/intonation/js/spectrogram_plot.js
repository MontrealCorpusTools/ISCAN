
var specgram_height = parseInt(d3.select('#specgram').style('height'), 10)- margin.top - margin.bottom;
var specgram_y = d3.scaleLinear().range([specgram_height, 0]),
specgram_z = d3.scaleLinear().range(["white", "black"]);

specgram_y.domain(d3.extent(specgram.values, function(d) { return d.frequency; }));
specgram_y.domain([specgram_y.domain()[0], specgram_y.domain()[1] + specgram.freq_step]);
specgram_z.domain(d3.extent(specgram.values, function(d) { return d.power; }));


var specgram_yaxis = d3.axisLeft(specgram_y)
                  .ticks(5);



var specgram_svg = d3.select("#specgram").attr('height', specgram_height+margin.top+margin.bottom).append('svg')
    .attr('class', 'combined')
    .attr("width", width+margin.left+margin.right)
    .attr("height", specgram_height+margin.top+margin.bottom)
    .append("g")
    .attr("transform", "translate("+margin.left+","+margin.top+")");

var specgram_canvas = d3.select("#specgram").append("canvas")
    .attr('class', 'combined')
    //.attr("x",  margin.left)
    //.attr("y", margin.top)
    .style("padding", margin.top+"px "+margin.right+"px "+ margin.bottom+"px "+ margin.left+"px ")
    .attr("width", width + "px")
    .attr("height", specgram_height + "px");


specgram_svg.append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + specgram_height + ")")
    .call(xaxis)
    .append("text")
      .attr("class", "label")
                .attr("x", width/2)
                .attr("y", margin.bottom-10)
                .style("text-anchor", "middle")
      .text("Time (s)");

specgram_svg.append("g")
    .attr("class", "yaxis")
    .call(specgram_yaxis)
    .append("text")
      .attr("class", "label")
                .attr("x", 0-specgram_height/2)
                .attr("y", -margin.left+20)
                .style("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
                .style("font-size", "16px")
      .text("Frequency (Hz)");


  var specgram_context = specgram_canvas.node().getContext("2d");

    var xGridSize = x(specgram.time_step) - x(0) + 2,
        yGridSize = specgram_y(specgram.freq_step) - specgram_y(0) - 2;

specgram_canvas.call(d3.zoom()
    .scaleExtent(zoom_scales)
    .translateExtent([[0, 0], [width, specgram_height]])
    .on("zoom", zoomed));

function drawSpectrogram() {
  specgram_svg.select('.yaxis').call(specgram_yaxis);
  specgram.values.forEach(drawRect);
}

function drawRect(d){
          //Draw the rectangle

          specgram_context.fillStyle = specgram_z(d.power);
          specgram_context.fillRect(x(d.time), specgram_y(d.frequency), xGridSize + 2, yGridSize);
      }

function resizeSpectrogram(){


specgram_canvas.call(d3.zoom()
    .scaleExtent([1, 9])
    .translateExtent([[0, 0], [width, specgram_height]])
    .on("zoom", zoomed));
  specgram_context.save();
  specgram_context.clearRect(0, 0, width, specgram_height);
  specgram_height = parseInt(d3.select('#specgram').style('height'), 10)- margin.top - margin.bottom;
  d3.select('#specgram').select('svg').attr('height', specgram_height + margin.top + margin.bottom).attr('width', width+margin.right+margin.left);

    specgram_svg.attr('height', specgram_height + margin.top + margin.bottom).attr('width', width+margin.right+margin.left);
    specgram_canvas.attr("width", width + "px").attr("height", specgram_height + "px");
  specgram_y.range([specgram_height, 0]);
  specgram_svg.select('.xaxis').attr("transform", "translate(0," + (specgram_height) + ")");

}