// src/config.js
require("dotenv").config();

module.exports = {
	SYMBOL: process.env.SYMBOL || "BTCUSDT",
	INTERVAL: process.env.INTERVAL || "15m",
	BACKTEST_DAYS: Number.parseInt(process.env.BACKTEST_DAYS, 10) || 60,
	INITIAL_BALANCE: Number.parseFloat(process.env.INITIAL_BALANCE) || 10000,
	RISK_PER_TRADE: Number.parseFloat(process.env.RISK_PER_TRADE) || 0.03,
	STOP_LOSS_PERCENTAGE:
		Number.parseFloat(process.env.STOP_LOSS_PERCENTAGE) || 0.02,
	TAKE_PROFIT_RATIO: Number.parseFloat(process.env.TAKE_PROFIT_RATIO) || 1.5,
	RSI_PERIOD: Number.parseInt(process.env.RSI_PERIOD, 10) || 14,
	RSI_OVERBOUGHT: Number.parseInt(process.env.RSI_OVERBOUGHT, 10) || 70,
	RSI_OVERSOLD: Number.parseInt(process.env.RSI_OVERSOLD, 10) || 30,
	EMA_SHORT: Number.parseInt(process.env.EMA_SHORT, 10) || 12,
	EMA_MEDIUM: Number.parseInt(process.env.EMA_MEDIUM, 10) || 26,
	EMA_LONG: Number.parseInt(process.env.EMA_LONG, 10) || 50,
	VOLUME_PERIOD: Number.parseInt(process.env.VOLUME_PERIOD, 10) || 20,
	ATR_PERIOD: Number.parseInt(process.env.ATR_PERIOD, 10) || 14,
	TRAILING_STOP_ACTIVATION:
		Number.parseFloat(process.env.TRAILING_STOP_ACTIVATION) || 0.005,
	TRAILING_STOP_DISTANCE:
		Number.parseFloat(process.env.TRAILING_STOP_DISTANCE) || 0.01,
	// Configurações para o modelo de previsão de preços
	LOOKBACK_WINDOW: Number.parseInt(process.env.LOOKBACK_WINDOW, 10) || 50,
	NUM_FEATURES: Number.parseInt(process.env.NUM_FEATURES, 10) || 13,
	LEARNING_RATE: Number.parseFloat(process.env.LEARNING_RATE) || 0.001,
	TRAINING_ITERATIONS:
		Number.parseInt(process.env.TRAINING_ITERATIONS, 10) || 100,
	BATCH_SIZE: Number.parseInt(process.env.BATCH_SIZE, 10) || 32,
	// Configurações para o WhatsApp
	WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY,
	WHATSAPP_INSTANCE: process.env.WHATSAPP_INSTANCE,
	PHONE_NUMBER: process.env.PHONE_NUMBER,
};
