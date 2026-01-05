"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Building2,
  CalendarDays,
  ArrowUpCircle,
  AlertCircle,
  Trophy,
  Landmark
} from "lucide-react";
import type { CalculationResult } from "@/types/calculator";

interface TimelineViewProps {
  result: CalculationResult;
  currentAge: number;
  retirementAge: number;
  spouseAge?: number;
}

interface TimelineEvent {
  age: number;
  year: number;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const TimelineView = React.memo(function TimelineView({ result, currentAge, retirementAge, spouseAge }: TimelineViewProps) {
  // Extract key data from result
  const currentYear = new Date().getFullYear();
  const yearsToRetirement = retirementAge - currentAge;
  const retirementYear = currentYear + yearsToRetirement;

  // Social Security claim age (assuming 67 for full retirement)
  const ssClaimAge = 67;
  const ssClaimYear = currentYear + (ssClaimAge - currentAge);

  // RMD start age (73 as of 2024)
  const rmdAge = 73;
  const rmdYear = currentYear + (rmdAge - currentAge);

  // Healthcare/Medicare age
  const medicareAge = 65;
  const medicareYear = currentYear + (medicareAge - currentAge);

  // Long-term care probability zone (around age 75-85)
  const ltcAge = 80;
  const ltcYear = currentYear + (ltcAge - currentAge);

  // Estate projection age
  const estateAge = 95;
  const estateYear = currentYear + (estateAge - currentAge);

  const events: TimelineEvent[] = [
    {
      age: currentAge,
      year: currentYear,
      label: "Today",
      description: "Current Age & Starting Point",
      icon: <CalendarDays className="w-4 h-4 md:w-5 md:h-5" />,
      color: "bg-blue-500"
    },
    ...(currentAge < retirementAge ? [{
      age: retirementAge,
      year: retirementYear,
      label: "Retirement",
      description: `Begin retirement withdrawals`,
      icon: <Trophy className="w-4 h-4 md:w-5 md:h-5" />,
      color: "bg-green-500"
    }] : []),
    ...(currentAge < medicareAge ? [{
      age: medicareAge,
      year: medicareYear,
      label: "Medicare Eligible",
      description: "Healthcare coverage begins",
      icon: <Heart className="w-4 h-4 md:w-5 md:h-5" />,
      color: "bg-red-400"
    }] : []),
    ...(currentAge < ssClaimAge ? [{
      age: ssClaimAge,
      year: ssClaimYear,
      label: "Social Security",
      description: "Full retirement benefits claim",
      icon: <Building2 className="w-4 h-4 md:w-5 md:h-5" />,
      color: "bg-purple-500"
    }] : []),
    ...(currentAge < rmdAge ? [{
      age: rmdAge,
      year: rmdYear,
      label: "RMDs Begin",
      description: "Required Minimum Distributions",
      icon: <ArrowUpCircle className="w-4 h-4 md:w-5 md:h-5" />,
      color: "bg-orange-500"
    }] : []),
    ...(currentAge < ltcAge ? [{
      age: ltcAge,
      year: ltcYear,
      label: "Long-Term Care Zone",
      description: "Increased healthcare probability",
      icon: <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />,
      color: "bg-yellow-500"
    }] : []),
    {
      age: estateAge,
      year: estateYear,
      label: "Estate Projection",
      description: "Projected end-of-life balance",
      icon: <Landmark className="w-4 h-4 md:w-5 md:h-5" />,
      color: "bg-indigo-500"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retirement Timeline</CardTitle>
        <CardDescription>
          Chronological view of major milestones and events in your retirement journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Horizontal scrollable timeline */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 md:gap-4 min-w-max">
              {events.map((event, index) => (
                <div key={index} className="relative flex flex-col items-center min-w-[120px] md:min-w-[180px]">
                  {/* Timeline line connector */}
                  {index < events.length - 1 && (
                    <div className="absolute top-6 md:top-8 left-[50%] w-full h-0.5 bg-border z-0" />
                  )}

                  {/* Event node */}
                  <div className={`relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-full ${event.color} flex items-center justify-center text-white shadow-lg mb-2 md:mb-3`}>
                    {event.icon}
                  </div>

                  {/* Event details */}
                  <div className="text-center space-y-0.5 md:space-y-1">
                    <Badge variant="outline" className="mb-1 font-mono text-[10px] md:text-xs px-1 md:px-2">
                      Age {event.age}
                    </Badge>
                    <div className="font-semibold text-xs md:text-sm">{event.label}</div>
                    <div className="text-[10px] md:text-xs text-muted-foreground">{event.year}</div>
                    <div className="text-[10px] md:text-xs text-muted-foreground max-w-[110px] md:max-w-[160px]">
                      {event.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
