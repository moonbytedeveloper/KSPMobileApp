import React from 'react';

export const TabContext = React.createContext({
  activeIndex: 0,
  setActiveIndex: () => {},
});

export default TabContext; 