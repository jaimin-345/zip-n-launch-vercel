import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssociationSelection } from '@/components/shared/AssociationSelection';

export const Step1_Associations = ({ isHub, selectedPurposeName, isReadOnly = false, isLocked = false, onUnlock, ...props }) => {
  const effectiveReadOnly = isReadOnly || isLocked;

  return (
    <>
      {isLocked && !isReadOnly && (
        <div className="flex items-center justify-between p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800 dark:text-amber-300">
              This section is locked after save to prevent accidental changes.
            </span>
          </div>
          {onUnlock && (
            <Button variant="outline" size="sm" onClick={onUnlock}>
              <Unlock className="h-3.5 w-3.5 mr-1" /> Unlock
            </Button>
          )}
        </div>
      )}
      <AssociationSelection {...props} context={isHub ? "hub" : "pbb"} selectedPurposeName={selectedPurposeName} isReadOnly={effectiveReadOnly} />
    </>
  );
};
