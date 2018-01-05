var pulse_x_function = function (d) {
    return x(d.x);
}


pitch_viewplot.selectAll("circle.original")
    .style("fill-opacity", 0.5);
pitch_vis.selectAll("path.line")
    .style("stroke-opacity", 0.5);

var edited_pulse_line = waveform_viewplot.append('g').selectAll('line.edited').data(edited_pulses).enter().append('line')
    .attr('class', 'edited')
    .style("stroke", "blue")
    .attr("x1", function (d) {
        return d;
    })
    .attr("y1", 0)
    .attr("x2", function (d) {
        return d;
    })
    .attr("y2", waveform_height);

var edited_pitch_points = pitch_viewplot.append('g').selectAll("circle")
    .data(edited_pitch_track)
    .enter().append("circle")
    .attr('class', 'edited')
    .attr("r", 5)
    .attr("cx", pitch_x_function)
    .attr("cy", function (d) {
        return pitch_y(d.y);
    }).style('fill', 'blue')
    .on("mouseover", function(d) {
       div.transition()
         .duration(200)
         .style("opacity", .9);
       div.html("time: " + d.x + "<br/>"+ "F0: " + d.y)
         .style("left", (d3.event.pageX) + "px")
         .style("top", (d3.event.pageY - 28) + "px");
       })
     .on("mouseout", function(d) {
       div.transition()
         .duration(500)
         .style("opacity", 0);
       });

edited_pitch_points.on("click", function() {
  var coords = d3.mouse(this);
  if (!d3.event.ctrlKey) {
    pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected",false);
  }
  d3.select(this).attr('class', 'selected edited').style("fill", "red");
});

var edited_pitch_line = pitch_viewplot.append("path")
    .attr("class", "line")
    .classed("edited",true).data([edited_pitch_track]).attr('d', function (d) {
        return pitch_valueline(d);
    })
    .style('stroke', 'blue');


function updateEditedTrack() {
    console.log(edited_pitch_track);
    edited_pitch_line = edited_pitch_line.data([edited_pitch_track]);
    edited_pitch_line.enter().append("path")
        .attr("class", "line")
    .classed("edited",true)
        .style('stroke', 'blue');
    edited_pitch_line.attr('d', function (d) {
        return pitch_valueline(d);
    });
    edited_pitch_line.exit().remove();

    var circles = pitch_viewplot.selectAll('circle.edited').data(edited_pitch_track);

    circles.enter().append("circle")
        .attr('class', 'edited')
        .attr("r", 5).style('fill', 'blue');
    circles
        .attr("cx", pitch_x_function)
        .attr("cy", function (d) {
            return pitch_y(d.y);
        });
    circles.exit().remove();

    edited_pulse_line = waveform_viewplot.selectAll('line.edited').data(edited_pulses);
    edited_pulse_line.enter().append('line')
        .attr('class', 'edited')
        .style("stroke", "blue")
        .attr("y1", 0)
        .attr("y2", waveform_height)
        .attr("x1", pulse_x_function)
        .attr("x2", pulse_x_function);

    edited_pulse_line.exit().remove();

    var new_domain = d3.extent(pitch_viewplot.selectAll('circle').data(), function (d) {
        return d.y;
    });

    pitch_padding = (new_domain[1] - new_domain[0]) * 0.05;
    pitch_y.domain([new_domain[0] - pitch_padding, new_domain[1] + pitch_padding]);
    console.log(new_domain);
    resizePitch();
    drawPitchTrack();
    drawPulseTrack();

}



function drawPulseTrack() {
    waveform_viewplot.selectAll('line.edited')
        .attr("y1", 0)
        .attr("y2", waveform_height)
        .attr("x1", pulse_x_function)
        .attr("x2", pulse_x_function);
}

function double_selected() {
    pitch_viewplot.selectAll('circle.selected').data().forEach(function(d){d['y'] *= 2});
    pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected",false);

    var new_domain = d3.extent(pitch_viewplot.selectAll('circle').data(), function (d) {
        return d.y;
    });

    pitch_padding = (new_domain[1] - new_domain[0]) * 0.05;
    pitch_y.domain([new_domain[0] - pitch_padding, new_domain[1] + pitch_padding]);
    resizePitch();
    drawPitchTrack();
}

function halve_selected() {
    pitch_viewplot.selectAll('circle.selected').data().forEach(function(d){d['y'] /= 2});
    pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected",false);

    var new_domain = d3.extent(pitch_viewplot.selectAll('circle').data(), function (d) {
        return d.y;
    });

    pitch_padding = (new_domain[1] - new_domain[0]) * 0.05;
    pitch_y.domain([new_domain[0] - pitch_padding, new_domain[1] + pitch_padding]);
    resizePitch();
    drawPitchTrack();
}

function smooth_selected() {
    var all_data = pitch_viewplot.selectAll('circle').data();
    pitch_viewplot.selectAll('circle.selected').data().forEach(function(d){
        var ind = all_data.findIndex(function(e){return e['x']==d['x'];});
        console.log(ind);
        if (ind != 0 && ind != all_data.length -1){
            d['y'] = (all_data[ind+1]['y'] - all_data[ind-1]['y']) / 2 + all_data[ind-1]['y']
            console.log(d['y']);
        }
    });
    //pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected",false);

    var new_domain = d3.extent(pitch_viewplot.selectAll('circle').data(), function (d) {
        return d.y;
    });

    pitch_padding = (new_domain[1] - new_domain[0]) * 0.05;
    pitch_y.domain([new_domain[0] - pitch_padding, new_domain[1] + pitch_padding]);
    resizePitch();
    drawPitchTrack();
}

function remove_selected(){
    pitch_viewplot.selectAll('circle.selected').data().forEach(function(d){
        var ind = edited_pitch_track.findIndex(function(e){return e['x']==d['x'];});
        edited_pitch_track.splice(ind, 1)
        console.log(ind);
    });
    updateEditedTrack();
    pitch_viewplot.selectAll('circle.selected').style("fill", 'blue').classed("selected",false);
}