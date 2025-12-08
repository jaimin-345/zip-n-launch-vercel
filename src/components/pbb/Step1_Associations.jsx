import React from 'react';
import { AssociationSelection } from '@/components/shared/AssociationSelection';

export const Step1_Associations = ({ isHub, selectedPurposeName, isReadOnly = false, ...props }) => {
  return <AssociationSelection {...props} context={isHub ? "hub" : "pbb"} selectedPurposeName={selectedPurposeName} isReadOnly={isReadOnly} />;
};