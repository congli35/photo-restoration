import { getBalance } from "./procedures/get-balance";
import { getTransactions } from "./procedures/get-transactions";
import { topupCredits } from "./procedures/topup-credits";

export const creditsRouter = {
	balance: getBalance,
	transactions: getTransactions,
	topup: topupCredits,
};
