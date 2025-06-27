import React, { createContext, useState, useContext, useEffect } from 'react';

type DemoContextType = {
  demoMode: boolean;
  startDemo: () => void;
  focusValue: number;
  stressValue: number;
  timerStarted?: () => void;
  timerEnded?: () => void;
};

const DemoContext = createContext<DemoContextType>({
  demoMode: false,
  startDemo: () => {},
  focusValue: 0,
  stressValue: 0,
});

export const DemoProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [demoMode, setDemoMode] = useState(false);
  const [demoStartTime, setDemoStartTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [focusValue, setFocusValue] = useState(1.5);
  const [stressValue, setStressValue] = useState(1.5);

  // Reset everything when demo mode changes
  useEffect(() => {
    if (!demoMode) {
      setFocusValue(1.5);
      setStressValue(1.5);
      setTimerActive(false);
    }
  }, [demoMode]);

  // Demo time effect for the 3:30 (210 second) video demo
  useEffect(() => {
    if (!demoMode) return;

    console.log('Demo mode active, updating values');
    
    // Set initial values immediately for first phase
    setFocusValue(1.1);
    setStressValue(2.1);
    console.log('PHASE 1: HIGH STRESS / LOW FOCUS PHASE STARTED');
    
    const interval = setInterval(() => {
      const elapsed = (Date.now() - demoStartTime) / 1000; // seconds
      console.log(`Demo elapsed time: ${elapsed.toFixed(1)} seconds`);

      // End demo after 210 seconds (3:30)
      if (elapsed >= 210) {
        console.log('Demo mode ending (timeout after 3:30)');
        setDemoMode(false);
        clearInterval(interval);
        return;
      }

      // Phase 1: First 30 seconds - High stress (2.1), low focus (1.1)
      if (elapsed < 30) {
        setFocusValue(1.1);
        setStressValue(2.1);
      } 
      // Phase 2: Middle 170 seconds - Gradual focus increase and stress decrease
      else if (elapsed < 200) {
        if (elapsed === 30) {
          console.log('PHASE 2: GRADUAL IMPROVEMENT PHASE STARTED');
        }

        // Calculate progress through this phase (0 to 1)
        const phaseProgress = (elapsed - 30) / 170;
        
        // Linear interpolation for focus: 1.1 to 2.7
        const newFocus = 1.1 + (phaseProgress * (2.7 - 1.1));
        
        // Linear interpolation for stress: 2.1 to 0.6
        const newStress = 2.1 - (phaseProgress * (2.1 - 0.6));
        
        setFocusValue(newFocus);
        setStressValue(newStress);
      } 
      // Phase 3: Last 10 seconds - Medium values for both
      else {
        if (elapsed === 200) {
          console.log('PHASE 3: MEDIUM STABILIZATION PHASE STARTED');
        }
        
        // Medium focus and stress values
        setFocusValue(1.8);
        setStressValue(1.5);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      console.log('Demo interval cleared');
    };
  }, [demoMode, demoStartTime]);

  const startDemo = () => {
    console.log('Starting demo mode for 3:30 video');
    setDemoMode(true);
    setDemoStartTime(Date.now());
  };

  // Timer callback functions
  const timerStarted = () => {
    console.log('Demo: Timer started');
    setTimerActive(true);
  };

  const timerEnded = () => {
    console.log('Demo: Timer ended');
    setTimerActive(false);
  };

  const contextValue = {
    demoMode,
    startDemo,
    focusValue,
    stressValue,
    timerStarted,
    timerEnded
  };

  return (
    <DemoContext.Provider value={contextValue}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => useContext(DemoContext); 