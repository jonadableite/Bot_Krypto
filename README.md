Bot Krypto Elite
Bot Krypto Elite é um sistema de trading algorítmico avançado para criptomoedas, utilizando aprendizado de máquina e análise técnica para prever movimentos de preços e executar trades automaticamente.

Autor
Jonadab Leite

Email: jonadab.leite@gmail.com

Características
Previsão de preços usando modelos de aprendizado de máquina (LSTM com TensorFlow.js)
Análise técnica com múltiplos indicadores (ATR, Bollinger Bands, EMA, MACD, RSI, Stochastic RSI)
Backtesting com dados históricos
Estratégias de Smart Money Concepts (SMC)
Integração com WhatsApp para notificações
Cálculo de tamanho de posição e gerenciamento de risco
Identificação de padrões de candlestick
Análise de tendência
Testes de estresse para avaliação de desempenho em diferentes cenários
Requisitos
Node.js (v14+)
npm ou yarn
Instalação
Clone o repositório:
git clone https://github.com/jonadab-leite/botkryptoelite.git

cd botkryptoelite

Instale as dependências:
npm install

Configure as variáveis de ambiente:
Crie um arquivo .env na raiz do projeto e adicione suas chaves API necessárias.

Uso
Para iniciar o Bot Krypto Elite:
npm start

Para executar testes:
npm test

Estrutura do Projeto
src/
indicators/: Implementações de indicadores técnicos
models/: Modelos de aprendizado de máquina
scripts/: Scripts úteis, como treinamento e previsão
services/: Serviços para API da Binance, manipulação de dados e integração WhatsApp
strategies/: Estratégias de trading (ex: SMC)
utils/: Funções utilitárias diversas
backtest.js: Lógica de backtesting
config.js: Configurações do sistema
liveTrading.js: Lógica para trading ao vivo
signalChecker.js: Verificação de sinais de trading
eliteTrader.js: Componente principal do bot
index.js: Ponto de entrada da aplicação
Dependências Principais
@tensorflow/tfjs-node: ^4.22.0
axios: ^1.7.9
csv-parser: ^3.2.0
csv-writer: ^1.6.0
node-plot: ^1.0.0
technicalindicators: ^3.1.0
uuid: ^11.0.5
Configuração
Edite o arquivo src/config.js para ajustar parâmetros como símbolo de trading, intervalo de tempo, configurações de risco, e parâmetros dos modelos.

Contribuindo
Contribuições são bem-vindas! Por favor, abra uma issue para discutir mudanças importantes antes de submeter um pull request.

Avisos Legais
Este software é fornecido "como está", sem garantias de qualquer tipo.
Trading envolve alto risco. Use por sua conta e risco.
Não é recomendação financeira. Sempre faça sua própria pesquisa e consulte um profissional financeiro antes de investir.
Licença
ISC License

Copyright (c) 2025 Jonadab Leite

Permission to use, copy, modify, and/or distribute this software for any

purpose with or without fee is hereby granted, provided that the above

copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES

WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF

MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR

ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES

WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN

ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF

OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

