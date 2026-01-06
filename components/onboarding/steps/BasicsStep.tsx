'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OnboardingBasicsData } from '@/types/onboarding'

interface BasicsStepProps {
  data: OnboardingBasicsData
  onChange: (data: Partial<OnboardingBasicsData>) => void
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming', 'District of Columbia',
]

export function BasicsStep({ data, onChange }: BasicsStepProps) {
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '') {
      onChange({ age: 30 }) // Default to 30 if cleared
      return
    }
    const numValue = parseInt(value)
    if (!isNaN(numValue)) {
      onChange({ age: numValue })
    }
  }

  const handleSpouseAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '') {
      onChange({ spouseAge: undefined })
      return
    }
    const numValue = parseInt(value)
    if (!isNaN(numValue)) {
      onChange({ spouseAge: numValue })
    }
  }

  const handleMaritalStatusChange = (value: string) => {
    const maritalStatus = value as 'single' | 'married'
    onChange({ maritalStatus })

    // Clear spouse age if switching to single
    if (maritalStatus === 'single') {
      onChange({ maritalStatus, spouseAge: undefined })
    }
  }

  const handleStateChange = (value: string) => {
    onChange({ state: value })
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        We&apos;ll start with just a few basics. You can refine everything later.
      </p>

      {/* Current Age */}
      <div className="space-y-2">
        <Label htmlFor="age">Your current age</Label>
        <Input
          id="age"
          type="number"
          min={18}
          max={100}
          value={data.age}
          onChange={handleAgeChange}
          placeholder="30"
        />
        <p className="text-xs text-muted-foreground">
          Your current age helps us estimate your timeline.
        </p>
      </div>

      {/* Marital Status */}
      <div className="space-y-3">
        <Label>Marital status</Label>
        <RadioGroup
          value={data.maritalStatus}
          onValueChange={handleMaritalStatusChange}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="single" />
            <Label htmlFor="single" className="font-normal cursor-pointer">
              Single
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="married" id="married" />
            <Label htmlFor="married" className="font-normal cursor-pointer">
              Married
            </Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          We&apos;ll use this to apply the right tax rules.
        </p>
      </div>

      {/* Spouse Age (conditional) */}
      {data.maritalStatus === 'married' && (
        <div className="space-y-2">
          <Label htmlFor="spouseAge">Spouse&apos;s current age</Label>
          <Input
            id="spouseAge"
            type="number"
            min={18}
            max={100}
            value={data.spouseAge || ''}
            onChange={handleSpouseAgeChange}
            placeholder="30"
          />
        </div>
      )}

      {/* State of Residence */}
      <div className="space-y-2">
        <Label htmlFor="state">State of residence</Label>
        <Select value={data.state} onValueChange={handleStateChange}>
          <SelectTrigger id="state">
            <SelectValue placeholder="Select your state" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {US_STATES.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          State taxes can significantly impact your retirement planning.
        </p>
      </div>
    </div>
  )
}
