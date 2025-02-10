"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import type { TaxInfo, TreatyExemption, TreatyRate, incomeCode } from "@/app/types"
import { TreatyExemptionInput } from "@/components/treaty-exemption-input"

const standardDeduction = 14600
const saltMaxDeduction = 10000

const treatyExemptions: Record<string, TreatyExemption[]> = {
  china: [
    {
      code: "20",
      name: "Treaty Benefits for Studying and Training (up to $5,000)",
      max: 5000,
      applyTo: "wages",
    },
    {
      code: "19",
      name: "Treaty Benefits for Teaching and Research",
      max: null,
      applyTo: "wages",
    },
    {
      code: "16",
      name: "Treaty Benefits for Scholarship or Fellowship Grants",
      max: null,
      applyTo: "scholarships",
    }
  ],
  southKorea: [
    {
      code: "16",
      name: "Treaty Benefits for Scholarship or Fellowship Grants",
      max: null,
      applyTo: "scholarships",
    },
    {
      code: "19",
      name: "Treaty Benefits for Teaching and Research",
      max: null,
      applyTo: "wages",
    },
    {
      code: "20",
      name: "Treaty Benefits for Studying and Training (up to $2,000)",
      max: 2000,
      applyTo: "wages",
    }
  ],
  india: [
    {
      code: "19",
      name: "Treaty Benefits for Teaching and Research",
      max: null,
      applyTo: "wages",
    }
  ]
}

const treatyRates: Record<string, TreatyRate[]> = {
  southKorea: [
    {
      type: "capitalGains",
      name: "Treaty Rate for Capital Gains",
      rate: 0.0,
    }
  ]
}


export default function TaxCalculator() {
  const [taxInfo, setTaxInfo] = useState<TaxInfo>({
    foreignCountry: "",
    wages: 0,
    scholarships: 0,
    capitalGains: 0,
    charitableDistributions: 0,
    stateLocalTaxes: 0,
    claimTreatyExemptions: {},
    claimTreatyRates: {}
  })
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const toggleAdvanced = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsAdvancedOpen((prev) => !prev)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name == "foreignCountry") {
      setTaxInfo((prev) => ({ ...prev, foreignCountry: value }))
      return
    }

    let correctedValue = Number(value.replace(/^0+/, ""))
    if (name === "capitalGains") {
      correctedValue = Math.max(0, correctedValue)
    }
    
    setTaxInfo((prev) => {
      const newState = { ...prev, [name]: correctedValue }
      
      // Update treaty exemptions when wages change
      if (name === "wages") {
        const newTreatyExemptions = { ...prev.claimTreatyExemptions }
        const countryExemptions = treatyExemptions[prev.foreignCountry] || []
        Object.keys(newTreatyExemptions).forEach(code => {
          const exemption = countryExemptions.find(b => b.code === code)
          if (exemption?.applyTo === "wages") {
            const maxAmount = exemption.max ? Math.min(exemption.max, correctedValue) : correctedValue
            newTreatyExemptions[code as incomeCode] = maxAmount
          }
        })
        newState.claimTreatyExemptions = newTreatyExemptions
      }
      
      return newState
    })
  }

  const handleForeignCountryChange = (value: string) => {
    setTaxInfo((prev) => ({ ...prev, foreignCountry: value }))
  }

  const preventWheelChange = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur()
  }, [])

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    const code = name as incomeCode
    setTaxInfo((prev) => {
      const newTreatyExemptions = { ...prev.claimTreatyExemptions }
      if (checked) {
        const countryExemptions = treatyExemptions[prev.foreignCountry] || []
        const exemption = countryExemptions.find(b => b.code === code)
        
        if (exemption?.applyTo === "wages") {
          countryExemptions
            .filter(b => b.applyTo === "wages" && b.code !== code)
            .forEach(b => delete newTreatyExemptions[b.code])
          
          const maxAmount = exemption.max ? Math.min(exemption.max, prev.wages) : prev.wages
          newTreatyExemptions[code] = maxAmount
        } else if (exemption?.applyTo === "scholarships") {
          newTreatyExemptions[code] = prev.scholarships
        }
      } else {
        delete newTreatyExemptions[code]
      }
      return {
        ...prev,
        claimTreatyExemptions: newTreatyExemptions
      }
    })
  }

  const handleTreatyRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTaxInfo(prev => ({
      ...prev,
      claimTreatyRates: {
        ...prev.claimTreatyRates,
        [e.target.id]: e.target.checked
      }
    }))
  }

  // Helper function to calculate tax based on 2024 tax brackets
  const calculateTaxUsingBrackets = (taxableIncome: number): number => {
    const brackets = [
      { rate: 0.1, max: 11600 },
      { rate: 0.12, max: 47150 },
      { rate: 0.22, max: 100525 },
      { rate: 0.24, max: 191950 },
      { rate: 0.32, max: 243725 },
      { rate: 0.35, max: 609350 },
      { rate: 0.37, max: Number.POSITIVE_INFINITY },
    ]

    let tax = 0
    let remainingIncome = taxableIncome

    for (const bracket of brackets) {
      if (remainingIncome > 0) {
        const taxableInThisBracket = Math.min(remainingIncome, bracket.max)
        tax += taxableInThisBracket * bracket.rate
        remainingIncome -= taxableInThisBracket
      } else {
        break
      }
    }

    return tax
  }

  const calculateTreatyExemptions = (
    foreignCountry: string,
    scholarships: number,
    wages: number,
    claimTreatyExemptions: TaxInfo["claimTreatyExemptions"]
  ): { exemptScholarships: number; exemptWages: number } => {
    if (foreignCountry in treatyExemptions) {
      const countryExemptions = treatyExemptions[foreignCountry]
      
      const wageExemptions = countryExemptions
        .filter(exemption => exemption.applyTo === "wages" && claimTreatyExemptions[exemption.code])
        .reduce((total, exemption) => {
          const remainingWages = wages - total
          const exemptAmount = exemption.max 
            ? Math.min(remainingWages, claimTreatyExemptions[exemption.code] || 0, exemption.max)
            : Math.min(remainingWages, claimTreatyExemptions[exemption.code] || 0)
          return total + exemptAmount
        }, 0)

      const scholarshipExemptions = countryExemptions
        .filter(exemption => exemption.applyTo === "scholarships" && claimTreatyExemptions[exemption.code])
        .reduce((total, exemption) => total + (claimTreatyExemptions[exemption.code] || 0), 0)

      return {
        exemptScholarships: scholarshipExemptions,
        exemptWages: wageExemptions,
      }
    }
    
    return {
      exemptScholarships: 0,
      exemptWages: 0,
    }
  }

  const calculateItemizedDeduction = (
    foreignCountry: string,
    charitableDistributions: number,
    stateLocalTaxes: number,
  ): number => {
    const saltDeduction = Math.min(stateLocalTaxes, saltMaxDeduction)
    if (foreignCountry === "india") {
      return Math.max(standardDeduction, charitableDistributions + saltDeduction)
    }
    return charitableDistributions + saltDeduction
  }

  const calculateTaxOnNec = (
    foreignCountry: string,
    capitalGains: number,
    claimTreatyRates: TaxInfo["claimTreatyRates"]
  ): number => {
    if (claimTreatyRates["capitalGains"] && foreignCountry in treatyRates) {
      const treatyRate = treatyRates[foreignCountry].find(r => r.type === "capitalGains")
      if (treatyRate) {
        return capitalGains * treatyRate.rate
      }
    }
    return capitalGains * 0.3 // Default 30% rate if no treaty rate applies
  }

  const calculateTax = () => {
    const { 
      foreignCountry, 
      wages, 
      scholarships, 
      capitalGains, 
      charitableDistributions, 
      stateLocalTaxes,
      claimTreatyExemptions,
      claimTreatyRates,
    } = taxInfo

    const { exemptScholarships, exemptWages } = calculateTreatyExemptions(
      foreignCountry, 
      scholarships, 
      wages,
      claimTreatyExemptions
    )

    const totalEffectivelyConnectedIncome = wages - exemptWages
    const totalAdjustmentsToIncome = scholarships - exemptScholarships
    const adjustedGrossIncome = totalEffectivelyConnectedIncome + totalAdjustmentsToIncome
    const itemizedDeductions = calculateItemizedDeduction(foreignCountry, charitableDistributions, stateLocalTaxes)
    const taxableIncome = Math.max(0, adjustedGrossIncome - itemizedDeductions)

    const taxOnEffectivelyConnectedIncome = calculateTaxUsingBrackets(taxableIncome)
    const taxOnIncomeNotEffectivelyConnected = calculateTaxOnNec(foreignCountry, capitalGains, claimTreatyRates)
    const totalTax = taxOnEffectivelyConnectedIncome + taxOnIncomeNotEffectivelyConnected

    const totalIncome = wages + scholarships + capitalGains;
    const effectiveTaxRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0

    return {
      totalEffectivelyConnectedIncome,
      totalAdjustmentsToIncome,
      adjustedGrossIncome,
      itemizedDeductions,
      taxableIncome,
      taxOnEffectivelyConnectedIncome,
      taxOnIncomeNotEffectivelyConnected,
      totalTax,
      effectiveTaxRate,
      exemptScholarships,
      exemptWages,
    }
  }

  const taxResults = calculateTax()

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Federal Tax Calculator for Non-Resident Alien Foreign Students in the US</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Disclaimer</AlertTitle>
            <AlertDescription>
              This tax calculator is for informational purposes only and does not constitute tax advice.
              Everything here is not guaranteed to be accurate and does not apply to all situations.
              Please consult with a tax professional regarding your tax situation.
            </AlertDescription>
          </Alert>
          <form className="space-y-4 mb-8" onSubmit={(e) => e.preventDefault()}>
            <div>
              <Label htmlFor="foreignCountry">Foreign Country</Label>
              <Select onValueChange={handleForeignCountryChange} value={taxInfo.foreignCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your foreign country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="china">China, People&#39;s Republic of</SelectItem>
                  <SelectItem value="southKorea">Korea, South</SelectItem>
                  <SelectItem value="india">India</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="wages">Wages (Form 1040-NR, Line 1a)</Label>
              <Input
                type="number"
                id="wages"
                name="wages"
                className="no-spinner"
                onWheel={preventWheelChange}
                value={taxInfo.wages === 0 ? "" : taxInfo.wages}
                onChange={handleInputChange}
                onBlur={(e) => {
                  const value = e.target.value === "" ? 0 : Number(e.target.value)
                  setTaxInfo((prev) => ({ ...prev, wages: value }))
                }}
              />
            </div>
            {taxInfo.foreignCountry && taxInfo.wages > 0 && treatyExemptions[taxInfo.foreignCountry] && (
              <div className="space-y-4">
                {treatyExemptions[taxInfo.foreignCountry]
                  .filter(exemption => exemption.applyTo === "wages")
                  .map((exemption) => (
                    <TreatyExemptionInput
                      key={exemption.code}
                      exemption={exemption}
                      claimTreatyExemptions={taxInfo.claimTreatyExemptions}
                      onCheckboxChange={handleCheckboxChange}
                    />
                  ))}
              </div>
            )}
            <div>
              <Label htmlFor="scholarships">Scholarship and fellowship grants (Schedule 1, Line 8r)</Label>
              <Input
                type="number"
                id="scholarships"
                name="scholarships"
                className="no-spinner"
                onWheel={preventWheelChange}
                value={taxInfo.scholarships === 0 ? "" : taxInfo.scholarships}
                onChange={handleInputChange}
                onBlur={(e) => {
                  const value = e.target.value === "" ? 0 : Number(e.target.value)
                  setTaxInfo((prev) => ({ ...prev, scholarships: value }))
                }}
              />
            </div>
            {taxInfo.foreignCountry && taxInfo.scholarships > 0 && treatyExemptions[taxInfo.foreignCountry] && (
              <div className="space-y-4">
                {treatyExemptions[taxInfo.foreignCountry]
                  .filter(exemption => exemption.applyTo === "scholarships")
                  .map((exemption) => (
                    <TreatyExemptionInput
                      key={exemption.code}
                      exemption={exemption}
                      claimTreatyExemptions={taxInfo.claimTreatyExemptions}
                      onCheckboxChange={handleCheckboxChange}
                    />
                  ))}
              </div>
            )}
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" onClick={toggleAdvanced} variant="outline" className="w-full justify-between">
                  Advanced Options
                  {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="capitalGains">Capital gain (Schedule NEC, Line 9)</Label>
                  <Input
                    type="number"
                    id="capitalGains"
                    name="capitalGains"
                    min="0"
                    className="no-spinner"
                    onWheel={preventWheelChange}
                    value={taxInfo.capitalGains === 0 ? "" : taxInfo.capitalGains}
                    onChange={handleInputChange}
                    onBlur={(e) => {
                      const value = Math.max(0, e.target.value === "" ? 0 : Number(e.target.value))
                      setTaxInfo((prev) => ({ ...prev, capitalGains: value }))
                    }}
                  />
                  {taxInfo.foreignCountry && taxInfo.capitalGains > 0 && treatyRates[taxInfo.foreignCountry]?.some(r => r.type === "capitalGains") && (
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="capitalGains"
                        checked={taxInfo.claimTreatyRates["capitalGains"]}
                        onChange={handleTreatyRateChange}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="capitalGains">
                        Apply Treaty Rate for Capital Gains ({(treatyRates[taxInfo.foreignCountry]?.find(r => r.type === "capitalGains")?.rate ?? 0.3) * 100}%)
                      </Label>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="charitableDistributions">Gifts to U.S. Charities (Schedule A, Line 5)</Label>
                  <Input
                    type="number"
                    id="charitableDistributions"
                    name="charitableDistributions"
                    className="no-spinner"
                    onWheel={preventWheelChange}
                    value={taxInfo.charitableDistributions === 0 ? "" : taxInfo.charitableDistributions}
                    onChange={handleInputChange}
                    onBlur={(e) => {
                      const value = e.target.value === "" ? 0 : Number(e.target.value)
                      setTaxInfo((prev) => ({ ...prev, charitableDistributions: value }))
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="stateLocalTaxes">State and Local Income Taxes (Schedule A, Line 1a)</Label>
                  <Input
                    type="number"
                    id="stateLocalTaxes"
                    name="stateLocalTaxes"
                    className="no-spinner"
                    onWheel={preventWheelChange}
                    value={taxInfo.stateLocalTaxes === 0 ? "" : taxInfo.stateLocalTaxes}
                    onChange={handleInputChange}
                    onBlur={(e) => {
                      const value = e.target.value === "" ? 0 : Number(e.target.value)
                      setTaxInfo((prev) => ({ ...prev, stateLocalTaxes: value }))
                    }}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line Item</TableHead>
                <TableHead className="text-right">Amount ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(taxResults.exemptScholarships > 0 || taxResults.exemptWages > 0) && (
                <TableRow>
                  <TableCell>1k. Total income exempt by a treaty (Schedule OI, item L, line 1(e))</TableCell>
                  <TableCell className="text-right">
                    {(taxResults.exemptScholarships + taxResults.exemptWages).toFixed(2)}
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell>9. Total Effectively Connected Income</TableCell>
                <TableCell className="text-right">{taxResults.totalEffectivelyConnectedIncome.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>10. Total Adjustments to Income</TableCell>
                <TableCell className="text-right">{taxResults.totalAdjustmentsToIncome.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>11. Adjusted Gross Income</TableCell>
                <TableCell className="text-right">{taxResults.adjustedGrossIncome.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  12. Itemized Deductions
                  {taxInfo.foreignCountry === "india" && " or, for certain residents of India, standard deduction"}
                </TableCell>
                <TableCell className="text-right">{taxResults.itemizedDeductions.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>15. Taxable Income</TableCell>
                <TableCell className="text-right">{taxResults.taxableIncome.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>16. Tax (on Income Effectively Connected With U.S. Trade or Business)</TableCell>
                <TableCell className="text-right">{taxResults.taxOnEffectivelyConnectedIncome.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  23a. Tax on income not effectively connected with a U.S. trade or business (Schedule NEC, line 15)
                </TableCell>
                <TableCell className="text-right">{taxResults.taxOnIncomeNotEffectivelyConnected.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold">24. Total Tax</TableCell>
                <TableCell className="text-right font-bold">{taxResults.totalTax.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold">Effective Tax Rate</TableCell>
                <TableCell className="text-right font-bold">{taxResults.effectiveTaxRate.toFixed(2)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="w-full py-4 mt-8 border-t">
        <p className="text-center text-sm text-gray-500">
          © {format(new Date(), "yyyy")} <a href="https://github.com/aahei" className="hover:underline">Ahei</a>
        </p>
      </div>
    </>
  )
}

