"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckSquare, CalendarCheck2, Kanban, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PlansMenuPage() {
  const router = useRouter();

  const menuItems = [
    {
      name: "Create Plan",
      description: "Design a new weekly or monthly upskill roadmap.",
      href: "/plans/create",
      icon: Plus,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      name: "Topics Checklist",
      description: "Manage and track all your learning topics.",
      href: "/plans/checklist",
      icon: CheckSquare,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      name: "Daily Record",
      description: "Log your daily progress and time spent.",
      href: "/daily",
      icon: CalendarCheck2,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      name: "Plan Overview",
      description: "View and manage all your active roadmaps.",
      href: "/plans",
      icon: Kanban,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="w-full h-full max-w-md mx-auto px-4 font-sans animate-in fade-in duration-300 md:hidden">
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-black text-[#1e1e1e] tracking-tight">Upskill Planner</h1>
        <p className="text-sm text-[#71717a] mt-1 font-medium">
          Select an action to continue.
        </p>
      </div>

      <div className="space-y-3 pb-6">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card
              key={index}
              onClick={() => router.push(item.href)}
              className="p-4 bg-white border border-[#e4e4e7] rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                  <Icon className="w-6 h-6 stroke-[2.5px]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1e1e1e] tracking-tight">{item.name}</h3>
                  <p className="text-[0.75rem] text-[#71717a] font-medium leading-snug mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="text-[#a1a1aa] shrink-0 ml-2">
                <ChevronRight className="w-5 h-5 stroke-2" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
