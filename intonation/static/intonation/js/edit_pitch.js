


var lastEventTransform, xt=x;



function zoomed() {
  lastEventTransform = d3.event.transform;
  lastEventTransform.x = Math.min(lastEventTransform.x, 0);
  xt = lastEventTransform.rescaleX(x);
    waveform_vis.select('.xaxis').call(xaxis.scale(xt));
    pitch_vis.select('.xaxis').call(xaxis.scale(xt));
waveform_x_function = function(d) { return xt(d.x); };
pulse_x_function = function(d){ return xt(d.x);};
 waveform_valueline = waveform_valueline
      .x(waveform_x_function);
  pitch_x_function = function(d) { return xt(d.x); };
    pitch_valueline = pitch_valueline.x(pitch_x_function);
  draw();
}

function draw(){
drawWaveform();
drawPitchTrack();
drawPulseTrack();
}


function redraw(){
  width = parseInt(d3.select('#chart').style('width'), 10)- margin.left - margin.right;
  x.range([0, width]);
  resizeWaveform();
  resizePitch();
  draw();
}
window.addEventListener("resize", redraw);
