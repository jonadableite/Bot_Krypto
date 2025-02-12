// src/strategies/smc.js
const technicalindicators = require("technicalindicators");

class SMC {
	constructor(config) {
		this.config = config;
	}

	identifyKeyLevels(data, lookback = 100) {
		const levels = [];
		for (let i = lookback; i < data.length; i++) {
			const window = data.slice(i - lookback, i + 1);
			const pivotHigh = this.findPivotHigh(window);
			const pivotLow = this.findPivotLow(window);

			if (pivotHigh) levels.push({ price: pivotHigh, type: "resistance" });
			if (pivotLow) levels.push({ price: pivotLow, type: "support" });
		}
		return this.filterSignificantLevels(levels);
	}

	findPivotHigh(data) {
		const center = Math.floor(data.length / 2);
		const centerCandle = data[center];
		if (centerCandle.high === Math.max(...data.map((c) => c.high))) {
			return centerCandle.high;
		}
		return null;
	}

	findPivotLow(data) {
		const center = Math.floor(data.length / 2);
		const centerCandle = data[center];
		if (centerCandle.low === Math.min(...data.map((c) => c.low))) {
			return centerCandle.low;
		}
		return null;
	}

	filterSignificantLevels(levels, minDistance = 0.005) {
		return levels.filter(
			(level, index, self) =>
				self.findIndex(
					(l) => Math.abs(l.price - level.price) / level.price < minDistance,
				) === index,
		);
	}

	detectOrderBlocks(data, lookback = 20) {
		const orderBlocks = [];
		for (let i = lookback; i < data.length; i++) {
			const window = data.slice(i - lookback, i + 1);
			const ob = this.findOrderBlock(window);
			if (ob) orderBlocks.push(ob);
		}
		return orderBlocks;
	}

	findOrderBlock(data) {
		const reversalCandle = data[data.length - 1];
		const previousCandles = data.slice(0, -1);

		if (reversalCandle.close > reversalCandle.open) {
			// Bullish reversal
			const lowestLow = Math.min(...previousCandles.map((c) => c.low));
			if (reversalCandle.low < lowestLow) {
				return { price: reversalCandle.low, type: "buy" };
			}
		} else if (reversalCandle.close < reversalCandle.open) {
			// Bearish reversal
			const highestHigh = Math.max(...previousCandles.map((c) => c.high));
			if (reversalCandle.high > highestHigh) {
				return { price: reversalCandle.high, type: "sell" };
			}
		}
		return null;
	}

	identifyFairValueGaps(data) {
		const fvgs = [];
		for (let i = 1; i < data.length - 1; i++) {
			const prevCandle = data[i - 1];
			const currentCandle = data[i];
			const nextCandle = data[i + 1];

			// Bullish FVG
			if (
				currentCandle.low > prevCandle.high &&
				nextCandle.high < currentCandle.low
			) {
				fvgs.push({
					start: prevCandle.high,
					end: currentCandle.low,
					type: "bullish",
				});
			}

			// Bearish FVG
			if (
				currentCandle.high < prevCandle.low &&
				nextCandle.low > currentCandle.high
			) {
				fvgs.push({
					start: currentCandle.high,
					end: prevCandle.low,
					type: "bearish",
				});
			}
		}
		return fvgs;
	}

	isNearLevel(price, level, threshold = 0.001) {
		return Math.abs(price - level) / price < threshold;
	}

	isTrendingUp(data, period = 50) {
		const sma = technicalindicators.SMA.calculate({
			period,
			values: data.map((d) => d.close),
		});
		return data[data.length - 1].close > sma[sma.length - 1];
	}

	isTrendingDown(data, period = 50) {
		const sma = technicalindicators.SMA.calculate({
			period,
			values: data.map((d) => d.close),
		});
		return data[data.length - 1].close < sma[sma.length - 1];
	}

	isVolatilityHigh(data, period = 14) {
		const atr = technicalindicators.ATR.calculate({
			high: data.map((d) => d.high),
			low: data.map((d) => d.low),
			close: data.map((d) => d.close),
			period,
		});
		const currentATR = atr[atr.length - 1];
		const averageATR = atr.reduce((sum, val) => sum + val, 0) / atr.length;
		return currentATR > averageATR * 1.5;
	}

	findOptimalEntry(price, orderBlocks, fvgs, trend) {
		if (trend === "up") {
			const nearestBuyOB = orderBlocks
				.filter((ob) => ob.type === "buy" && ob.price < price)
				.reduce(
					(nearest, ob) =>
						price - ob.price < price - nearest.price ? ob : nearest,
					{ price: 0 },
				);

			const nearestBullishFVG = fvgs
				.filter((fvg) => fvg.type === "bullish" && fvg.end < price)
				.reduce(
					(nearest, fvg) =>
						price - fvg.end < price - nearest.end ? fvg : nearest,
					{ end: 0 },
				);

			return Math.max(nearestBuyOB.price, nearestBullishFVG.end);
		} else {
			const nearestSellOB = orderBlocks
				.filter((ob) => ob.type === "sell" && ob.price > price)
				.reduce(
					(nearest, ob) =>
						ob.price - price < nearest.price - price ? ob : nearest,
					{ price: Number.POSITIVE_INFINITY },
				);

			const nearestBearishFVG = fvgs
				.filter((fvg) => fvg.type === "bearish" && fvg.start > price)
				.reduce(
					(nearest, fvg) =>
						fvg.start - price < nearest.start - price ? fvg : nearest,
					{ start: Number.POSITIVE_INFINITY },
				);

			return Math.min(nearestSellOB.price, nearestBearishFVG.start);
		}
	}

	calculateStopLoss(entryPrice, keyLevels, trend, atr) {
		if (trend === "up") {
			const nearestSupport = keyLevels
				.filter((level) => level.type === "support" && level.price < entryPrice)
				.reduce(
					(nearest, level) =>
						entryPrice - level.price < entryPrice - nearest.price
							? level
							: nearest,
					{ price: 0 },
				);

			return Math.min(nearestSupport.price, entryPrice - atr * 2);
		} else {
			const nearestResistance = keyLevels
				.filter(
					(level) => level.type === "resistance" && level.price > entryPrice,
				)
				.reduce(
					(nearest, level) =>
						level.price - entryPrice < nearest.price - entryPrice
							? level
							: nearest,
					{ price: Number.POSITIVE_INFINITY },
				);

			return Math.max(nearestResistance.price, entryPrice + atr * 2);
		}
	}

	calculateTakeProfit(entryPrice, stopLoss, riskRewardRatio = 2) {
		const risk = Math.abs(entryPrice - stopLoss);
		return entryPrice + risk * riskRewardRatio;
	}

	analyzeMarketStructure(data, indicators) {
		const lastCandle = data[data.length - 1];
		const keyLevels = this.identifyKeyLevels(data);
		const orderBlocks = this.detectOrderBlocks(data);
		const fvgs = this.identifyFairValueGaps(data);
		const trend = this.isTrendingUp(data) ? "up" : "down";
		const isVolatile = this.isVolatilityHigh(data);

		const entryPrice = this.findOptimalEntry(
			lastCandle.close,
			orderBlocks,
			fvgs,
			trend,
		);
		const stopLoss = this.calculateStopLoss(
			entryPrice,
			keyLevels,
			trend,
			indicators.atr[indicators.atr.length - 1],
		);
		const takeProfit = this.calculateTakeProfit(entryPrice, stopLoss);

		return {
			trend,
			isVolatile,
			keyLevels,
			orderBlocks,
			fvgs,
			entryPrice,
			stopLoss,
			takeProfit,
		};
	}
}

module.exports = SMC;
