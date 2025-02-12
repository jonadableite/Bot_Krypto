// eliteTrader.js

const Backtest = require("./src/backtest");
const SignalChecker = require("./src/signalChecker");
const SMC = require("./src/strategies/smc");
const config = require("./src/config");
const fs = require("fs");
const csv = require("csv-parser");
const tf = require("@tensorflow/tfjs-node");
const plot = require("node-plot");

class EliteTrader {
	constructor() {
		this.data = [];
		this.model = null;
		this.backtest = null;
		this.smc = new SMC(config);
	}

	async run() {
		console.log("Elite Trader iniciando...");

		await this.loadData();
		await this.prepareModel();
		this.executeBacktest();
		this.analyzeResults();
		this.visualizeResults();

		console.log("Elite Trader concluído.");
	}

	async loadData() {
		console.log("Carregando dados históricos...");
		return new Promise((resolve, reject) => {
			fs.createReadStream("historical_data.csv")
				.pipe(csv())
				.on("data", (row) => {
					this.data.push({
						time: new Date(row.timestamp),
						open: Number.parseFloat(row.open),
						high: Number.parseFloat(row.high),
						low: Number.parseFloat(row.low),
						close: Number.parseFloat(row.close),
						volume: Number.parseFloat(row.volume),
					});
				})
				.on("end", () => {
					console.log(`Dados carregados: ${this.data.length} candles`);
					resolve();
				})
				.on("error", reject);
		});
	}

	async prepareModel() {
		console.log("Preparando modelo de machine learning...");

		const features = this.data.map((candle) => [
			candle.open,
			candle.high,
			candle.low,
			candle.close,
			candle.volume,
		]);

		const labels = this.data
			.slice(1)
			.map((candle, i) => (candle.close > this.data[i].close ? 1 : 0));

		const model = tf.sequential();
		model.add(
			tf.layers.dense({ units: 64, activation: "relu", inputShape: [5] }),
		);
		model.add(tf.layers.dense({ units: 32, activation: "relu" }));
		model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

		model.compile({
			optimizer: "adam",
			loss: "binaryCrossentropy",
			metrics: ["accuracy"],
		});

		const xs = tf.tensor2d(features);
		const ys = tf.tensor2d(labels, [labels.length, 1]);

		await model.fit(xs, ys, {
			epochs: 50,
			batchSize: 32,
			validationSplit: 0.2,
			callbacks: {
				onEpochEnd: (epoch, logs) => {
					console.log(
						`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`,
					);
				},
			},
		});

		this.model = model;
		console.log("Modelo preparado.");
	}

	executeBacktest() {
		console.log("Executando backtest...");

		this.backtest = new Backtest(
			config.INITIAL_BALANCE,
			config.RISK_PER_TRADE,
			config.FEE_RATE,
		);

		this.results = this.backtest.run(this.data, this.model);

		console.log("Backtest concluído.");
	}

	analyzeResults() {
		console.log("\n=== Resultados do Backtest ===");
		console.log(`Saldo Inicial: $${config.INITIAL_BALANCE.toFixed(2)}`);
		console.log(`Saldo Final: $${this.results.finalBalance.toFixed(2)}`);
		console.log(
			`Lucro Total: $${this.results.totalProfit.toFixed(2)} (${((this.results.totalProfit / config.INITIAL_BALANCE) * 100).toFixed(2)}%)`,
		);
		console.log(`Total de Trades: ${this.results.totalTrades}`);
		console.log(`Trades Vencedores: ${this.results.winningTrades}`);
		console.log(`Trades Perdedores: ${this.results.losingTrades}`);
		console.log(`Taxa de Acerto: ${(this.results.winRate * 100).toFixed(2)}%`);
		console.log(`Profit Factor: ${this.results.profitFactor.toFixed(2)}`);
		console.log(
			`Drawdown Máximo: ${(this.results.maxDrawdown * 100).toFixed(2)}%`,
		);
		console.log(`Sharpe Ratio: ${this.results.sharpeRatio.toFixed(2)}`);
		console.log(`Sortino Ratio: ${this.results.sortinoRatio.toFixed(2)}`);
	}

	visualizeResults() {
		console.log("\nGerando visualizações...");

		// Gráfico de Equity
		plot({
			data: this.results.equity,
			filename: "equity_curve.png",
			title: "Curva de Equity",
			xlabel: "Trades",
			ylabel: "Equity ($)",
		});

		// Gráfico de Distribuição de Retornos
		const returns = this.results.trades.map((trade) => trade.relativeProfit);
		plot({
			data: returns,
			filename: "return_distribution.png",
			title: "Distribuição de Retornos",
			xlabel: "Retorno (%)",
			ylabel: "Frequência",
			type: "histogram",
		});

		console.log(
			"Visualizações geradas: equity_curve.png, return_distribution.png",
		);
	}
}

// Executar o Elite Trader
const eliteTrader = new EliteTrader();
eliteTrader.run().catch(console.error);
