// src/backtest.js
const config = require("./config");
const signalChecker = require("./signalChecker");
const SMC = require("./strategies/smc");
const technicalindicators = require("technicalindicators");

class Backtest {
	constructor(initialBalance, riskPerTrade, feeRate) {
		this.initialBalance = initialBalance;
		this.balance = initialBalance;
		this.riskPerTrade = riskPerTrade;
		this.feeRate = feeRate;
		this.trades = [];
		this.equity = [initialBalance];
		this.smc = new SMC(config);
	}

	run(data, model) {
		let position = null;
		let maxDrawdown = 0;
		let peakBalance = this.initialBalance;

		const indicators = this.calculateIndicators(data);

		for (let i = 100; i < data.length; i++) {
			const currentPrice = data[i].close;
			const signalInfo = signalChecker.checkSignal(indicators, i, model);

			// Atualizar posição existente
			if (position) {
				if (this.shouldClosePosition(position, currentPrice, signalInfo)) {
					this.closePosition(position, currentPrice, i);
					position = null;
				}
			}

			// Abrir nova posição
			if (!position && signalInfo.signal !== "AGUARDE") {
				position = this.openPosition(signalInfo.signal, currentPrice, i);
			}

			// Atualizar equity e drawdown
			this.equity.push(this.calculateEquity(currentPrice, position));
			const drawdown = (peakBalance - this.balance) / peakBalance;
			maxDrawdown = Math.max(maxDrawdown, drawdown);
			peakBalance = Math.max(peakBalance, this.balance);
		}

		return this.generateResults(maxDrawdown);
	}

	calculateIndicators(data) {
		const closePrices = data.map((candle) => candle.close);
		return {
			sma: technicalindicators.SMA.calculate({
				period: 50,
				values: closePrices,
			}),
			rsi: technicalindicators.RSI.calculate({
				period: 14,
				values: closePrices,
			}),
			macd: technicalindicators.MACD.calculate({
				fastPeriod: 12,
				slowPeriod: 26,
				signalPeriod: 9,
				values: closePrices,
			}),
			atr: technicalindicators.ATR.calculate({
				high: data.map((c) => c.high),
				low: data.map((c) => c.low),
				close: closePrices,
				period: 14,
			}),
			data: data,
		};
	}

	shouldClosePosition(position, currentPrice, signalInfo) {
		if (position.type === "COMPRA") {
			return (
				currentPrice <= position.stopLoss ||
				currentPrice >= position.takeProfit ||
				signalInfo.signal.type === "VENDA"
			);
		} else {
			return (
				currentPrice >= position.stopLoss ||
				currentPrice <= position.takeProfit ||
				signalInfo.signal.type === "COMPRA"
			);
		}
	}

	openPosition(signal, currentPrice, index) {
		const positionSize = this.calculatePositionSize(
			currentPrice,
			signal.stopLoss,
		);
		const fee = positionSize * currentPrice * this.feeRate;
		this.balance -= fee;

		return {
			type: signal.type,
			entry: currentPrice,
			stopLoss: signal.stopLoss,
			takeProfit: signal.takeProfit,
			size: positionSize,
			entryIndex: index,
			entryBalance: this.balance,
		};
	}

	closePosition(position, currentPrice, index) {
		const exitFee = position.size * currentPrice * this.feeRate;
		let profit;
		if (position.type === "COMPRA") {
			profit = (currentPrice - position.entry) * position.size - exitFee;
		} else {
			profit = (position.entry - currentPrice) * position.size - exitFee;
		}

		this.balance += profit + position.size * position.entry;
		this.trades.push({
			type: position.type,
			entry: position.entry,
			exit: currentPrice,
			entryIndex: position.entryIndex,
			exitIndex: index,
			profit: profit,
			relativeProfit: profit / position.entryBalance,
		});
	}

	calculatePositionSize(currentPrice, stopLoss) {
		const risk = this.balance * this.riskPerTrade;
		return risk / Math.abs(currentPrice - stopLoss);
	}

	calculateEquity(currentPrice, position) {
		if (!position) return this.balance;

		let unrealizedProfit = 0;
		if (position.type === "COMPRA") {
			unrealizedProfit = (currentPrice - position.entry) * position.size;
		} else {
			unrealizedProfit = (position.entry - currentPrice) * position.size;
		}

		return this.balance + unrealizedProfit;
	}

	generateResults(maxDrawdown) {
		const totalTrades = this.trades.length;
		const winningTrades = this.trades.filter((t) => t.profit > 0);
		const losingTrades = this.trades.filter((t) => t.profit <= 0);

		const winRate = winningTrades.length / totalTrades;
		const averageWin =
			winningTrades.reduce((sum, t) => sum + t.relativeProfit, 0) /
			winningTrades.length;
		const averageLoss =
			losingTrades.reduce((sum, t) => sum + t.relativeProfit, 0) /
			losingTrades.length;
		const profitFactor = Math.abs(averageWin / averageLoss);

		const sharpeRatio = this.calculateSharpeRatio();
		const sortinoRatio = this.calculateSortinoRatio();

		return {
			finalBalance: this.balance,
			totalProfit: this.balance - this.initialBalance,
			totalTrades,
			winningTrades: winningTrades.length,
			losingTrades: losingTrades.length,
			winRate,
			averageWin,
			averageLoss,
			profitFactor,
			maxDrawdown,
			sharpeRatio,
			sortinoRatio,
			equity: this.equity,
			trades: this.trades,
		};
	}

	calculateSharpeRatio() {
		const returns = this.calculateDailyReturns();
		const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
		const stdDev = Math.sqrt(
			returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
				returns.length,
		);
		return (avgReturn / stdDev) * Math.sqrt(252); // Annualized
	}

	calculateSortinoRatio() {
		const returns = this.calculateDailyReturns();
		const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
		const negativeReturns = returns.filter((r) => r < 0);
		const downside = Math.sqrt(
			negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) /
				negativeReturns.length,
		);
		return (avgReturn / downside) * Math.sqrt(252); // Annualized
	}

	calculateDailyReturns() {
		const dailyEquity = this.equity.filter((_, index) => index % 1440 === 0); // Assumindo dados de 1 minuto
		return dailyEquity
			.slice(1)
			.map((eq, i) => (eq - dailyEquity[i]) / dailyEquity[i]);
	}
}

module.exports = Backtest;
