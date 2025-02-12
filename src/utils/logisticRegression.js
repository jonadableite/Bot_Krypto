//src/utils/logisticRegression.js

class LogisticRegression {
	constructor(numFeatures) {
		this.weights = new Array(numFeatures).fill(0);
		this.bias = 0;
	}

	sigmoid(z) {
		return 1 / (1 + Math.exp(-z));
	}

	predict(features) {
		const z =
			features.reduce((sum, feature, i) => sum + feature * this.weights[i], 0) +
			this.bias;
		return this.sigmoid(z);
	}

	train(features, labels, learningRate, iterations) {
		for (let i = 0; i < iterations; i++) {
			for (let j = 0; j < features.length; j++) {
				const prediction = this.predict(features[j]);
				const error = labels[j] - prediction;

				for (let k = 0; k < this.weights.length; k++) {
					this.weights[k] += learningRate * error * features[j][k];
				}
				this.bias += learningRate * error;
			}
		}
	}
}

module.exports = LogisticRegression;
