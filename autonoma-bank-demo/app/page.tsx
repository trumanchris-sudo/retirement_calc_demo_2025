"use client"

import { DollarSign, CreditCard, Send, Plus, ArrowUpRight, Download, Filter, Search } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MainNav } from "@/components/main-nav"
import { Overview } from "@/components/overview"
import { RecentTransactions } from "@/components/recent-transactions"
import { UserNav } from "@/components/user-nav"
import { AddMoneyDialog } from "@/components/add-money-dialog"
import { NewCardDialog } from "@/components/new-card-dialog"
import { SendMoneyDialog } from "@/components/send-money-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function DashboardPage() {
  const [addMoneyOpen, setAddMoneyOpen] = useState(false)
  const [newCardOpen, setNewCardOpen] = useState(false)
  const [sendMoneyOpen, setSendMoneyOpen] = useState(false)

  // Add state for account balances and card count
  const [checkingBalance, setCheckingBalance] = useState(24231.89)
  const [savingsBalance, setSavingsBalance] = useState(85124.42)
  const [activeCards, setActiveCards] = useState(3)
  const [pendingCards, setPendingCards] = useState(1)
  const [transactions, setTransactions] = useState<any[]>([])

  const { toast } = useToast()

  const handleAddMoneySuccess = (amount: string) => {
    setAddMoneyOpen(false)
    const amountNum = Number.parseFloat(amount)

    // Update checking balance
    setCheckingBalance((prev) => {
      const newBalance = prev + amountNum
      return Number.parseFloat(newBalance.toFixed(2))
    })

    // Add to transactions
    const newTransaction = {
      name: "Deposit",
      date:
        new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " at " +
        new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      amount: amountNum,
      type: "credit",
    }

    setTransactions((prev) => [newTransaction, ...prev])

    toast({
      variant: "success",
      title: "Money Added Successfully",
      description: `$${amount} has been added to your account. The funds are now available in your checking account.`,
    })
  }

  const handleSendMoneySuccess = (amount: string, recipient: string, fromAccount = "checking") => {
    setSendMoneyOpen(false)
    const amountNum = Number.parseFloat(amount)

    // Update the appropriate account balance
    if (fromAccount === "checking") {
      setCheckingBalance((prev) => {
        const newBalance = prev - amountNum
        return Number.parseFloat(newBalance.toFixed(2))
      })
    } else {
      setSavingsBalance((prev) => {
        const newBalance = prev - amountNum
        return Number.parseFloat(newBalance.toFixed(2))
      })
    }

    // Add to transactions
    const newTransaction = {
      name: recipient,
      date:
        new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " at " +
        new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      amount: amountNum,
      type: "debit",
    }

    setTransactions((prev) => [newTransaction, ...prev])

    toast({
      variant: "success",
      title: "Money Sent Successfully",
      description: `$${amount} has been sent to ${recipient}. The transaction has been processed.`,
    })
  }

  const handleNewCardSuccess = (cardName: string, cardType: string) => {
    setNewCardOpen(false)

    // Update card counts
    if (cardType === "Virtual") {
      setActiveCards((prev) => prev + 1)
    } else {
      // Physical cards start as pending
      setPendingCards((prev) => prev + 1)
    }

    toast({
      variant: "success",
      title: "Card Created Successfully",
      description: `Your new ${cardType} card "${cardName}" has been created. You can now use it for transactions.`,
    })
  }

  // Format currency values
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddMoneyOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Money
            </Button>
          </div>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white">
              Reports
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-white">
              Notifications
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Checking Account</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${formatCurrency(checkingBalance)}</div>
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setSendMoneyOpen(true)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                  <Button variant="outline" size="sm" className="border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </CardFooter>
              </Card>
              <Card className="border border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Savings Account</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${formatCurrency(savingsBalance)}</div>
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setSendMoneyOpen(true)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                  <Button variant="outline" size="sm" className="border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </CardFooter>
              </Card>
              <Card className="border border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Virtual Cards</CardTitle>
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeCards} Active</div>
                  <p className="text-xs text-muted-foreground">+{pendingCards} pending approval</p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setNewCardOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Card
                  </Button>
                </CardFooter>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 border border-gray-200">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <Overview />
                </CardContent>
              </Card>
              <Card className="col-span-3 border border-gray-200">
                <CardHeader className="flex flex-row items-center">
                  <div className="grid gap-2">
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>You made 14 transactions this month.</CardDescription>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="icon" className="border-blue-200 hover:bg-blue-50">
                      <Filter className="h-4 w-4" />
                      <span className="sr-only">Filter</span>
                    </Button>
                    <Button variant="outline" size="icon" className="border-blue-200 hover:bg-blue-50">
                      <Search className="h-4 w-4" />
                      <span className="sr-only">Search</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <RecentTransactions newTransactions={transactions} />
                </CardContent>
                <CardFooter>
                  <Button className="w-full border-blue-200 hover:bg-blue-50 hover:text-blue-700" variant="outline">
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    View All Transactions
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <AddMoneyDialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen} onSuccess={handleAddMoneySuccess} />
      <NewCardDialog open={newCardOpen} onOpenChange={setNewCardOpen} onSuccess={handleNewCardSuccess} />
      <SendMoneyDialog open={sendMoneyOpen} onOpenChange={setSendMoneyOpen} onSuccess={handleSendMoneySuccess} />
      <Toaster />
    </div>
  )
}

