// src/utils/stressTest.js
const backtest = require("../backtest");

function stressTest(indicators, model) {
	const volatilityScenarios = [0.5, 1, 1.5, 2]; // Cenários de volatilidade
	let worstCaseProfit = Number.POSITIVE_INFINITY;
	let bestCaseProfit = Number.NEGATIVE_INFINITY;
	let maxDrawdown = 0;

	for (const volatility of volatilityScenarios) {
		const stressedIndicators = applyVolatilityStress(indicators, volatility);
		const results = backtest(stressedIndicators, model);

		worstCaseProfit = Math.min(worstCaseProfit, results.totalProfit);
		bestCaseProfit = Math.max(bestCaseProfit, results.totalProfit);
		maxDrawdown = Math.max(maxDrawdown, results.maxDrawdown);
	}

	return { worstCaseProfit, bestCaseProfit, maxDrawdown };
}

function applyVolatilityStress(indicators, volatilityMultiplier) {
	const stressedIndicators = JSON.parse(JSON.stringify(indicators)); // Deep copy
	for (let i = 0; i < stressedIndicators.data.length; i++) {
		const range =
			stressedIndicators.data[i].high - stressedIndicators.data[i].low;
		const adjustedRange = range * volatilityMultiplier;
		const midPoint =
			(stressedIndicators.data[i].high + stressedIndicators.data[i].low) / 2;

		stressedIndicators.data[i].high = midPoint + adjustedRange / 2;
		stressedIndicators.data[i].low = midPoint - adjustedRange / 2;
		stressedIndicators.data[i].close =
			(stressedIndicators.data[i].high + stressedIndicators.data[i].low) / 2;
	}
	return stressedIndicators;
}

module.exports = stressTest;
