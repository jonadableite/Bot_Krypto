// src/liveTrading.js
const config = require("./config");
const binanceService = require("./services/binance.service");
const whatsappService = require("./services/whatsapp.service");
const SignalChecker = require("./signalChecker");
const SMC = require("./strategies/smc");
const technicalindicators = require("technicalindicators");
const tf = require("@tensorflow/tfjs-node");

class LiveTrading {
	constructor(model) {
		this.model = model;
		this.signalChecker = new SignalChecker();
		this.smc = new SMC(config);
		this.balance = config.INITIAL_BALANCE;
		this.position = null;
		this.lastProcessedCandleTime = 0;
		this.tradeHistory = [];
		this.equityHistory = [this.balance];
	}

	async run() {
		console.log("Iniciando trading em tempo real...");

		while (true) {
			try {
				await this.processTick();
				await this.sleep(config.TICK_INTERVAL);
			} catch (error) {
				console.error("Erro durante o trading em tempo real:", error);
				await this.sleep(config.ERROR_RETRY_INTERVAL);
			}
		}
	}

	async processTick() {
		const currentTime = Date.now();
		const startTime = currentTime - config.LOOKBACK_PERIOD;
		const data = await this.fetchHistoricalData(startTime, currentTime);

		if (data.length === 0) {
			console.log("Nenhum dado novo disponível.");
			return;
		}

		const latestCandle = data[data.length - 1];
		if (latestCandle.time <= this.lastProcessedCandleTime) {
			return;
		}

		const indicators = this.calculateIndicators(data);
		const signalInfo = this.signalChecker.checkSignal(
			indicators,
			data.length - 1,
			this.model,
		);

		console.log(
			`\n[LIVE] Nova vela em ${new Date(latestCandle.time).toLocaleString()} - Preço: ${latestCandle.close.toFixed(2)}`,
		);
		console.log(`[LIVE] Sinal: ${JSON.stringify(signalInfo.signal)}`);

		await this.executeTradeLogic(signalInfo, latestCandle);

		this.lastProcessedCandleTime = latestCandle.time;
		this.updateEquity(latestCandle.close);
	}

	async fetchHistoricalData(startTime, endTime) {
		return binanceService.getHistoricalData(startTime, endTime);
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

	async executeTradeLogic(signalInfo, currentCandle) {
		if (this.position) {
			if (this.shouldClosePosition(signalInfo, currentCandle)) {
				await this.closePosition(currentCandle);
			}
		} else if (signalInfo.signal !== "AGUARDE") {
			await this.openPosition(signalInfo.signal, currentCandle);
		}
	}

	shouldClosePosition(signalInfo, currentCandle) {
		if (this.position.type === "COMPRA") {
			return (
				currentCandle.close <= this.position.stopLoss ||
				currentCandle.close >= this.position.takeProfit ||
				signalInfo.signal.type === "VENDA"
			);
		} else {
			return (
				currentCandle.close >= this.position.stopLoss ||
				currentCandle.close <= this.position.takeProfit ||
				signalInfo.signal.type === "COMPRA"
			);
		}
	}

	async openPosition(signal, candle) {
		const positionSize = this.calculatePositionSize(
			candle.close,
			signal.stopLoss,
		);
		const fee = positionSize * candle.close * config.FEE_RATE;

		this.position = {
			type: signal.type,
			entry: candle.close,
			size: positionSize,
			stopLoss: signal.stopLoss,
			takeProfit: signal.takeProfit,
			entryTime: candle.time,
			entryBalance: this.balance,
		};

		this.balance -= fee;
		console.log(
			`[TRADE] Abrindo posição ${signal.type} - Preço: ${candle.close.toFixed(2)}, Tamanho: ${positionSize.toFixed(6)}`,
		);
		await this.notifyTrade("ABERTURA", this.position);
	}

	async closePosition(candle) {
		const exitFee = this.position.size * candle.close * config.FEE_RATE;
		let profit;

		if (this.position.type === "COMPRA") {
			profit =
				(candle.close - this.position.entry) * this.position.size - exitFee;
		} else {
			profit =
				(this.position.entry - candle.close) * this.position.size - exitFee;
		}

		this.balance += profit + this.position.size * this.position.entry;

		console.log(
			`[TRADE] Fechando posição ${this.position.type} - Preço: ${candle.close.toFixed(2)}, Lucro: ${profit.toFixed(2)}`,
		);

		this.tradeHistory.push({
			type: this.position.type,
			entry: this.position.entry,
			exit: candle.close,
			profit: profit,
			entryTime: this.position.entryTime,
			exitTime: candle.time,
		});

		await this.notifyTrade("FECHAMENTO", {
			...this.position,
			exit: candle.close,
			profit: profit,
		});

		this.position = null;
	}

	calculatePositionSize(currentPrice, stopLoss) {
		const risk = this.balance * config.RISK_PER_TRADE;
		return risk / Math.abs(currentPrice - stopLoss);
	}

	updateEquity(currentPrice) {
		let equity = this.balance;
		if (this.position) {
			const positionValue = this.position.size * currentPrice;
			equity += positionValue - this.position.size * this.position.entry;
		}
		this.equityHistory.push(equity);
	}

	async notifyTrade(action, tradeInfo) {
		const message = `${action} de Trade:\nTipo: ${tradeInfo.type}\nPreço de Entrada: ${tradeInfo.entry.toFixed(2)}\nPreço de Saída: ${(tradeInfo.exit || 0).toFixed(2)}\nLucro: ${(tradeInfo.profit || 0).toFixed(2)}`;
		await whatsappService.sendWhatsAppMessage(message);
	}

	sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

module.exports = async function runLiveTrading(model) {
	const trader = new LiveTrading(model);
	await trader.run();
};
