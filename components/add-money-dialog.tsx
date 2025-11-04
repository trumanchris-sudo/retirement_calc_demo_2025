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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { BanknoteIcon as Bank, CreditCard } from "lucide-react"

interface AddMoneyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (amount: string) => void
}

export function AddMoneyDialog({ open, onOpenChange, onSuccess }: AddMoneyDialogProps) {
  const [method, setMethod] = useState("ach")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      onSuccess(amount)
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Money</DialogTitle>
          <DialogDescription>Transfer funds to your Autonoma account</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="amount"
                  placeholder="0.00"
                  className="pl-8"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Transfer Method</Label>
              <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-2 gap-4">
                <div
                  className={`flex flex-col items-center justify-between rounded-md border-2 p-4 ${method === "ach" ? "border-blue-600" : "border-gray-200"}`}
                >
                  <RadioGroupItem value="ach" id="ach" className="sr-only" />
                  <Bank className="mb-3 h-6 w-6 text-blue-600" />
                  <Label htmlFor="ach" className="text-sm font-medium">
                    ACH Transfer
                  </Label>
                </div>
                <div
                  className={`flex flex-col items-center justify-between rounded-md border-2 p-4 ${method === "card" ? "border-blue-600" : "border-gray-200"}`}
                >
                  <RadioGroupItem value="card" id="card" className="sr-only" />
                  <CreditCard className="mb-3 h-6 w-6 text-blue-600" />
                  <Label htmlFor="card" className="text-sm font-medium">
                    Debit Card
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? "Processing..." : "Add Money"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

