export type incomeCode = "16" | "19" | "20"

export interface TreatyExemption {
  code: incomeCode
  name: string
  max: number | null
  applyTo: "wages" | "scholarships"
}

export interface TaxInfo {
  foreignCountry: string
  wages: number
  scholarships: number
  capitalGains: number
  charitableDistributions: number
  stateLocalTaxes: number
  claimTreatyExemptions: { [key in incomeCode]?: number }
}

export type TreatyBenefit = {
  code: incomeCode
  name: string
  max?: number | null
  applyTo: "wages" | "scholarships" | "capitalGains"
  rate?: number
} 