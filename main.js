// 1: SET GLOBAL VARIABLES
const margin = { top: 50, right: 30, bottom: 60, left: 70 };
const width = 900 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select("#lineChart1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid black")
    .style("padding", "5px")
    .style("font-size", "12px")
    .style("visibility", "hidden");

// 2: LOAD DATA
d3.csv("aircraft_incidents.csv").then(data => {
    let yearlyData = d3.rollup(data, 
        v => d3.sum(v, d => +d.Total_Fatal_Injuries), 
        d => new Date(d.Event_Date).getFullYear()
    );

    yearlyData = Array.from(yearlyData, ([Year, Total_Fatal_Injuries]) => ({ Year, Total_Fatal_Injuries }))
        .filter(d => !isNaN(d.Year) && !isNaN(d.Total_Fatal_Injuries))
        .sort((a, b) => a.Year - b.Year);

    let makeYearlyData = {};
    data.forEach(d => {
        let year = new Date(d.Event_Date).getFullYear();
        let make = d.Make;
        if (!makeYearlyData[make]) makeYearlyData[make] = {};
        makeYearlyData[make][year] = (makeYearlyData[make][year] || 0) + +d.Total_Fatal_Injuries;
    });

    Object.keys(makeYearlyData).forEach(make => {
        makeYearlyData[make] = Object.entries(makeYearlyData[make]).map(([Year, Total_Fatal_Injuries]) => ({
            Year: +Year, Total_Fatal_Injuries
        })).sort((a, b) => a.Year - b.Year);
    });

    const makes = ["All", ...Array.from(new Set(data.map(d => d.Make))).sort()];
    d3.select("#makeDropdown")
        .selectAll("option")
        .data(makes)
        .enter().append("option")
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

    // X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .text("Year");

    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .text("Total Fatal Injuries");

    function updateChart(makeFilter) {
        let filteredData = makeFilter === "All" ? yearlyData : makeYearlyData[makeFilter] || [];

        // Remove previous elements
        svg.selectAll(".data-line, .point, .trendline").remove();

        // Line generator
        const line = d3.line()
            .x(d => xScale(d.Year))
            .y(d => yScale(d.Total_Fatal_Injuries));

        // Draw line
        svg.append("path")
            .datum(filteredData)
            .attr("class", "data-line")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line);

        // Draw points with tooltip
        svg.selectAll(".point")
            .data(filteredData)
            .enter().append("circle")
            .attr("class", "point")
            .attr("cx", d => xScale(d.Year))
            .attr("cy", d => yScale(d.Total_Fatal_Injuries))
            .attr("r", 4)
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible")
                    .text(`Year: ${d.Year}, Fatalities: ${d.Total_Fatal_Injuries}`)
                    .style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", () => tooltip.style("visibility", "hidden"));

        // Trendline toggle
        d3.select("#trendlineToggle").on("change", function() {
            svg.selectAll(".trendline").remove();
            if (this.checked && filteredData.length > 1) {
                const trendlineData = computeTrendline(filteredData);
                svg.append("path")
                    .datum(trendlineData)
                    .attr("class", "trendline")
                    .attr("fill", "none")
                    .attr("stroke", "dimgray")
                    .attr("stroke-dasharray", "5,5")
                    .attr("stroke-width", 2)
                    .attr("d", line);
            }
        }).dispatch("change");
    }

    function computeTrendline(data) {
        const xMean = d3.mean(data, d => d.Year);
        const yMean = d3.mean(data, d => d.Total_Fatal_Injuries);
        const slope = d3.sum(data, d => (d.Year - xMean) * (d.Total_Fatal_Injuries - yMean)) /
                      d3.sum(data, d => (d.Year - xMean) ** 2);
        const intercept = yMean - slope * xMean;
        return [
            { Year: 1995, Total_Fatal_Injuries: slope * 1995 + intercept },
            { Year: 2016, Total_Fatal_Injuries: slope * 2016 + intercept }
        ];
    }

    d3.select("#makeDropdown").on("change", function() {
        updateChart(this.value);
    });

    updateChart("All");
});
