// scripts/trainAndPredict.js
const tf = require("@tensorflow/tfjs-node");
const PricePredictionModel = require("../src/models/pricePredictionModel");
const binanceService = require("../src/services/binance.service");
const technicalindicators = require("technicalindicators");
const fs = require("fs").promises;
const path = require("path");

class EliteTrainAndPredict {
	constructor() {
		this.config = {
			SYMBOL: "BTCUSDT",
			INTERVAL: "1h",
			LOOKBACK_WINDOW: 48,
			NUM_FEATURES: 13,
			LEARNING_RATE: 0.001,
			EPOCHS: 100,
			BATCH_SIZE: 32,
			TRAIN_TEST_SPLIT: 0.8,
			MODEL_PATH: path.join(__dirname, "../models/saved_model"),
			DATA_PATH: path.join(__dirname, "../data/historical_data.json"),
		};
		this.model = new PricePredictionModel(this.config);
	}

	async run() {
		console.log("Iniciando processo de treinamento e previsão...");

		await this.loadOrFetchData();
		await this.preprocessData();
		await this.trainModel();
		await this.evaluateModel();
		await this.makePrediction();

		console.log("Processo concluído com sucesso.");
	}

	async loadOrFetchData() {
		try {
			const data = await fs.readFile(this.config.DATA_PATH, "utf8");
			this.historicalData = JSON.parse(data);
			console.log("Dados históricos carregados do arquivo.");
		} catch (error) {
			console.log("Buscando dados históricos da API...");
			const endTime = Date.now();
			const startTime = endTime - 1000 * 60 * 60 * 24 * 30 * 3; // 3 meses
			this.historicalData = await binanceService.getHistoricalData(
				this.config.SYMBOL,
				this.config.INTERVAL,
				startTime,
				endTime,
			);
			await fs.writeFile(
				this.config.DATA_PATH,
				JSON.stringify(this.historicalData),
			);
			console.log("Dados históricos salvos em arquivo para uso futuro.");
		}
	}

	async preprocessData() {
		console.log("Pré-processando dados...");
		const { features, labels } = this.model.prepareData(this.historicalData);

		const splitIndex = Math.floor(
			features.length * this.config.TRAIN_TEST_SPLIT,
		);
		this.trainFeatures = features.slice(0, splitIndex);
		this.trainLabels = labels.slice(0, splitIndex);
		this.testFeatures = features.slice(splitIndex);
		this.testLabels = labels.slice(splitIndex);

		console.log(
			`Dados divididos em ${this.trainFeatures.length} amostras de treino e ${this.testFeatures.length} de teste.`,
		);
	}

	async trainModel() {
		console.log("Construindo e treinando o modelo...");
		await this.model.buildModel();

		const startTime = Date.now();
		await this.model.trainModel(this.trainFeatures, this.trainLabels);
		const endTime = Date.now();

		console.log(
			`Treinamento concluído em ${((endTime - startTime) / 1000).toFixed(2)} segundos.`,
		);
		await this.model.saveModel(this.config.MODEL_PATH);
	}

	async evaluateModel() {
		console.log("Avaliando o modelo...");
		const predictions = await this.model.batchPredict(this.testFeatures);
		const mse = tf.metrics
			.meanSquaredError(this.testLabels, predictions)
			.dataSync()[0];
		const rmse = Math.sqrt(mse);
		const mae = tf.metrics
			.meanAbsoluteError(this.testLabels, predictions)
			.dataSync()[0];

		console.log(`Métricas de avaliação:
    MSE: ${mse.toFixed(4)}
    RMSE: ${rmse.toFixed(4)}
    MAE: ${mae.toFixed(4)}`);

		// Calcular direção correta (para cima/para baixo)
		const actualDirection = this.testLabels
			.slice(1)
			.map((v, i) => (v > this.testLabels[i] ? 1 : 0));
		const predictedDirection = predictions
			.slice(1)
			.map((v, i) => (v > predictions[i] ? 1 : 0));
		const correctDirection = actualDirection.filter(
			(v, i) => v === predictedDirection[i],
		).length;
		const directionAccuracy = correctDirection / actualDirection.length;

		console.log(
			`Acurácia da direção: ${(directionAccuracy * 100).toFixed(2)}%`,
		);
	}

	async makePrediction() {
		console.log("Fazendo previsão para o próximo período...");
		const latestData = this.historicalData.slice(-this.config.LOOKBACK_WINDOW);
		const prediction = await this.model.predict(latestData);

		const lastPrice = this.historicalData[this.historicalData.length - 1].close;
		const priceChange = prediction - lastPrice;
		const percentageChange = (priceChange / lastPrice) * 100;

		console.log(`Último preço conhecido: $${lastPrice.toFixed(2)}`);
		console.log(
			`Previsão de preço para o próximo período: $${prediction.toFixed(2)}`,
		);
		console.log(
			`Mudança prevista: $${priceChange.toFixed(2)} (${percentageChange.toFixed(2)}%)`,
		);

		// Calcular alguns indicadores técnicos para contexto adicional
		const closes = this.historicalData.slice(-14).map((d) => d.close);
		const rsi = technicalindicators.RSI.calculate({
			period: 14,
			values: closes,
		});
		const lastRSI = rsi[rsi.length - 1];

		const sma50 = technicalindicators.SMA.calculate({
			period: 50,
			values: this.historicalData.map((d) => d.close),
		});
		const lastSMA50 = sma50[sma50.length - 1];

		console.log(`RSI atual: ${lastRSI.toFixed(2)}`);
		console.log(`SMA 50 atual: $${lastSMA50.toFixed(2)}`);
		console.log(
			`O preço está ${lastPrice > lastSMA50 ? "acima" : "abaixo"} da SMA 50.`,
		);
	}
}

// Executar o processo
const eliteTrainer = new EliteTrainAndPredict();
eliteTrainer.run().catch(console.error);
