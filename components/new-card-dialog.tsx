"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldCheck } from "lucide-react"

interface NewCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (cardName: string, cardType: string) => void
}

export function NewCardDialog({ open, onOpenChange, onSuccess }: NewCardDialogProps) {
  const [cardName, setCardName] = useState("")
  const [cardType, setCardType] = useState("virtual")
  const [spendLimit, setSpendLimit] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      onSuccess(cardName, cardType === "virtual" ? "Virtual" : "Physical")
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Card</DialogTitle>
          <DialogDescription>Issue a new card for your business expenses</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="card-name">Card Name</Label>
              <Input
                id="card-name"
                placeholder="Marketing Expenses"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-type">Card Type</Label>
              <Select value={cardType} onValueChange={setCardType}>
                <SelectTrigger id="card-type">
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual">Virtual Card</SelectItem>
                  <SelectItem value="physical">Physical Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="spend-limit">Monthly Spend Limit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="spend-limit"
                  placeholder="5,000"
                  className="pl-8"
                  value={spendLimit}
                  onChange={(e) => setSpendLimit(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 rounded-md border p-4 mt-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Secure Card Creation</p>
                <p className="text-sm text-muted-foreground">Your card details will be encrypted and securely stored</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? "Creating..." : "Create Card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

