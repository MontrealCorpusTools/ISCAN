function InitSelects(metadata) {

    var filters = d3.select('div#filters');
    var filter_divs = filters
        .selectAll('div')
        .data(metadata)
        .enter()
        .append('div')
        .attr('class', 'filter')
        .attr('id', function (d) {
            return 'div-' + d.key;
        });

    filter_divs.append("span")
        .text(function (d) {
            return d.key;
        });

    filter_divs.append("select")
        .attr('id', function (d) {
            return d.key;
        })
        .on('change', InitFacets)
        .selectAll('option')
        .data(function (d) {
            return ['all'].concat(d.values);
        })
        .enter()
        .append('option')
        .attr('value', function (d) {
            return d;
        })
        .text(function (d) {
            return d;
        });

    var facet_data = ['Color', 'Row', 'Column'];

    var facets = d3.select("div#facets");
    var facet_divs = facets
        .selectAll('div')
        .data(facet_data)
        .enter()
        .append('div')
        .attr('class', 'facet')
        .attr('id', function (d) {
            return 'div-' + d.key;
        });

    facet_divs.append("span")
        .text(function (d) {
            return d;
        });

    facet_divs.append("select")
        .attr('id', function (d) {
            return d;
        })
        .on('change', InitFacets)
        .selectAll('option')
        .data(function (d) {
            return [{'key': 'none'}].concat(metadata);
        })
        .enter()
        .append('option')
        .attr('value', function (d) {
            return d.key;
        })
        .text(function (d) {
            return d.key;
        });

}


function color_function(d) {

    if (color_attribute != 'none') {
        return color(d[color_attribute]);
    }
    else {
        return "black"
    }
}

function click(d) {
    if (d3.event.ctrlKey) {
        var snd = new Audio(generate_sound_file_url(d.discourse)); // buffers automatically when created
        snd.play();
    }
    else {
        var url = generate_view_url(d.discourse);
        window.open(url, '_blank');
    }
};

function mouseover(d, i) {

    //console.log(d3.select(this).data());
    d3.select(this).style("stroke", "red")
        .style("opacity", "1");

};

function mouseout(d, i) {
    d3.select(this).style("stroke", color_function)
        .style("opacity", "0.3");

};

function InitFacets() {
    console.log('hello!');
    d3.select("div#chart").html("");

    column = d3.select("#Column").node().value;
    row = d3.select("#Row").node().value;
    color_attribute = d3.select("#Color").node().value;

    var row_values = metadata[row];

    var filtered_data = data;
    for (i = 0; i < metadata.length; i++) {
        var filter = d3.select('#' + metadata[i].key).node().value;
        if (filter != 'all') {
            filtered_data = filtered_data.filter(function (d) {
                return d[metadata[i].key] == filter
            })
        }
    }

    var chart_table = d3.select("#chart").append('table');
    if (row != 'none') {
        var row_data = metadata[metadata.findIndex(function (d) {
            return d.key == row;
        })].values
        var num_rows = row_data.length;
    }

    if (column != 'none') {
        var column_data = metadata[metadata.findIndex(function (d) {
            return d.key == column;
        })].values
        var num_cols = column_data.length;
        var adjusted_width = width / num_cols;
        if (adjusted_width < 400) {
            adjusted_width = 400;
        }
    }
    else {
        var adjusted_width = width;
    }
    x.range([0, adjusted_width]);

    var thead = chart_table.append('thead');//.append('tr')
    thead.append('th')
    if (column != 'none') {
        var col_divs = thead.selectAll('th').data(column_data)
            .enter()
            .append('th')
            .text(function (d) {
                return d;
            });
    }
    var tbody = chart_table.append('tbody');
    if (row != 'none') {
        var row_divs = tbody.selectAll('tr')
            .data(row_data)
            .enter()
            .append('tr')
            .attr('id', function (d) {
                return 'row-' + d;
            });
        row_divs.append('td')
            .text(function (d) {
                return d;
            });
        for (i = 0; i < num_rows; i++) {
            console.log(row_data[i]);
            var row_filtered_data = filtered_data.filter(function (d) {
                return (d[row] == row_data[i]);
            })
            if (column != 'none') {
                for (j = 0; j < num_cols; j++) {
                    var svg_cell = row_divs.append('td').attr('id', 'cell-' + row_data[i] + "-" + column_data[j]);
                    var svg_data = row_filtered_data.filter(function (d) {
                        return d[column] == column_data[j];
                    })
                    if (svg_data.length == 0) {
                        continue;
                    }
                    create_visual(svg_cell, svg_data, adjusted_width);
                }
            }
            else {
                var svg_cell = row_divs.append('td').attr('id', 'cell-' + row_data[i]);
                if (row_filtered_data.length == 0) {
                    continue;
                }

                create_visual(svg_cell, row_filtered_data, adjusted_width);
            }
        }


    }
    else {
        var row_divs = tbody
            .append('tr')
        row_divs.append('td')
            .text('');
        if (column != 'none') {
            for (j = 0; j < num_cols; j++) {
                var svg_cell = row_divs.append('td').attr('id', 'cell-' + column_data[j]);
                var column_filtered_data = filtered_data.filter(function (d) {
                    return d[column] == column_data[j];
                })
                if (column_filtered_data.length == 0) {
                    continue;
                }
                create_visual(svg_cell, column_filtered_data, adjusted_width);
            }
        }
        else {
            var svg_cell = row_divs.append('td').attr('id', 'cell');

            if (filtered_data.length != 0) {
                create_visual(svg_cell, filtered_data, adjusted_width);
            }

        }
    }

}

function create_visual(svg_cell, data_for_vis, width_for_vis) {

    var vis = svg_cell.append("svg")
    //responsive SVG needs these 2 attributes and no width and height attr
    //.attr("preserveAspectRatio", "xMinYMin meet")
    //.attr("viewBox", "0 0 600 400")
    //class to make it responsive
    //.classed("svg-content-responsive", true)
        .attr("width", width_for_vis + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    // x axis
    vis.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xaxis);

    // y axis
    vis.append("g")
        .attr("class", "y axis")
        .call(yaxis);

    var parameter = vis.selectAll(".parameter")
        .data(data_for_vis, function (d) {
            return d.discourse;
        })
        .enter().append("g")
        .attr("class", "parameter");

    parameter.append("path")
        .attr("class", "line")
        .attr("d", function (d) {
            return valueline(d.values);
        })
        .style("stroke", color_function)
        .style("opacity", "0.3")
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .on("click", click);
}

function InitChart(row, column) {


    var xaxistop = d3.svg.axis()
        .scale(x)
        .orient("top")
        .tickFormat("")
        .ticks(10);


    // Select html location and define svg within it with group g shifted to account for margins.
    var vis = d3.select("#" + column + '-' + row)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Draw the Plotting region------------------------------
    // X axis lines (bottom and top).
    vis.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xaxis);

    // x axis title
    //vis.append("text")
    //  .attr("x", width/2)
    //  .attr("y", height+margin.bottom-10)
    // .style("text-anchor", "middle")
    // .style("font-size", "16px")
    // .text("Relative time");

    // Y axis lines (left and right).
    vis.append("g")
        .attr("class", "y axis")
        .call(yaxis);

    //vis.append("text")
    //   .attr("x", 0-height/2)
    //   .attr("y", -margin.left+20)
    //   .attr("transform", "rotate(-90)")
    //   .style("text-anchor", "middle")
    //  .style("font-size", "16px")
    //  .text("Relative F0");


    // End Draw the Plotting region------------------------------


    var parameter = vis.selectAll(".parameter")
        .data(data, function (d) {
            return d.key;
        })
        .enter().append("g")
        .attr("class", "parameter");

    parameter.append("path")
        .attr("class", "line")
        .filter(function (d) {
            return (d.row == row && d.column == column);
        })
        .attr("d", function (d) {
            return valueline(d.values);
        })
        .style("stroke", function (d) {
            return color(d.key);
        })
        .style("opacity", "0.3")
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .on("click", click);

    function click(d) {
        if (d3.event.ctrlKey) {
            var url = generate_view_url(d.key);
            window.open(url, '_blank');
        }
        else {
            var snd = new Audio(generate_sound_file_url(d.key)); // buffers automatically when created
            snd.play();
        }
    };

    function mouseover(d, i) {

        //console.log(d3.select(this).data());
        d3.select(this).style("stroke", "red")
            .style("opacity", "1");

    };

    function mouseout(d, i) {
        d3.select(this).style("stroke", function (d) {
            return color(d.key);
        })
            .style("opacity", "0.3");

    };


}