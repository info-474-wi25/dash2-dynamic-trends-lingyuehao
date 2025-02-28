// 1: SET GLOBAL VARIABLES
const margin = { top: 50, right: 30, bottom: 60, left: 70 };
const width = 900 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Create SVG container for the chart
const svg = d3.select("#lineChart1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// 2: LOAD DATA
d3.csv("aircraft_incidents.csv").then(data => {
    let yearlyData = d3.rollup(data, 
        v => d3.sum(v, d => +d.Total_Fatal_Injuries), 
        d => new Date(d.Event_Date).getFullYear()
    );

    yearlyData = Array.from(yearlyData, ([Year, Total_Fatal_Injuries]) => ({ Year, Total_Fatal_Injuries }));
    yearlyData = yearlyData.filter(d => !isNaN(d.Year) && !isNaN(d.Total_Fatal_Injuries));
    yearlyData.sort((a, b) => a.Year - b.Year);

    let makeYearlyData = {};
    data.forEach(d => {
        let year = new Date(d.Event_Date).getFullYear();
        let make = d.Make;
        if (!makeYearlyData[make]) makeYearlyData[make] = {};
        if (!makeYearlyData[make][year]) makeYearlyData[make][year] = 0;
        makeYearlyData[make][year] += +d.Total_Fatal_Injuries;
    });

 
    Object.keys(makeYearlyData).forEach(make => {
        makeYearlyData[make] = Object.entries(makeYearlyData[make]).map(([Year, Total_Fatal_Injuries]) => ({
            Year: +Year,
            Total_Fatal_Injuries: Total_Fatal_Injuries
        })).sort((a, b) => a.Year - b.Year);
    });
 
    const makes = ["All", ...Array.from(new Set(data.map(d => d.Make))).sort()];
    d3.select("#makeDropdown")
        .selectAll("option")
        .data(makes)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    // Set scales
    const xScale = d3.scaleLinear()
        .domain([1995, 2016])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(yearlyData, d => d.Total_Fatal_Injuries)])
        .range([height, 0]);

    // Draw axes
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    svg.append("g")
        .call(d3.axisLeft(yScale));

    // Compute trendline
    function computeTrendline(data) {
        const xMean = d3.mean(data, d => d.Year);
        const yMean = d3.mean(data, d => d.Total_Fatal_Injuries);
        const slope = d3.sum(data, d => (d.Year - xMean) * (d.Total_Fatal_Injuries - yMean)) /
                      d3.sum(data, d => (d.Year - xMean) ** 2);
        const intercept = yMean - slope * xMean;
        return [{ Year: 1995, Total_Fatal_Injuries: slope * 1995 + intercept },
                { Year: 2016, Total_Fatal_Injuries: slope * 2016 + intercept }];
    }

    function updateChart(makeFilter) {
        let filteredData = makeFilter === "All" ? yearlyData : makeYearlyData[makeFilter] || [];

        svg.selectAll(".data-line, .trendline").remove();
        const line = d3.line()
            .x(d => xScale(d.Year))
            .y(d => yScale(d.Total_Fatal_Injuries));

        svg.append("path")
            .datum(filteredData)
            .attr("class", "data-line")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line);

        d3.select("#trendlineToggle").on("change", function() {
            svg.selectAll(".trendline").remove();
            if (this.checked && filteredData.length > 1) {
                svg.append("path")
                    .datum(computeTrendline(filteredData))
                    .attr("class", "trendline")
                    .attr("fill", "none")
                    .attr("stroke", "gray")
                    .attr("stroke-dasharray", "5,5")
                    .attr("stroke-width", 2)
                    .attr("d", line);
            }
        }).dispatch("change");
    }

    d3.select("#makeDropdown").on("change", function() {
        updateChart(this.value);
    });

    updateChart("All");
});
