/** The currency module's public API: prices in something other than dollars. */

export { fetchBitcoinRates } from "@modules/currency/data/rates-repository";
export type { BitcoinRates } from "@modules/currency/domain/currency";
export { CurrencyConverter } from "@modules/currency/ui/CurrencyConverter";
