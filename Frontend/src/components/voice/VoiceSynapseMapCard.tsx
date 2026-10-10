import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { NeuralSynapseCanvas } from './NeuralSynapseCanvas';
import type { FeatureStatus } from '../../types/analysis';

interface VoiceSynapseMapCardProps {
  featureStatuses: FeatureStatus[];
}

export const VoiceSynapseMapCard: React.FC<VoiceSynapseMapCardProps> = React.memo(
  ({ featureStatuses }) => {
    return (
      <section
        className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
        aria-label="Neural Synapse Map"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#0A0A0A] mb-6">
          <div>
            <MonoLabel color="accent">TOPOLOGY MAPPING</MonoLabel>
            <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A] mt-1">
              Neural Synapse Map
            </h3>
          </div>
          <div className="font-mono-label text-xs text-[#6B6F76]">
            STABILIZED POST-ANALYSIS TOPOLOGY
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-[16px] bg-[#F0F0F0]/50 border border-[#0A0A0A]/10">
          <NeuralSynapseCanvas
            compact={true}
            activeFeatureIndex={8} // all 9 clusters active in their final settled colors
            featureStatuses={featureStatuses}
          />
        </div>
      </section>
    );
  }
);

VoiceSynapseMapCard.displayName = 'VoiceSynapseMapCard';
