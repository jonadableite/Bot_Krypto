const LogisticRegression = require("./logisticRegression");
const config = require("../config");

function trainModel(indicators) {
	const features = [];
	const labels = [];

	for (let i = 0; i < indicators.data.length - 1; i++) {
		const feature = prepareFeatures(indicators, i);
		if (feature) {
			// Só adiciona se a feature for válida
			features.push(feature);
			labels.push(
				indicators.data[i + 1].close > indicators.data[i].close ? 1 : 0,
			);
		}
	}

	const model = new LogisticRegression(features[0].length);
	model.train(
		features,
		labels,
		config.LEARNING_RATE,
		config.TRAINING_ITERATIONS,
	);

	return model;
}

function prepareFeatures(indicators, index) {
	// Verifica se todos os indicadores necessários estão disponíveis
	if (
		!indicators.rsi[index] ||
		!indicators.emaShort[index] ||
		!indicators.emaMedium[index] ||
		!indicators.emaLong[index] ||
		!indicators.volumeSMA[index] ||
		!indicators.atr[index] ||
		!indicators.bollinger[index] ||
		!indicators.macd[index] ||
		!indicators.stochRSI[index]
	) {
		return null; // Retorna null se algum indicador estiver faltando
	}

	return [
		indicators.rsi[index] / 100,
		(indicators.emaShort[index] - indicators.emaMedium[index]) /
			indicators.emaMedium[index],
		(indicators.emaMedium[index] - indicators.emaLong[index]) /
			indicators.emaLong[index],
		indicators.volumeSMA[index] / indicators.data[index].volume,
		indicators.atr[index] / indicators.data[index].close,
		(indicators.data[index].close - indicators.bollinger[index].lower) /
			(indicators.bollinger[index].upper - indicators.bollinger[index].lower),
		indicators.macd[index].histogram,
		indicators.stochRSI[index].k,
		indicators.stochRSI[index].d,
	];
}

module.exports = {
	trainModel,
	prepareFeatures,
};
