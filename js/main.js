(function() {

    ////////////////////
    //Global Variables//
    ////////////////////
    // fields for joining
    var attrArray = ["Public_Supply", "Domestic_Fresh", "Irrigation_Fresh",
        "Livestock_Fresh", "Aquaculture_Fresh", "Industrial_Fresh", "Industrial_Saline",
        "Mining_Fresh", "Mining_Saline", "Thermoelectric_Power_Fresh",
        "Thermoelectric_Power_Saline", "Total_Fresh", "Total_Saline", "Total"];
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

    var xScale = d3.scaleLinear()
        .range([leftPadding + rightPadding + 1, chartInnerWidth - 10])
        .domain([0, maxVal]);


    window.onload = setMap();


    // choropleth map
    function setMap() {
        // dimension
        var width = window.innerWidth * .5,
            height = 500;

        // d3 map container
        var map = d3.select("body")
            .append('svg')
            .attr('class', 'map')
            .attr('width', width)
            .attr('height', height);

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
        };
    };

    function setChart(csvData, colorScale) {
        // new svg for bar chart
        var chart = d3.select('body')
            .append('svg')
            .attr('width', chartWidth)
            .attr('height', chartHeight)
            .attr('class', 'chart');

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
            });

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
            .text('Number of Variable ' + expressed + ' in each region');

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

        // // add text to bars
        // var numbers = chart.selectAll('.numbers')
        //     .data(csvData)
        //     .enter()
        //     .append('text')
        //     .sort(function(a, b) {
        //         return a[expressed]-b[expressed];
        //     })
        //     .attr('class', function(d) {
        //         return "numbers " + d.STATE_NAME;
        //     })
        //     .attr('text-anchor', 'right')
        //     .attr('x', function(d) {
        //         return xScale(parseFloat(d[expressed])) / chartWidth;
        //     })
        //     .attr('y', function(d, i) {
        //         var fraction = chartHeight / csvData.length;
        //         return i * fraction + (fraction - 1);
        //     })
        //     .text(function(d) {
        //         return d[expressed];
        //     });

        // function for repeated parts of both bars sections
        updateChart(bars, csvData.length, colorScale);
    };


    function setGraticule(map, path) {
        // var graticule = d3.geoGraticule()
        //     .step([5, 5]);

        // var gratBackground = map.append('path')
        //     .datum(graticule.outline())
        //     .attr('class', 'gratBackground')
        //     .attr('d', path);

        // var gratLines = map.selectAll('.gratLines')
        //     .data(graticule.lines())
        //     .enter()
        //     .append('path')
        //     .attr('class', 'gratLines')
        //     .attr('d', path);
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
            });

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

        var chartTitle = d3.select('.chartTitle')
            .text('Number of Variable ' + expressed + ' in each region');
    };

    function joinData(unitedstates, csvData) {
        // join csv and topojson
        for (var i in csvData) {
            var csv_row = csvData[i];
            var csv_key = csv_row.State;

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
            });
    };


    function makeColorScale(data) {
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
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
})();