
var pulse_x_function = function(d) { return x(d.x); }

var edited_pulse_line = waveform_viewplot.append('g').selectAll('line').data(edited_pulses).enter().append('line')
    .attr('class', 'edited')
.style("stroke", "red")
.attr("x1", function(d){ return d;})
.attr("y1", 0)
.attr("x2", function(d){ return d;})
.attr("y2", waveform_height);

var edited_pitch_points = pitch_viewplot.append('g').selectAll("circle")
      .data(edited_pitch_track)
    .enter().append("circle")
    .attr('class', 'edited')
      .attr("r", 5)
      .attr("cx",pitch_x_function)
      .attr("cy", function(d) { return pitch_y(d.y); }).style('fill', 'red');

var edited_pitch_line = pitch_viewplot.append("path")
    .attr('class', 'edited')
    .attr("class", "line").data([edited_pitch_track]).attr('d', function(d) {return pitch_valueline(d);})
   .style('stroke', 'red');


function updateEditedTrack(){
edited_pitch_line = edited_pitch_line.data([edited_pitch_track]);
edited_pitch_line.enter().append("path")
    .attr("class", "line")
   .style('stroke', 'red');
edited_pitch_line.attr('d', function(d) {return pitch_valueline(d);});
  edited_pitch_line.exit().remove();


edited_pitch_points = edited_pitch_points.data(edited_pitch_track);
edited_pitch_points.enter().append("circle")
      .attr("r", 5).style('fill', 'red');
edited_pitch_points.attr("cx",pitch_x_function)
      .attr("cy", function(d) { return pitch_y(d.y); });
  edited_pitch_points.exit().remove();

    edited_pulse_line = edited_pulse_line.data(edited_pulses);
     edited_pulse_line =edited_pulse_line.enter().append('line')
            .attr('class', 'edited')
        .style("stroke", "red")
        .attr("y1", 0)
        .attr("y2", waveform_height)
    .attr("x1", pulse_x_function)
    .attr("x2", pulse_x_function);

edited_pulse_line
    .attr("x1", pulse_x_function)
    .attr("x2", pulse_x_function);
      edited_pitch_points.exit().remove();

}

function drawPulseTrack(){
console.log(pulse_x_function);
edited_pulse_line
        .attr("y1", 0)
        .attr("y2", waveform_height)
      .attr("x1", pulse_x_function)
    .attr("x2", pulse_x_function);
}