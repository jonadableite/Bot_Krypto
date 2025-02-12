// src/models/pricePredictionModel.js
const tf = require("@tensorflow/tfjs-node");
const technicalindicators = require("technicalindicators");

class PricePredictionModel {
	constructor(config) {
		this.config = config;
		this.model = null;
		this.meanStd = null;
		this.lookbackWindow = config.LOOKBACK_WINDOW || 50;
		this.numFeatures = config.NUM_FEATURES || 13;
		this.inputShape = [this.lookbackWindow, this.numFeatures];
	}

	async buildModel() {
		this.model = tf.sequential({
			layers: [
				tf.layers.lstm({
					units: 50,
					returnSequences: true,
					inputShape: this.inputShape,
				}),
				tf.layers.dropout({ rate: 0.2 }),
				tf.layers.lstm({ units: 25, returnSequences: false }),
				tf.layers.dropout({ rate: 0.2 }),
				tf.layers.dense({ units: 10, activation: "relu" }),
				tf.layers.dense({ units: 1 }),
			],
		});

		const optimizer = tf.train.adam(this.config.LEARNING_RATE);
		this.model.compile({
			optimizer: optimizer,
			loss: "meanSquaredError",
			metrics: ["mae"],
		});

		console.log(this.model.summary());
	}

	prepareData(data) {
		console.log(`Preparando dados. Total de candles: ${data.length}`);
		console.log("Primeiros 5 candles:", data.slice(0, 5));

		const features = [];
		const labels = [];

		for (let i = this.lookbackWindow; i < data.length; i++) {
			const windowData = data.slice(i - this.lookbackWindow, i);
			if (windowData.every((d) => d.timestamp && !isNaN(d.close))) {
				const extractedFeatures = this.extractFeatures(windowData);
				if (extractedFeatures.length === this.lookbackWindow) {
					features.push(extractedFeatures);
					labels.push(data[i].close);
				}
			}
		}

		console.log(
			`Dados preparados. Features: ${features.length}, Labels: ${labels.length}`,
		);
		if (features.length === 0) {
			throw new Error(
				"Não há dados suficientes para treinamento após a preparação",
			);
		}

		return { features, labels };
	}

	extractFeatures(windowData) {
		if (windowData.length < this.lookbackWindow) {
			console.log(
				`Aviso: Dados insuficientes para extração de features. Esperado: ${this.lookbackWindow}, Obtido: ${windowData.length}`,
			);
			return [];
		}

		const closes = windowData.map((d) => Number.parseFloat(d.close));
		const volumes = windowData.map((d) => Number.parseFloat(d.volume));

		const sma = technicalindicators.SMA.calculate({
			period: 14,
			values: closes,
		});
		const rsi = technicalindicators.RSI.calculate({
			period: 14,
			values: closes,
		});
		const macd = technicalindicators.MACD.calculate({
			fastPeriod: 12,
			slowPeriod: 26,
			signalPeriod: 9,
			values: closes,
		});
		const bollinger = technicalindicators.BollingerBands.calculate({
			period: 20,
			stdDev: 2,
			values: closes,
		});

		return windowData
			.map((d, i) => {
				const features = [
					Number.parseFloat(d.open),
					Number.parseFloat(d.high),
					Number.parseFloat(d.low),
					Number.parseFloat(d.close),
					Number.parseFloat(d.volume),
					sma[i] || 0,
					rsi[i] || 0,
					macd[i]?.MACD || 0,
					macd[i]?.signal || 0,
					macd[i]?.histogram || 0,
					bollinger[i]?.upper || 0,
					bollinger[i]?.middle || 0,
					bollinger[i]?.lower || 0,
				];

				if (features.some((f) => isNaN(f) || !isFinite(f))) {
					console.log(
						`Aviso: Feature inválida encontrada no índice ${i}:`,
						features,
					);
					return null;
				}

				return features;
			})
			.filter((feature) => feature !== null);
	}

	normalizeData(features, labels) {
		const featureTensor = tf.tensor3d(features);
		const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

		const featureMean = featureTensor.mean(0);
		const featureStd = featureTensor
			.sub(featureMean)
			.square()
			.mean(0)
			.sqrt()
			.add(tf.scalar(1e-8));
		const labelMean = labelTensor.mean();
		const labelStd = labelTensor
			.sub(labelMean)
			.square()
			.mean()
			.sqrt()
			.add(tf.scalar(1e-8));

		const normalizedFeatures = featureTensor.sub(featureMean).div(featureStd);
		const normalizedLabels = labelTensor.sub(labelMean).div(labelStd);

		this.meanStd = { featureMean, featureStd, labelMean, labelStd };

		return { features: normalizedFeatures, labels: normalizedLabels };
	}

	async trainModel(data) {
		console.log(
			`Iniciando treinamento do modelo... Total de exemplos: ${data.length}`,
		);
		const { features, labels } = this.prepareData(data);

		if (features.length === 0 || labels.length === 0) {
			throw new Error("Não há dados suficientes para treinamento");
		}

		console.log(`Número de exemplos após preparação: ${features.length}`);
		const { features: normalizedFeatures, labels: normalizedLabels } =
			this.normalizeData(features, labels);

		console.log("Iniciando o processo de fit do modelo...");
		const history = await this.model.fit(normalizedFeatures, normalizedLabels, {
			epochs: this.config.TRAINING_ITERATIONS,
			batchSize: this.config.BATCH_SIZE || 32,
			validationSplit: 0.2,
			callbacks: {
				onEpochEnd: (epoch, logs) => {
					console.log(
						`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}, mae = ${logs.mae.toFixed(4)}, val_mae = ${logs.val_mae.toFixed(4)}`,
					);
				},
			},
		});
		console.log("Treinamento do modelo concluído.");
		return history;
	}

	async predict(inputData) {
		const features = this.extractFeatures(
			inputData.slice(-this.lookbackWindow),
		);
		if (features.length !== this.lookbackWindow) {
			console.log(
				`Aviso: Número incorreto de features para previsão. Esperado: ${this.lookbackWindow}, Obtido: ${features.length}`,
			);
			return null;
		}

		const featureTensor = tf.tensor3d([features]);
		const normalizedFeatures = featureTensor
			.sub(this.meanStd.featureMean)
			.div(this.meanStd.featureStd);
		const normalizedPrediction = this.model.predict(normalizedFeatures);
		const prediction = normalizedPrediction
			.mul(this.meanStd.labelStd)
			.add(this.meanStd.labelMean);

		return prediction.dataSync()[0];
	}

	async saveModel(basePath) {
		const modelPath = path.join(basePath, "price_prediction_model");
		await this.model.save(`file://${modelPath}`);
		console.log(`Modelo salvo em: ${modelPath}`);
	}

	async loadModel(path) {
		this.model = await tf.loadLayersModel(`file://${path}`);
		console.log(`Modelo carregado de: ${path}`);
		console.log(this.model.summary());
	}

	async evaluate(testData) {
		const { features, labels } = this.prepareData(testData);
		const { features: normalizedFeatures, labels: normalizedLabels } =
			this.normalizeData(features, labels);
		const result = await this.model.evaluate(
			normalizedFeatures,
			normalizedLabels,
		);
		console.log(
			`Avaliação: Loss = ${result[0].toFixed(4)}, MAE = ${result[1].toFixed(4)}`,
		);
		return result;
	}
}

module.exports = PricePredictionModel;
