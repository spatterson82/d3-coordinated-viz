(function() {

    ////////////////////
    //Global Variables//
    ////////////////////
    // fields for joining
    var attrArray = ["Public Supply", "Domestic Fresh", "Irrigation Fresh",
        "Livestock Fresh", "Aquaculture Fresh", "Industrial Fresh", "Industrial Saline",
        "Mining Fresh", "Mining Saline", "Thermoelectric Power Fresh",
        "Thermoelectric Power Saline", "Total Fresh", "Total Saline", "Total"];
    var expressed = attrArray[0];
    var float_list = [];
    var maxVal = null;

    // chart frame
    var chartWidth = window.innerWidth * .425,
        chartHeight = 500,
        leftPadding = 2,
        rightPadding = 2,
        topBottomPadding = 25,
        chartInnerWidth = chartWidth - rightPadding - leftPadding,
        chartInnerHeight = chartHeight - topBottomPadding,
        translate = "translate(" + 4 + "," + 0  + ")";

    // new svg for bar chart
    var chart = d3.select('body')
        .append('svg')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .attr('class', 'chart');

    // dimension
    var width = window.innerWidth * .5,
        height = 500;

    // d3 map container
    var map = d3.select("body")
        .append('svg')
        .attr('class', 'map')
        .attr('width', width)
        .attr('height', height);


    window.onload = setMap();


    // choropleth map
    function setMap() {
        // map projection
        var projection = d3.geoAlbersUsa();

        var path = d3.geoPath()
            .projection(projection);

        d3.queue()
            .defer(d3.csv, 'data/Groundwater_water_withdrawels.csv')
            .defer(d3.json, 'data/US_States.topojson')
            .await(callback);


        function callback(error, csvData, us_states) {
            // get max val in current csv to use as domain high value
            for (var i in csvData) {
                if (!isNaN(csvData[i][expressed])) {
                    float_list.push(parseFloat(csvData[i][expressed]));
                };
            };
            maxVal = Math.max.apply(null, float_list);

            var unitedstates = topojson.feature(us_states, us_states.objects.US_States).features;

            unitedstates = joinData(unitedstates, csvData);
            var colorScale = makeColorScale(csvData);
            setEnumerationUnits(unitedstates, map, path, colorScale);

            setChart(csvData, colorScale);

            // add dropdown
            createDropdown(csvData);

            // add max and min text
            addLegend(csvData);
        };
    };

    function addLegend() {
        var legend = map.append('text')
            .attr('x', 980)
            .attr('y', 230)
            .attr('dx', 12)
            .attr('dy', '.35em')
            .attr('class', 'legend')
            .style('fill', 'rgb(80,80,80)');
        legend.append('tspan')
            .attr('dy', 0)
            .text('Max Use: ');
        legend.append('tspan')
            .attr('dy', 40)
            .attr('dx', -100)
            .text(maxVal + ' MGD');
    };
    function updateLegend() {
        map.select('.legend').remove();
        addLegend();
    }


    function setChart(csvData, colorScale) {
        // background of chart
        var chartBackground = chart.append('rect')
            .attr('class', 'chartBackground')
            .attr('width', chartInnerWidth)
            .attr('height', chartInnerHeight)
            .attr('transform', translate);

        //frame for chart border
        var chartFrame = chart.append('rect')
            .attr('class', 'chartFrame')
            .attr('width', chartInnerWidth)
            .attr('height', chartInnerHeight)
            .attr('transform', translate);

        // chart title
        var chartTitle = chart.append('text')
            .attr('x', 200)
            .attr('y', 30)
            .attr('class', 'chartTitle')
            .text('(' + expressed + ') Water Amount Used by State in 2005');

        var xScale = d3.scaleLinear()
            .range([leftPadding + rightPadding + 1, chartInnerWidth - 10])
            .domain([0, maxVal]);

        // horizontal axis
        var xAxis = d3.axisBottom()
            .scale(xScale)
            .tickFormat(function (d) {
                if ((d / 1000) >= 1) {
                    d = d / 1000 + "K";
                }
                return d;
            });

        //place horizontal axis
        var axis = chart.append('g')
            .attr('class', 'axis')
            .attr('transform', "translate(0, " + (chartHeight - topBottomPadding) + ")")
            .call(xAxis);


        // add those bars
        var bars = chart.selectAll('.bars')
            .data(csvData)
            .enter()
            .append('rect')
            .sort(function(a, b) {
                return a[expressed]-b[expressed];
            })
            .attr('class', function(d) {
                return "bars " + d.STATE_NAME;
            })
            .on('mouseover', highlight)
            .on('mouseout', dehighlight)
            .on('mousemove', moveLabel);

        var desc = bars.append('desc')
            .text('{"stroke": "none", "stroke-width": "0px"}');

        // function for repeated parts of both bars sections
        updateChart(bars, csvData.length, colorScale);
    };


    function createDropdown(csvData) {
        // select element
        var dropdown = d3.select('body')
            .append('select')
            .attr('class', 'dropdown')
            .on('change', function() {
                // get max val in current csv to use as domain high value
                float_list = [];
                for (var i in csvData) {
                    if (!isNaN(csvData[i][this.value])) {
                        float_list.push(parseFloat(csvData[i][this.value]));
                    };
                };
                maxVal = Math.max.apply(null, float_list);

                updateLegend();
                changeAttribute(this.value, csvData)
            });

        // initial dropdown option
        var titleOption = dropdown.append('option')
            .attr('class', 'titleOption')
            .attr('disabled', 'true')
            .text('Select Attribute');

        // add name options
        var attrOptions = dropdown.selectAll('attrOptions')
            .data(attrArray)
            .enter()
            .append('option')
            .attr('value', function(d) {
                return d;
            })
            .text(function(d) {
                return d;
            });
    };


    function changeAttribute(attribute, csvData) {
        // set global variable to current attribute requested
        expressed = attribute;

        // recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor choropleth
        var states = d3.selectAll('.states')
            .style('fill', function(d) {
                return choropleth(d.properties, colorScale);
        });

        // lab manual had ".bar" for this function and ".bars" for the other
        var bars = d3.selectAll('.bars')
            // re-sort bars
            .sort(function(a, b) {
                return a[expressed]-b[expressed];
            })
            .transition()
            .delay(function(d, i) {
                return i * 20;
            })
            .duration(500);

        updateChart(bars, csvData.length, colorScale);
    };


    function updateChart(bars, n, colorScale) {
        var xScale = d3.scaleLinear()
            .range([leftPadding + rightPadding + 1, chartInnerWidth - 10])
            .domain([0, maxVal]);

        bars.attr('x', function (d) {
                return xScale(parseFloat(d[expressed]) / chartInnerWidth);
            })
            .attr('width', function(d) {
                return xScale(parseFloat(d[expressed]));
            })
            .attr('height', chartInnerHeight / n - 1)
            .attr('y', function (d, i) {
                return i * ((chartInnerHeight - 2) / n);
            })
            .style('fill', function (d) {
                return choropleth(d, colorScale);
            });

        // horizontal axis
        var xAxis = d3.axisBottom()
            .scale(xScale)
            .tickFormat(function (d) {
                if ((d / 1000) >= 1) {
                    d = d / 1000 + "K";
                }
                return d;
            });

        //replace horizontal axis
        // remove old axis first
        chart.selectAll('g.axis').remove();
        var axis = chart.append('g')
            .attr('class', 'axis')
            .attr('transform', "translate(0, " + (chartHeight - topBottomPadding) + ")")
            .call(xAxis);

        var chartTitle = d3.select('.chartTitle')
            .text('(' + expressed + ') Water Amount Used by State in 2005');
    };


    function joinData(unitedstates, csvData) {
        // join csv and topojson
        for (var i in csvData) {
            var csv_row = csvData[i];
            var csv_key = csv_row.STATE_NAME;

            // loop through topojson
            for (var j in unitedstates) {
                var json_props = unitedstates[j].properties;
                var json_key = json_props.STATE_NAME;

                if (json_key == csv_key) {
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csv_row[attr]);
                        json_props[attr] = val;
                    });
                };
            };
        };
        return unitedstates;
    };


    function setEnumerationUnits(unitedstates, map, path, colorScale) {
        var states = map.selectAll('.states')
            .data(unitedstates)
            .enter()
            .append('path')
            .attr('class', function (d) {
                return "states " + d.properties.STATE_NAME;
            })
            .attr('d', path)
            .style('fill', function(d) {
                return choropleth(d.properties, colorScale);
            })
            .on('mouseover', function(d) {
                highlight(d.properties);
            })
            .on('mouseout', function(d) {
                dehighlight(d.properties);
            })
            .on('mousemove', moveLabel)
            .transition()
            .duration(200);

        var desc = map.selectAll('.states').append('desc')
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');
    };


    function makeColorScale(data) {
        var colorClasses = [
            "#cfdacd",
            "#c4c98a",
            "#d1df52",
            "#a0dd3e",
            "#18dd33",
            "#1a6e32"
        ];

        // color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        var domainArray = [];
        for (var i in data) {
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        // cluster the data
        var clusters = ss.ckmeans(domainArray, 5);
        // reset to cluster mins
        domainArray = clusters.map(function(d) {
            return d3.min(d);
        });

        // removes the first value of the array
        domainArray.shift();

        // assign last 4 minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
    };


    function choropleth(props, colorScale) {
        // test if attr val is a number
        var val = parseFloat(props[expressed]);

        if (typeof val == 'number' && !isNaN(val)) {
            return colorScale(val);
        } else {
            return '#CCC';
        };
    };


    function setLabel(props){
        //label content
        var labelAttribute1 = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";
        var labelAttribute2 = "<h1>No Data</h1><b>" + expressed + "</b>";
        var labelAtt = '';
        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.STATE_NAME + "_label")
            .html(function() {
                if (props[expressed] == 0) {
                    return labelAttribute2;
                } else {
                    return labelAttribute1;
                }
            });

        var stateName = infolabel.append("div")
            .attr("class", "stateName")
            .html(props.STATE_NAME);
    };


    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.STATE_NAME)
            .style("stroke", "green")
            .style("stroke-width", "4");
        setLabel(props)
    };


    function dehighlight(props){
        var selected = d3.selectAll("." + props.STATE_NAME)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };

        d3.select('.infolabel')
            .remove()
    };

    function moveLabel() {
        // get width
        var labelWidth = d3.select('.infolabel')
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;

        // test for overflow - horizontal
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        // test for overflow - vertical
        var y = d3.event.clientY < 75 ? y2 : y1;


        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
})();