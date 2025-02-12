// src/indicators/calculateIndicators.js
const technicalindicators = require("technicalindicators");
const config = require("../config");

class IndicatorCalculator {
	constructor(config) {
		this.config = config;
	}

	calculate(data) {
		const { closes, highs, lows, volumes } = this.extractData(data);

		const indicators = {
			rsi: this.calculateRSI(closes),
			ema: this.calculateEMAs(closes),
			volumeSMA: this.calculateVolumeSMA(volumes),
			atr: this.calculateATR(highs, lows, closes),
			macd: this.calculateMACD(closes),
			stochRSI: this.calculateStochRSI(closes),
			bollinger: this.calculateBollingerBands(closes),
		};

		const minLength = this.findMinLength(indicators);
		return this.sliceIndicators(indicators, data, minLength);
	}

	extractData(data) {
		return {
			closes: data.map((candle) => candle.close),
			highs: data.map((candle) => candle.high),
			lows: data.map((candle) => candle.low),
			volumes: data.map((candle) => candle.volume),
		};
	}

	calculateRSI(closes) {
		return technicalindicators.RSI.calculate({
			values: closes,
			period: this.config.RSI_PERIOD,
		});
	}

	calculateEMAs(closes) {
		return {
			short: technicalindicators.EMA.calculate({
				values: closes,
				period: this.config.EMA_SHORT,
			}),
			medium: technicalindicators.EMA.calculate({
				values: closes,
				period: this.config.EMA_MEDIUM,
			}),
			long: technicalindicators.EMA.calculate({
				values: closes,
				period: this.config.EMA_LONG,
			}),
		};
	}

	calculateVolumeSMA(volumes) {
		return technicalindicators.SMA.calculate({
			values: volumes,
			period: this.config.VOLUME_PERIOD,
		});
	}

	calculateATR(highs, lows, closes) {
		return technicalindicators.ATR.calculate({
			high: highs,
			low: lows,
			close: closes,
			period: this.config.ATR_PERIOD,
		});
	}

	calculateMACD(closes) {
		return technicalindicators.MACD.calculate({
			values: closes,
			fastPeriod: 12,
			slowPeriod: 26,
			signalPeriod: 9,
		});
	}

	calculateStochRSI(closes) {
		return technicalindicators.StochasticRSI.calculate({
			values: closes,
			rsiPeriod: 14,
			stochasticPeriod: 14,
			kPeriod: 3,
			dPeriod: 3,
		});
	}

	calculateBollingerBands(closes) {
		return technicalindicators.BollingerBands.calculate({
			values: closes,
			period: 20,
			stdDev: 2,
		});
	}

	findMinLength(indicators) {
		return Math.min(
			indicators.rsi.length,
			indicators.ema.short.length,
			indicators.ema.medium.length,
			indicators.ema.long.length,
			indicators.volumeSMA.length,
			indicators.atr.length,
			indicators.macd.length,
			indicators.stochRSI.length,
			indicators.bollinger.length,
		);
	}

	sliceIndicators(indicators, data, minLength) {
		return {
			rsi: indicators.rsi.slice(-minLength),
			emaShort: indicators.ema.short.slice(-minLength),
			emaMedium: indicators.ema.medium.slice(-minLength),
			emaLong: indicators.ema.long.slice(-minLength),
			volumeSMA: indicators.volumeSMA.slice(-minLength),
			atr: indicators.atr.slice(-minLength),
			data: data.slice(-minLength),
			bollinger: indicators.bollinger.slice(-minLength),
			macd: indicators.macd.slice(-minLength),
			stochRSI: indicators.stochRSI.slice(-minLength),
		};
	}
}

const calculator = new IndicatorCalculator(config);
module.exports = (data) => calculator.calculate(data);
