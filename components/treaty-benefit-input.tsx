import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TreatyBenefit, treatyCode } from "@/app/types"

interface TreatyBenefitInputProps {
  benefit: TreatyBenefit
  claimTreatyBenefits: { [key in treatyCode]?: number }
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function TreatyBenefitInput({
  benefit,
  claimTreatyBenefits,
  onCheckboxChange,
}: TreatyBenefitInputProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={benefit.code}
          name={benefit.code}
          checked={benefit.code in claimTreatyBenefits}
          onChange={onCheckboxChange}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor={benefit.code}>
          {benefit.name}
        </Label>
      </div>
      {(benefit.code in claimTreatyBenefits) && (
        <div className="flex-1 max-w-[200px]">
          <Input
            type="number"
            id={`amount-${benefit.code}`}
            name={`amount-${benefit.code}`}
            disabled
            prefix="$"
            value={claimTreatyBenefits[benefit.code] || ""}
            className="no-spinner bg-gray-100"
          />
        </div>
      )}
    </div>
  )
} 