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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building, User } from "lucide-react"

interface SendMoneyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (amount: string, recipient: string) => void
}

// Update the SendMoneyDialog component to include account selection
export function SendMoneyDialog({ open, onOpenChange, onSuccess }: SendMoneyDialogProps) {
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [transferType, setTransferType] = useState("ach")
  const [recipient, setRecipient] = useState("")
  const [fromAccount, setFromAccount] = useState("checking")
  const [toAccount, setToAccount] = useState("savings")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)

      // For external transfers, use the selected account
      if ((e.target as HTMLFormElement).closest('[data-value="external"]')) {
        onSuccess(amount, recipient || "recipient", fromAccount)
      } else {
        // For internal transfers, we're moving money between accounts
        // The net effect is the same as sending money from one account
        onSuccess(amount, `Internal Transfer to ${toAccount === "checking" ? "Checking" : "Savings"}`, fromAccount)
      }
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Money</DialogTitle>
          <DialogDescription>Transfer funds to individuals or businesses</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="external" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger value="external" className="data-[state=active]:bg-white">
              External Transfer
            </TabsTrigger>
            <TabsTrigger value="internal" className="data-[state=active]:bg-white">
              Between Accounts
            </TabsTrigger>
          </TabsList>
          <TabsContent value="external" data-value="external">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Recipient Type</Label>
                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant={transferType === "ach" ? "default" : "outline"}
                      className={transferType === "ach" ? "bg-blue-600 hover:bg-blue-700" : ""}
                      onClick={() => setTransferType("ach")}
                    >
                      <Building className="mr-2 h-4 w-4" />
                      Business
                    </Button>
                    <Button
                      type="button"
                      variant={transferType === "wire" ? "default" : "outline"}
                      className={transferType === "wire" ? "bg-blue-600 hover:bg-blue-700" : ""}
                      onClick={() => setTransferType("wire")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Individual
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="from-account-external">From Account</Label>
                  <Select value={fromAccount} onValueChange={setFromAccount}>
                    <SelectTrigger id="from-account-external">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking Account</SelectItem>
                      <SelectItem value="savings">Savings Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="recipient">Recipient Name</Label>
                  <Input
                    id="recipient"
                    placeholder="Enter recipient name"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account">Account Number</Label>
                  <Input id="account" placeholder="Enter account number" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="routing">Routing Number</Label>
                  <Input id="routing" placeholder="Enter routing number" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="send-amount">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="send-amount"
                      placeholder="0.00"
                      className="pl-8"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? "Processing..." : "Send Money"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="internal" data-value="internal">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="from-account">From Account</Label>
                  <Select value={fromAccount} onValueChange={setFromAccount}>
                    <SelectTrigger id="from-account">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking Account</SelectItem>
                      <SelectItem value="savings">Savings Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="to-account">To Account</Label>
                  <Select value={toAccount} onValueChange={setToAccount}>
                    <SelectTrigger id="to-account">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking Account</SelectItem>
                      <SelectItem value="savings">Savings Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="transfer-amount">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="transfer-amount"
                      placeholder="0.00"
                      className="pl-8"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? "Processing..." : "Transfer Funds"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

