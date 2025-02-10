export type incomeCode = "16" | "19" | "20"

export interface TreatyExemption {
  code: incomeCode
  name: string
  max: number | null
  applyTo: "wages" | "scholarships"
}

export type TaxInfo = {
  foreignCountry: string
  wages: number
  scholarships: number
  capitalGains: number
  charitableDistributions: number
  stateLocalTaxes: number
  claimTreatyExemptions: { [key in incomeCode]?: number }
  claimTreatyRates: { [key in incomeType]?: boolean }
}

export type incomeType = "capitalGains"

export interface TreatyRate {
  type: incomeType
  name: string
  rate: number // 0.00 to 1.00
}
