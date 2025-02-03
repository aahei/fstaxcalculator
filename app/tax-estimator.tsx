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

type TaxInfo = {
  foreignCountry: string
  wages: number
  scholarships: number
  capitalGains: number
  charitableDistributions: number
  stateLocalTaxes: number
}

export default function TaxCalculator() {
  const [taxInfo, setTaxInfo] = useState<TaxInfo>({
    foreignCountry: "",
    wages: 0,
    scholarships: 0,
    capitalGains: 0,
    charitableDistributions: 0,
    stateLocalTaxes: 0,
  })
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const toggleAdvanced = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsAdvancedOpen((prev) => !prev)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // Remove leading zeros and convert to number
    let correctedValue = name === "foreignCountry" ? value : Number(value.replace(/^0+/, ""))
    // Ensure capital gains are non-negative
    if (name === "capitalGains") {
      correctedValue = Math.max(0, Number(correctedValue))
    }
    setTaxInfo((prev) => ({ ...prev, [name]: correctedValue }))
  }

  const handleForeignCountryChange = (value: string) => {
    setTaxInfo((prev) => ({ ...prev, foreignCountry: value }))
  }

  const preventWheelChange = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur()
  }, [])

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
  ): { exemptScholarships: number; exemptWages: number } => {
    switch (foreignCountry) {
      case "china":
        return {
          exemptScholarships: scholarships,
          exemptWages: Math.min(wages, 5000), // Exempt up to $5,000 of wages for China
        }
      // Add more countries and their specific exemption rules here
      default:
        return {
          exemptScholarships: 0,
          exemptWages: 0,
        }
    }
  }

  const calculateItemizedDeduction = (
    foreignCountry: string,
    charitableDistributions: number,
    stateLocalTaxes: number,
  ): number => {
    const saltDeduction = Math.min(stateLocalTaxes, 10000) // SALT deduction capped at $10,000
    if (foreignCountry === "india") {
      return Math.max(14600, charitableDistributions + saltDeduction) // Standard deduction for India is $14,600
    }
    return charitableDistributions + saltDeduction
  }

  const calculateTax = () => {
    const { foreignCountry, wages, scholarships, capitalGains, charitableDistributions, stateLocalTaxes } = taxInfo

    const { exemptScholarships, exemptWages } = calculateTreatyExemptions(foreignCountry, scholarships, wages)

    const totalEffectivelyConnectedIncome = wages - exemptWages
    const totalAdjustmentsToIncome = scholarships - exemptScholarships
    const adjustedGrossIncome = totalEffectivelyConnectedIncome - totalAdjustmentsToIncome
    const itemizedDeductions = calculateItemizedDeduction(foreignCountry, charitableDistributions, stateLocalTaxes)
    const taxableIncome = Math.max(0, adjustedGrossIncome - itemizedDeductions)

    const taxOnEffectivelyConnectedIncome = calculateTaxUsingBrackets(taxableIncome)
    const taxOnIncomeNotEffectivelyConnected = capitalGains * 0.3
    const totalTax = taxOnEffectivelyConnectedIncome + taxOnIncomeNotEffectivelyConnected

    const totalIncome = wages + capitalGains // Use full wages for total income
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
              This tax calculator is for educational purposes only and should not be considered as professional tax
              advice. Tax laws and regulations are complex and subject to change. For accurate tax calculations, please
              consult with a qualified tax professional or refer to the official IRS guidelines.
            </AlertDescription>
          </Alert>
          <form className="space-y-4 mb-8" onSubmit={(e) => e.preventDefault()}>
            <div>
              <Label htmlFor="foreignCountry">Foreign Country (Form 1040-NR, Page 1)</Label>
              <Select onValueChange={handleForeignCountryChange} value={taxInfo.foreignCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your foreign country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="china">China, People's Republic of</SelectItem>
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
          © {format(new Date(), "yyyy")} Tax Estimator. All rights reserved.
        </p>
      </div>
    </>
  )
}

