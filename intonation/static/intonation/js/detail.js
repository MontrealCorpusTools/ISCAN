
var lastEventTransform, xt;



function zoomed() {
  lastEventTransform = d3.event.transform;
  lastEventTransform.x = Math.min(lastEventTransform.x, 0)
  xt = lastEventTransform.rescaleX(x)
    specgram_svg.select('.x.axis').call(xaxis.scale(xt));
    waveform_vis.select('.x.axis').call(xaxis.scale(xt));
    pitch_vis.select('.x.axis').call(xaxis.scale(xt));

 waveform_valueline = d3.line()
      .x(function(d) { return xt(d.x); })
      .y(function(d) { return waveform_y(d.y); });
  pitch_x_function = function(d) { return xt(d.x); }
    pitch_valueline = pitch_valueline.x(pitch_x_function)

  specgram_context.save();
  specgram_context.clearRect(0, 0, width, specgram_height);
  specgram_context.translate(lastEventTransform.x, 0);
  specgram_context.scale(lastEventTransform.k, 1);
  draw();
  specgram_context.restore();
}

function draw(){
drawWaveform();
drawPitchTrack();
drawSpectrogram();
}


function redraw(){

  width = parseInt(d3.select('#chart').style('width'), 10)- margin.left - margin.right;
  x.range([0, width]);
  resizeWaveform();
  resizeSpectrogram();
  resizePitch();
  draw();
  specgram_context.restore();

}
window.addEventListener("resize", redraw);
