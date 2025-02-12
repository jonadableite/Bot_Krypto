// src/services/whatsapp.service.js
const config = require("../config");
const axios = require("axios");

async function sendWhatsAppMessage(message) {
	try {
		await axios.post(
			`https://evo.whatlead.com.br/message/sendText/${config.WHATSAPP_INSTANCE}`,
			{
				number: config.PHONE_NUMBER,
				textMessage: { text: message },
			},
			{
				headers: {
					apikey: config.WHATSAPP_API_KEY,
				},
			},
		);
		console.log("Mensagem WhatsApp enviada com sucesso");
	} catch (error) {
		console.error("Erro ao enviar mensagem WhatsApp:", error);
	}
}

module.exports = {
	sendWhatsAppMessage,
};
