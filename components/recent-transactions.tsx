import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Transaction {
  name: string
  date: string
  amount: number
  type: "credit" | "debit"
}

interface RecentTransactionsProps {
  newTransactions?: Transaction[]
}

export function RecentTransactions({ newTransactions = [] }: RecentTransactionsProps) {
  // Default transactions
  const defaultTransactions = [
    {
      name: "AWS Cloud Services",
      date: "Apr 24, 2023 at 1:30 PM",
      amount: 350,
      type: "debit" as const,
    },
    {
      name: "GitHub Pro",
      date: "Apr 22, 2023 at 11:45 AM",
      amount: 12,
      type: "debit" as const,
    },
    {
      name: "Investor Deposit",
      date: "Apr 20, 2023 at 9:00 AM",
      amount: 50000,
      type: "credit" as const,
    },
    {
      name: "Stripe Payment",
      date: "Apr 18, 2023 at 3:15 PM",
      amount: 2500,
      type: "credit" as const,
    },
    {
      name: "Google Suite",
      date: "Apr 15, 2023 at 10:30 AM",
      amount: 75,
      type: "debit" as const,
    },
  ]

  // Combine new transactions with default ones, but limit to 5 total
  const allTransactions = [...newTransactions, ...defaultTransactions].slice(0, 5)

  return (
    <div className="space-y-4">
      {allTransactions.map((transaction, index) => (
        <div key={index} className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <Avatar className="h-9 w-9 border border-gray-200">
            <AvatarImage src="/placeholder.svg" alt="Avatar" />
            <AvatarFallback>{transaction.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{transaction.name}</p>
            <p className="text-xs text-muted-foreground">{transaction.date}</p>
          </div>
          <div className={`ml-auto font-medium ${transaction.type === "credit" ? "text-green-500" : "text-red-500"}`}>
            {transaction.type === "credit" ? "+" : "-"}$
            {transaction.amount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

