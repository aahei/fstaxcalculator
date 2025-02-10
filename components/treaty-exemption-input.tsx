import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TreatyExemption, incomeCode } from "@/app/types"

interface TreatyExemptionInputProps {
  exemption: TreatyExemption
  claimTreatyExemptions: { [key in incomeCode]?: number }
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function TreatyExemptionInput({
  exemption,
  claimTreatyExemptions,
  onCheckboxChange,
}: TreatyExemptionInputProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={exemption.code}
          name={exemption.code}
          checked={exemption.code in claimTreatyExemptions}
          onChange={onCheckboxChange}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor={exemption.code}>
          {exemption.name}
          {exemption.max && ` (up to $${exemption.max.toLocaleString()})`}
        </Label>
      </div>
      {(exemption.code in claimTreatyExemptions) && (
        <div className="flex-1 max-w-[200px]">
          <Input
            type="number"
            id={`amount-${exemption.code}`}
            name={`amount-${exemption.code}`}
            disabled
            prefix="$"
            value={claimTreatyExemptions[exemption.code] || ""}
            className="no-spinner bg-gray-100"
          />
        </div>
      )}
    </div>
  )
} 