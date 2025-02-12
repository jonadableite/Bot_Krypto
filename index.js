// index.js
const config = require("./src/config");
const binanceService = require("./src/services/binance.service");
const Backtest = require("./src/backtest");
const runLiveTrading = require("./src/liveTrading");
const SignalChecker = require("./src/signalChecker");
const SMC = require("./src/strategies/smc");
const PricePredictionModel = require("./src/models/pricePredictionModel");
const calculateIndicators = require("./src/indicators/calculateIndicators");
const stressTest = require("./src/utils/stressTest");
const dataService = require("./src/services/data.service");
const fs = require("node:fs").promises;
const path = require("node:path");

// Cria o diretório para salvar o modelo, se não existir
const modelDir = path.join(__dirname, "models", "price_prediction_model");
if (!fs.existsSync(modelDir)) {
	fs.mkdirSync(modelDir, { recursive: true });
}

class EliteTrader {
	constructor() {
		this.config = config;
		this.backtest = new Backtest(
			config.INITIAL_BALANCE,
			config.RISK_PER_TRADE,
			config.FEE_RATE,
		);
		this.smc = new SMC(config);
		this.pricePredictionModel = new PricePredictionModel(config);
		this.signalChecker = new SignalChecker(this.smc, this.pricePredictionModel);
	}

	async start() {
		console.log("Iniciando Elite Trader...");

		try {
			const data = await this.loadHistoricalData();
			if (data.length === 0)
				throw new Error("Não foi possível obter dados históricos");

			await this.trainModel(data);
			const backtestResults = await this.runBacktest(data);
			await this.performCrossValidation(data);
			await this.runStressTest(data);
			await this.startLiveTrading();

			console.log("Elite Trader concluído com sucesso.");
		} catch (error) {
			console.error("Erro durante a execução do Elite Trader:", error);
		}
	}

	async loadHistoricalData() {
		console.log("Carregando dados históricos...");
		const endTime = Date.now();
		const startTime = endTime - this.config.BACKTEST_DAYS * 24 * 60 * 60 * 1000;
		const fileName = `${this.config.SYMBOL}_${this.config.INTERVAL}_${startTime}_${endTime}.csv`;

		const data = await dataService.fetchAndSaveData(
			this.config.SYMBOL,
			this.config.INTERVAL,
			startTime,
			endTime,
			fileName,
		);

		console.log(`Dados históricos carregados: ${data.length} candles`);
		return data;
	}

	async trainModel(data) {
		console.log("Treinando modelo de previsão de preços...");
		console.log(`Dados para treinamento: ${data.length} candles`);
		try {
			const indicators = calculateIndicators(data);
			console.log(
				`Indicadores calculados: ${indicators.data.length} pontos de dados`,
			);
			await this.pricePredictionModel.buildModel();
			await this.pricePredictionModel.trainModel(indicators.data);
			const modelPath = path.join(
				__dirname,
				"models",
				"price_prediction_model",
			);
			await this.pricePredictionModel.saveModel(modelPath);
			console.log(`Modelo salvo em: ${modelPath}`);
		} catch (error) {
			console.error("Erro durante o treinamento do modelo:", error);
			throw error;
		}
	}

	async runBacktest(data) {
		console.log("Executando backtest...");
		const results = this.backtest.run(data, this.signalChecker);
		await this.displayBacktestResults(results);
		await this.saveBacktestResults(results);
		return results;
	}

	async displayBacktestResults(results) {
		console.log("\n=== Resultados do Backtest ===");
		console.log(
			`Período analisado: ${new Date(results.startDate).toLocaleDateString()} até ${new Date(results.endDate).toLocaleDateString()}`,
		);
		console.log(`Saldo Inicial: $${this.config.INITIAL_BALANCE.toFixed(2)}`);
		console.log(`Saldo Final: $${results.finalBalance.toFixed(2)}`);
		console.log(
			`Lucro Total: $${results.totalProfit.toFixed(2)} (${((results.totalProfit / this.config.INITIAL_BALANCE) * 100).toFixed(2)}%)`,
		);
		console.log(`Total de Trades: ${results.totalTrades}`);
		console.log(`Trades Vencedores: ${results.winningTrades}`);
		console.log(`Trades Perdedores: ${results.losingTrades}`);
		console.log(`Taxa de Acerto: ${results.winRate.toFixed(2)}%`);
		console.log(`Profit Factor: ${results.profitFactor.toFixed(2)}`);
		console.log(`Drawdown Máximo: ${results.maxDrawdown.toFixed(2)}%`);
		console.log(`Sharpe Ratio: ${results.sharpeRatio.toFixed(2)}`);
		console.log(`Sortino Ratio: ${results.sortinoRatio.toFixed(2)}`);
	}

	async saveBacktestResults(results) {
		const detailedResults = {
			config: this.config,
			results: results,
			trades: results.trades,
		};
		const filePath = path.join(__dirname, "backtest_results.json");
		await fs.writeFile(filePath, JSON.stringify(detailedResults, null, 2));
		console.log(`Resultados detalhados salvos em: ${filePath}`);
	}

	async performCrossValidation(data) {
		console.log("\nRealizando validação cruzada...");
		const folds = 5;
		const foldSize = Math.floor(data.length / folds);
		let totalAccuracy = 0;

		for (let i = 0; i < folds; i++) {
			const testStart = i * foldSize;
			const testEnd = (i + 1) * foldSize;
			const trainData = [...data.slice(0, testStart), ...data.slice(testEnd)];
			const testData = data.slice(testStart, testEnd);

			await this.pricePredictionModel.trainModel(trainData);
			const foldResults = this.backtest.run(testData, this.signalChecker);
			totalAccuracy += foldResults.winRate;
			console.log(
				`Fold ${i + 1} - Acurácia: ${foldResults.winRate.toFixed(2)}%`,
			);
		}

		const averageAccuracy = totalAccuracy / folds;
		console.log(
			`Validação Cruzada - Acurácia Média: ${averageAccuracy.toFixed(2)}%`,
		);
	}

	async runStressTest(data) {
		console.log("\nExecutando teste de estresse...");
		const stressTestResults = stressTest(data, this.signalChecker);
		console.log("=== Resultados do Teste de Estresse ===");
		console.log(
			`Pior Cenário - Lucro: $${stressTestResults.worstCaseProfit.toFixed(2)}`,
		);
		console.log(
			`Melhor Cenário - Lucro: $${stressTestResults.bestCaseProfit.toFixed(2)}`,
		);
		console.log(
			`Drawdown Máximo: ${stressTestResults.maxDrawdown.toFixed(2)}%`,
		);
	}

	async startLiveTrading() {
		console.log("\nIniciando trading em tempo real...");
		await runLiveTrading(this.signalChecker);
	}
}

// Executar o Elite Trader
(async () => {
	const eliteTrader = new EliteTrader();
	await eliteTrader.start();
})().catch(console.error);
