import React from 'react';
import { HeroSection } from '../components/home/HeroSection';
import { ShieldShowcase } from '../components/home/ShieldShowcase';
import { FusionEngineBand } from '../components/home/FusionEngineBand';

export const HomePage: React.FC = () => {
  return (
    <div className="w-full flex flex-col">
      <HeroSection />
      <ShieldShowcase />
      <FusionEngineBand />
    </div>
  );
};
