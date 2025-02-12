// src/services/binance.service.js
const axios = require("axios");

async function getHistoricalData(symbol, interval, startTime, endTime) {
	try {
		const response = await axios.get("https://api.binance.com/api/v3/klines", {
			params: {
				symbol,
				interval,
				startTime,
				endTime,
				limit: 1000,
			},
		});

		return response.data.map((candle) => ({
			timestamp: Number.parseInt(candle[0]),
			open: candle[1],
			high: candle[2],
			low: candle[3],
			close: candle[4],
			volume: candle[5],
		}));
	} catch (error) {
		console.error("Erro ao buscar dados históricos da Binance:", error);
		throw error;
	}
}

module.exports = { getHistoricalData };
