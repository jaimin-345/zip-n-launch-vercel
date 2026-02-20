import React from 'react';
import { AssociationSelection } from '@/components/shared/AssociationSelection';

export const AssociationStep = (props) => {
  return <AssociationSelection {...props} context="showInfo" />;
};