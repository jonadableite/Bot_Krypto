//src/utils/calculatePositionSize.js
function calculatePositionSize(balance, risk, price, stopLoss) {
	const riskAmount = balance * risk;
	const stopLossDistance = Math.abs(price - stopLoss);
	return Math.min(riskAmount / stopLossDistance, balance * 0.1);
}

module.exports = calculatePositionSize;
