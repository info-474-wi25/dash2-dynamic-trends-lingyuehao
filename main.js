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

    // Sort data by year
    yearlyData.sort((a, b) => a.Year - b.Year);

    // Set scales
    const xScale = d3.scaleLinear()
        .domain([1995, 2016])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(yearlyData, d => d.Total_Fatal_Injuries)])
        .range([height, 0]);
    
    // Add X-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    
    // Add Y-axis
    svg.append("g")
        .call(d3.axisLeft(yScale));
    
    // Add line chart
    const line = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d.Total_Fatal_Injuries));
    
    svg.append("path")
        .datum(yearlyData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);
    
    console.log("Line path created:", svg.selectAll("path").nodes());
    
    // Compute trendline
    const xMean = d3.mean(yearlyData, d => d.Year);
    const yMean = d3.mean(yearlyData, d => d.Total_Fatal_Injuries);
    const numerator = d3.sum(yearlyData, d => (d.Year - xMean) * (d.Total_Fatal_Injuries - yMean));
    const denominator = d3.sum(yearlyData, d => (d.Year - xMean) ** 2);
    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;
    
    const trendData = [{ Year: 1995, Total_Fatal_Injuries: slope * 1995 + intercept }, 
                        { Year: 2016, Total_Fatal_Injuries: slope * 2016 + intercept }];
    
    const trendLine = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d.Total_Fatal_Injuries));
    
    svg.append("path")
        .datum(trendData)
        .attr("fill", "none")
        .attr("stroke", "gray")
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-width", 2)
        .attr("d", trendLine);
    
    // Add labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Year");
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Total Fatal Injuries");
})
