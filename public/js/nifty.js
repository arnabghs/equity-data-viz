const CHART_SIZE = { width: 800, height: 600 };
const MARGIN = { left: 100, right: 10, top: 10, bottom: 150 };
const WIDTH = CHART_SIZE.width - (MARGIN.left + MARGIN.right);
const HEIGHT = CHART_SIZE.height - (MARGIN.top + MARGIN.bottom);

const init = () => {
  const svg = d3
    .select("#chart-area svg")
    .attr("width", CHART_SIZE.width)
    .attr("height", CHART_SIZE.height);

  const g = svg
    .append("g")
    .attr("class", "prices")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  g.append("text")
    .attr("class", "x axis-label")
    .attr("x", WIDTH / 2)
    .attr("y", HEIGHT + 140);

  g.append("text")
    .attr("class", "y axis-label")
    .attr("y", -60)
    .attr("x", -HEIGHT / 2);

  g.append("g").attr("class", "y-axis");

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${HEIGHT})`);
};

const updateQuotes = function(quotes, fieldName) {
  const startTime = new Date(_.first(quotes).Date);
  const endTime = new Date(_.last(quotes).Date);
  const maxValue = _.get(_.maxBy(quotes, fieldName), fieldName, 0);
  const minValue = _.get(_.minBy(quotes, fieldName), fieldName, 0);

  const svg = d3.select("#chart-area svg");

  svg.select(".y.axis-label").text(fieldName);
  svg.select(".x.axis-label").text("Date");

  const y = d3
    .scaleLinear()
    .domain([minValue, maxValue])
    .range([HEIGHT, 0]);

  const yAxis = d3.axisLeft(y).ticks(10);

  svg.select(".y-axis").call(yAxis);

  const x = d3
    .scaleTime()
    .range([0, WIDTH])
    .domain([startTime, endTime]);

  const xAxis = d3.axisBottom(x);

  svg.select(".x-axis").call(xAxis);

  const line = d3
    .line()
    .x(q => x(new Date(q.Date)))
    .y(q => y(q.Close));

  svg
    .select(".prices")
    .append("path")
    .attr("class", "close")
    .attr("d", line(quotes));
};

const parseCompany = function({ Date, ...numerics }) {
  _.forEach(numerics, (v, k) => (numerics[k] = +v));
  return { Date, ...numerics };
};

const main = () => {
  d3.csv("data/NSEI.csv", parseCompany).then(quotes => {
    init();
    updateQuotes(quotes, "Close");
  });
};

window.onload = main;
