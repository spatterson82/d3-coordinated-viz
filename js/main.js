window.onload = setMap()

// choropleth map
function setMap() {
    d3.queue()
        .defer(d3.csv, 'data/Groundwater_water_withdrawels.csv')
        .defer(d3.json, 'data/US_States.topojson')
        .await(callback);
}