const CHART_SIZE = { width: 1200, height: 600 };
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

  const movingAvgLine = d3
    .line()
    .x(q => x(new Date(q.Date)))
    .y(q => y(q.sma));

  svg
    .select(".prices")
    .append("path")
    .attr("class", "moving-avg-close")
    .attr("d", movingAvgLine(quotes.filter(q => q.sma != 0)));
};

const parseCompany = function({ Date, ...numerics }) {
  _.forEach(numerics, (v, k) => (numerics[k] = +v));
  return { Date, ...numerics };
};

const sum = list => {
  return list.reduce((acc, el) => acc + el.Close, 0);
};

const insertMovingDayAverage = (quotes, days = 100, offset = 0) => {
  quotes.forEach((v, i) => {
    if (i > days - 1) {
      v.sma = sum(quotes.slice(i - (days + offset), i - offset)) / days;
    } else {
      v.sma = 0;
    }
  });
};

const showSlider = quotes => {
  const startTime = new Date(_.first(quotes).Date);
  const endTime = new Date(_.last(quotes).Date);

  const slider = createD3RangeSlider(
    startTime.getTime(),
    endTime.getTime(),
    "#slider-container"
  );

  d3.select("#range-label").text(
    startTime.getFullYear() + " <-> " + endTime.getFullYear()
  );

  slider.onChange(newRange => {
    d3.select("#range-label").text(
      new Date(newRange.begin).getFullYear() +
        " <-> " +
        new Date(newRange.end).getFullYear()
    );

    const filteredQuotes = quotes.filter(
      q =>
        new Date(q.Date) >= new Date(newRange.begin) &&
        new Date(q.Date) <= new Date(newRange.end)
    );

    d3.selectAll("path").remove();
    if (filteredQuotes.length > 0) updateQuotes(filteredQuotes, "Close");
  });
};

const updateByPeriodAndOffset = function(quotes) {
  let offset = 0;
  let period = 100;
  d3.select("#SMA-period").on("input", function() {
    period = +this.value == 0 ? 100 : +this.value;
    insertMovingDayAverage(quotes, period, offset);
    d3.selectAll("path").remove();
    updateQuotes(quotes, "Close");
  });

  d3.select("#SMA-offset").on("input", function() {
    offset = +this.value;
    insertMovingDayAverage(quotes, period, offset);
    d3.selectAll("path").remove();
    updateQuotes(quotes, "Close");
  });
};

const createTable = function(transacs) {
  // create table
  let table = d3
    .select("#transac-table")
    .append("table")
    .attr("class", "table");

  let columns = [
    { head: "Buy_Date", cl: "buy-date" },
    { head: "Buying_Price", cl: "buy-pr" },
    { head: "Sell_Date", cl: "sell-date" },
    { head: "Selling_Price", cl: "sell-pr" },
    { head: "Net_Profit", cl: "np" }
  ];

  // create table header
  table
		.append("thead")
		.attr("class","thead-light")
    .append("tr")
    .selectAll("th")
    .data(columns)
    .enter()
    .append("th")
    .attr("class", x => x.cl)
    .text(x => x.head);

  // create table body
  table
    .append("tbody")
    .selectAll("tr")
    .data(transacs)
    .enter()
    .append("tr")
    .selectAll("td")
    .data(function(row, i) {
      return Object.values(getTransactionSummary(row));
    })
    .enter()
    .append("td")
    .text(function(d) {
      return d;
    });
};

const getTransactionSummary = function(transaction) {
  const { buy, sell } = transaction;
  const income = sell.Close - buy.Close;
  return {
    Buy_Date: buy.Date,
    Buying_Price: Math.round(buy.Close),
    Sell_Date: sell.Date,
    Selling_Price: Math.round(sell.Close),
    Net_Profit: Math.round(income)
  };
};

const recordTransactions = function(quotes) {
  let noOfDays = 100;
  let stockBought = false;
  let transactions = [];
  let buy;

  for (let index = noOfDays; index < quotes.length; index++) {
    const sma = quotes[index].sma;
    const close = quotes[index].Close;
    if (close > sma && !stockBought) {
      stockBought = true;
      buy = quotes[index];
    }
    if (close < sma && stockBought) {
      stockBought = false;
      transactions.push({ buy: buy, sell: quotes[index] });
    }
    if (index == quotes.length - 1) {
      transactions.push({ buy: buy, sell: quotes[index] });
    }
  }
  console.log(transactions);
  createTable(transactions);
};

const main = () => {
  d3.csv("data/NSEI.csv", parseCompany).then(quotes => {
    init();
    showSlider(quotes);
    insertMovingDayAverage(quotes);
    updateQuotes(quotes, "Close");
    updateByPeriodAndOffset(quotes);
    recordTransactions(quotes);
  });
};

window.onload = main;
