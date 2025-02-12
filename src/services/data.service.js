// src/services/data.service.js
const fs = require("node:fs").promises;
const path = require("node:path");
const binanceService = require("./binance.service");

async function fetchAndSaveData(
	symbol,
	interval,
	startTime,
	endTime,
	fileName,
) {
	const dataDir = path.join(__dirname, "..", "..", "data");
	const dataPath = path.join(dataDir, fileName);

	try {
		await fs.mkdir(dataDir, { recursive: true });

		let data;
		try {
			await fs.access(dataPath);
			console.log(
				`Arquivo de dados ${fileName} já existe. Usando dados existentes.`,
			);
			const fileContent = await fs.readFile(dataPath, "utf-8");
			data = fileContent
				.split("\n")
				.slice(1)
				.map((line) => {
					const [timestamp, open, high, low, close, volume] = line.split(",");
					return {
						timestamp: Number.parseInt(timestamp),
						open,
						high,
						low,
						close,
						volume,
					};
				});
		} catch (error) {
			if (error.code === "ENOENT") {
				console.log(`Buscando dados da Binance para ${symbol}...`);
				data = await binanceService.getHistoricalData(
					symbol,
					interval,
					startTime,
					endTime,
				);

				const csvContent = data
					.map(
						(candle) =>
							`${candle.timestamp},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume}`,
					)
					.join("\n");

				await fs.writeFile(
					dataPath,
					`timestamp,open,high,low,close,volume\n${csvContent}`,
				);
				console.log(`Dados salvos em ${dataPath}`);
			} else {
				throw error;
			}
		}

		console.log("Primeiros 5 candles:", data.slice(0, 5));

		return data.map((candle) => ({
			timestamp: Number.parseInt(candle.timestamp),
			open: Number.parseFloat(candle.open),
			high: Number.parseFloat(candle.high),
			low: Number.parseFloat(candle.low),
			close: Number.parseFloat(candle.close),
			volume: Number.parseFloat(candle.volume),
		}));
	} catch (error) {
		console.error("Erro ao buscar ou salvar dados:", error);
		throw error;
	}
}

module.exports = { fetchAndSaveData };
