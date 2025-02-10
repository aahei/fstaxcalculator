export type treatyCode = "20" | "19" | "16"

export type TaxInfo = {
  foreignCountry: string
  wages: number
  scholarships: number
  capitalGains: number
  charitableDistributions: number
  stateLocalTaxes: number
  claimTreatyBenefits: { [key in treatyCode]?: number }
}

export type TreatyBenefit = {
  code: treatyCode
  name: string
  max: number | null
  applyTo: "wages" | "scholarships"
} 