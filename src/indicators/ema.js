//src/indicators/ema.js
const technicalindicators = require("technicalindicators");

function calculateEMA(data, period) {
	return technicalindicators.EMA.calculate({
		values: data,
		period: period,
	});
}

module.exports = calculateEMA;
