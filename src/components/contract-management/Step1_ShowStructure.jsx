import React from 'react';
import { AssociationSelection } from '@/components/shared/AssociationSelection';

export const Step1_ShowStructure = ({ formData, setFormData, associationsData = [] }) => {
  return (
    <AssociationSelection
      formData={formData}
      setFormData={setFormData}
      associationsData={associationsData}
      context="contract"
    />
  );
};
