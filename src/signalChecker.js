// src/signalChecker.js
const SMC = require("./strategies/smc");
const config = require("./config");
const technicalindicators = require("technicalindicators");

class SignalChecker {
	constructor(smc, pricePredictionModel) {
		this.smc = smc;
		this.pricePredictionModel = pricePredictionModel;
		this.config = config;
		this.rsiPeriod = 14;
		this.macdSettings = {
			fastPeriod: 12,
			slowPeriod: 26,
			signalPeriod: 9,
		};
		this.bollingerBandsSettings = {
			period: 20,
			stdDev: 2,
		};
		this.lastCalculatedIndex = -1;
		this.cachedIndicators = null;
	}

	checkSignal(data, index) {
		const indicators = this.getIndicators(data, index);
		const marketStructure = this.smc.analyzeMarketStructure(
			data.slice(0, index + 1),
			indicators,
		);

		const currentCandle = data[index];

		const signal = this.evaluateSignal(
			marketStructure,
			currentCandle,
			indicators.rsi,
			indicators.macd,
			indicators.bollingerBands,
		);

		return {
			signal,
			marketStructure,
			indicators,
		};
	}

	getIndicators(data, index) {
		if (index !== this.lastCalculatedIndex) {
			const slicedData = data.slice(0, index + 1);
			this.cachedIndicators = {
				rsi: this.calculateRSI(slicedData),
				macd: this.calculateMACD(slicedData),
				bollingerBands: this.calculateBollingerBands(slicedData),
			};
			this.lastCalculatedIndex = index;
		}
		return this.cachedIndicators;
	}

	calculateRSI(data) {
		return technicalindicators.RSI.calculate({
			values: data.map((d) => d.close),
			period: this.rsiPeriod,
		});
	}

	calculateMACD(data) {
		return technicalindicators.MACD.calculate({
			values: data.map((d) => d.close),
			fastPeriod: this.macdSettings.fastPeriod,
			slowPeriod: this.macdSettings.slowPeriod,
			signalPeriod: this.macdSettings.signalPeriod,
		});
	}

	calculateBollingerBands(data) {
		return technicalindicators.BollingerBands.calculate({
			values: data.map((d) => d.close),
			period: this.bollingerBandsSettings.period,
			stdDev: this.bollingerBandsSettings.stdDev,
		});
	}

	evaluateSignal(marketStructure, currentCandle, rsi, macd, bollingerBands) {
		const rsiValue = rsi[rsi.length - 1];
		const macdValue = macd[macd.length - 1];
		const bbValue = bollingerBands[bollingerBands.length - 1];

		const isBullish =
			marketStructure.trend === "up" &&
			!marketStructure.isVolatile &&
			rsiValue < 70 &&
			macdValue.histogram > 0 &&
			currentCandle.close > bbValue.middle;

		const isBearish =
			marketStructure.trend === "down" &&
			!marketStructure.isVolatile &&
			rsiValue > 30 &&
			macdValue.histogram < 0 &&
			currentCandle.close < bbValue.middle;

		const features = this.prepareFeatures(
			marketStructure,
			currentCandle,
			rsi,
			macd,
			bollingerBands,
		);
		const modelPrediction = this.pricePredictionModel.predict(features);

		if (isBullish && modelPrediction > 0.7) {
			return this.generateBuySignal(marketStructure, currentCandle);
		} else if (isBearish && modelPrediction < 0.3) {
			return this.generateSellSignal(marketStructure, currentCandle);
		}

		return "AGUARDE";
	}

	generateBuySignal(marketStructure, currentCandle) {
		const entryPrice = Math.min(
			marketStructure.entryPrice,
			currentCandle.close,
		);
		const stopLoss = marketStructure.stopLoss;
		const takeProfit = marketStructure.takeProfit;

		return {
			type: "COMPRA",
			entryPrice,
			stopLoss,
			takeProfit,
			riskRewardRatio: (takeProfit - entryPrice) / (entryPrice - stopLoss),
		};
	}

	generateSellSignal(marketStructure, currentCandle) {
		const entryPrice = Math.max(
			marketStructure.entryPrice,
			currentCandle.close,
		);
		const stopLoss = marketStructure.stopLoss;
		const takeProfit = marketStructure.takeProfit;

		return {
			type: "VENDA",
			entryPrice,
			stopLoss,
			takeProfit,
			riskRewardRatio: (entryPrice - takeProfit) / (stopLoss - entryPrice),
		};
	}

	prepareFeatures(marketStructure, currentCandle, rsi, macd, bollingerBands) {
		return [
			marketStructure.trend === "up" ? 1 : 0,
			marketStructure.isVolatile ? 1 : 0,
			(currentCandle.close - marketStructure.entryPrice) / currentCandle.close,
			(currentCandle.close - marketStructure.stopLoss) / currentCandle.close,
			(marketStructure.takeProfit - currentCandle.close) / currentCandle.close,
			rsi[rsi.length - 1] / 100,
			macd[macd.length - 1].histogram,
			(currentCandle.close - bollingerBands[bollingerBands.length - 1].lower) /
				(bollingerBands[bollingerBands.length - 1].upper -
					bollingerBands[bollingerBands.length - 1].lower),
		];
	}
}

module.exports = SignalChecker;
