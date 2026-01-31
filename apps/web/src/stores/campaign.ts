import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Campaign {
  id: string;
  name: string;
  electionType: string;
  city: string;
  district?: string;
  village?: string;
  isActive: boolean;
}

interface CampaignState {
  currentCampaign: Campaign | null;
  campaigns: Campaign[];
  setCurrentCampaign: (campaign: Campaign | null) => void;
  setCampaigns: (campaigns: Campaign[]) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  removeCampaign: (id: string) => void;
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set) => ({
      currentCampaign: null,
      campaigns: [],
      setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),
      setCampaigns: (campaigns) => set({ campaigns }),
      addCampaign: (campaign) =>
        set((state) => ({ campaigns: [...state.campaigns, campaign] })),
      updateCampaign: (id, data) =>
        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
          currentCampaign:
            state.currentCampaign?.id === id
              ? { ...state.currentCampaign, ...data }
              : state.currentCampaign,
        })),
      removeCampaign: (id) =>
        set((state) => ({
          campaigns: state.campaigns.filter((c) => c.id !== id),
          currentCampaign:
            state.currentCampaign?.id === id ? null : state.currentCampaign,
        })),
    }),
    {
      name: 'campaign-storage',
      partialize: (state) => ({ currentCampaign: state.currentCampaign }),
    }
  )
);
