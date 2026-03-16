import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'capex-planner:onboarding-completed';
const ONBOARDING_VERSION = 'v1'; // bump to re-trigger after major changes

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed !== ONBOARDING_VERSION) {
      // Small delay so the app renders first
      const t = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
    setCurrentStep(0);
  };

  return { showOnboarding, currentStep, setCurrentStep, completeOnboarding, resetOnboarding };
}
