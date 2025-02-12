//src/utils/updatePosition.js
const config = require("../config");

function updatePosition(position, currentPrice, atr) {
	if (position.type === "COMPRA" && currentPrice > position.entry) {
		const newStopLoss = Math.max(position.stopLoss, currentPrice - 2 * atr);
		position.stopLoss = newStopLoss;
	} else if (position.type === "VENDA" && currentPrice < position.entry) {
		const newStopLoss = Math.min(position.stopLoss, currentPrice + 2 * atr);
		position.stopLoss = newStopLoss;
	}

	if (position.trailingStop === null) {
		if (
			Math.abs(currentPrice - position.entry) / position.entry >
			config.TRAILING_STOP_ACTIVATION
		) {
			position.trailingStop =
				position.type === "COMPRA"
					? currentPrice * (1 - config.TRAILING_STOP_DISTANCE)
					: currentPrice * (1 + config.TRAILING_STOP_DISTANCE);
		}
	} else {
		if (
			position.type === "COMPRA" &&
			currentPrice > position.trailingStop / (1 - config.TRAILING_STOP_DISTANCE)
		) {
			position.trailingStop =
				currentPrice * (1 - config.TRAILING_STOP_DISTANCE);
		} else if (
			position.type === "VENDA" &&
			currentPrice < position.trailingStop / (1 + config.TRAILING_STOP_DISTANCE)
		) {
			position.trailingStop =
				currentPrice * (1 + config.TRAILING_STOP_DISTANCE);
		}
	}
}

module.exports = updatePosition;
