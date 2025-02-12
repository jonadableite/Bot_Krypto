//src/indicators/rsi.js
const technicalindicators = require("technicalindicators");

function calculateRSI(data, period) {
	return technicalindicators.RSI.calculate({
		values: data,
		period: period,
	});
}

module.exports = calculateRSI;
