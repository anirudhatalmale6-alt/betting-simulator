'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface BetSlipLeg {
  id: string;
  gameId: string;
  propId?: string;
  pick: string;
  odds: number;
  label: string;
  gameLabel: string;
}

interface BetSlipContextType {
  legs: BetSlipLeg[];
  addLeg: (leg: BetSlipLeg) => void;
  removeLeg: (id: string) => void;
  clearSlip: () => void;
  isInSlip: (id: string) => boolean;
  totalOdds: number;
  slipOpen: boolean;
  setSlipOpen: (open: boolean) => void;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

function calculateParlayAmericanOdds(legs: BetSlipLeg[]): number {
  if (legs.length === 0) return 0;
  if (legs.length === 1) return legs[0].odds;

  let decimalProduct = 1;
  for (const leg of legs) {
    const decimal = leg.odds >= 0 ? (leg.odds / 100) + 1 : (100 / Math.abs(leg.odds)) + 1;
    decimalProduct *= decimal;
  }

  if (decimalProduct >= 2) {
    return Math.round((decimalProduct - 1) * 100);
  } else {
    return Math.round(-100 / (decimalProduct - 1));
  }
}

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [legs, setLegs] = useState<BetSlipLeg[]>([]);
  const [slipOpen, setSlipOpen] = useState(false);

  const addLeg = useCallback((leg: BetSlipLeg) => {
    setLegs(prev => {
      const existing = prev.find(l => l.id === leg.id);
      if (existing) {
        return prev.filter(l => l.id !== leg.id);
      }
      return [...prev, leg];
    });
    setSlipOpen(true);
  }, []);

  const removeLeg = useCallback((id: string) => {
    setLegs(prev => prev.filter(l => l.id !== id));
  }, []);

  const clearSlip = useCallback(() => {
    setLegs([]);
    setSlipOpen(false);
  }, []);

  const isInSlip = useCallback((id: string) => {
    return legs.some(l => l.id === id);
  }, [legs]);

  const totalOdds = calculateParlayAmericanOdds(legs);

  return (
    <BetSlipContext.Provider value={{ legs, addLeg, removeLeg, clearSlip, isInSlip, totalOdds, slipOpen, setSlipOpen }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (!context) throw new Error('useBetSlip must be used within BetSlipProvider');
  return context;
}
