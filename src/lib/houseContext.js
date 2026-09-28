import { createContext, useContext } from 'react';

// Provided by App: the viewer's house (or null), whether they can use houses
// at all (Extra/Premium), and helpers to refresh it / jump to a Community
// sub-view (house page, private forum…). TopNav reads it for the round house
// button so every page doesn't have to thread these props through.
export const HouseContext = createContext({
    myHouse: null,
    housesEnabled: false,
    refreshMyHouse: () => {},
    openCommunityView: () => {},
});

export const useHouse = () => useContext(HouseContext);
