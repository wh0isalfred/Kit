/**
 * Regional pricing configuration.
 *
 * THIS IS THE FILE TO EDIT when prices or regions change.
 *
 * Detection is by the country the parent SELECTS on the application
 * form — not by parsing their phone number's dial code. That matters:
 * dial codes are ambiguous (+7 is both Russia and Kazakhstan, +39 is
 * both Italy and Vatican City) and prefix-matching them requires
 * fragile longest-match-first logic. An ISO country code from a
 * dropdown the user actually clicked is unambiguous.
 *
 * NOTE: the amount charged is still written onto the application row
 * at submission time (ADR 013), so changing a price here never
 * retroactively alters historical revenue.
 */

/** ISO 3166-1 alpha-2 codes charged in GBP. */
export const EUROPE: readonly string[] = [
  "AL", // Albania
  "AD", // Andorra
  "AM", // Armenia
  "AT", // Austria
  "AZ", // Azerbaijan (transcontinental)
  "BY", // Belarus
  "BE", // Belgium
  "BA", // Bosnia and Herzegovina
  "BG", // Bulgaria
  "HR", // Croatia
  "CY", // Cyprus
  "CZ", // Czech Republic
  "DK", // Denmark
  "EE", // Estonia
  "FI", // Finland
  "FR", // France
  "GE", // Georgia (transcontinental)
  "DE", // Germany
  "GR", // Greece
  "HU", // Hungary
  "IS", // Iceland
  "IE", // Ireland
  "IT", // Italy
  "KZ", // Kazakhstan (transcontinental)
  "XK", // Kosovo
  "LV", // Latvia
  "LI", // Liechtenstein
  "LT", // Lithuania
  "LU", // Luxembourg
  "MT", // Malta
  "MD", // Moldova
  "MC", // Monaco
  "ME", // Montenegro
  "NL", // Netherlands
  "MK", // North Macedonia
  "NO", // Norway
  "PL", // Poland
  "PT", // Portugal
  "RO", // Romania
  "RU", // Russia (transcontinental)
  "SM", // San Marino
  "RS", // Serbia
  "SK", // Slovakia
  "SI", // Slovenia
  "ES", // Spain
  "SE", // Sweden
  "CH", // Switzerland
  "TR", // Turkey (transcontinental)
  "UA", // Ukraine
  "GB", // United Kingdom
  "VA", // Vatican City
];

export type Region = "NG" | "EU";
export type Currency = "NGN" | "GBP";

/** Which pricing region a country falls into. */
export function regionFor(countryCode: string | null | undefined): Region {
  if (!countryCode) return "NG";
  return EUROPE.includes(countryCode.toUpperCase()) ? "EU" : "NG";
}

export function currencyFor(region: Region): Currency {
  return region === "EU" ? "GBP" : "NGN";
}

/**
 * Formats a MINOR-unit amount (kobo or pence) for display.
 * £20.00 is stored as 2000; ₦15,000 as 1500000.
 */
export function formatMinor(amountMinor: number, currency: Currency): string {
  if (currency === "GBP") {
    return `£${(amountMinor / 100).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `₦${(amountMinor / 100).toLocaleString("en-NG")}`;
}