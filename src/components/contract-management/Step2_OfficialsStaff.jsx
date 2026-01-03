import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Award, UserCheck, Mail, Phone } from 'lucide-react';
import { staffRoles } from '@/lib/staffingData';

export const Step2_OfficialsStaff = ({ formData, setFormData }) => {
  // Get officials from showDetails.officials (nested structure: { assocId: { roleId: [members] } })
  const officialsData = formData.showDetails?.officials || {};

  // Flatten all personnel from the nested structure
  const allPersonnel = useMemo(() => {
    const personnel = [];
    
    Object.entries(officialsData).forEach(([assocId, roles]) => {
      if (roles && typeof roles === 'object') {
        Object.entries(roles).forEach(([roleId, members]) => {
          if (Array.isArray(members)) {
            members.forEach((member) => {
              const roleInfo = staffRoles[roleId] || {};
              const isJudge = roleId.toLowerCase().includes('judge') || 
                              roleInfo.label?.toLowerCase().includes('judge');
              
              personnel.push({
                ...member,
                id: member.id || `${assocId}_${roleId}_${Math.random()}`,
                role: member.custom_role_name || roleInfo.label || roleId,
                association: assocId,
                type: isJudge ? 'judge' : 'official',
              });
            });
          }
        });
      }
    });
    
    return personnel;
  }, [officialsData]);

  const selectedPersonnel = formData.selectedPersonnel || [];

  const handleTogglePersonnel = (personId) => {
    setFormData(prev => {
      const current = prev.selectedPersonnel || [];
      if (current.includes(personId)) {
        return { ...prev, selectedPersonnel: current.filter(id => id !== personId) };
      } else {
        return { ...prev, selectedPersonnel: [...current, personId] };
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPersonnel.length === allPersonnel.length) {
      setFormData(prev => ({ ...prev, selectedPersonnel: [] }));
    } else {
      setFormData(prev => ({ ...prev, selectedPersonnel: allPersonnel.map(p => p.id) }));
    }
  };

  if (!formData.selectedShow) {
    return (
      <motion.div
        key="step2"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
      >
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Step 2: Officials & Staff
          </CardTitle>
          <CardDescription>Please select a show first in Step 1.</CardDescription>
        </CardHeader>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Step 2: Officials & Staff
        </CardTitle>
        <CardDescription>
          Select the personnel who will receive contracts. Data pulled from Show Information.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedPersonnel.length} of {allPersonnel.length} selected
          </p>
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary hover:underline"
          >
            {selectedPersonnel.length === allPersonnel.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {allPersonnel.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No officials or staff found for this show.</p>
            <p className="text-sm">Add personnel in the Show Information first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allPersonnel.map((person) => (
              <Card
                key={person.id}
                className={`p-4 cursor-pointer transition-all ${
                  selectedPersonnel.includes(person.id)
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => handleTogglePersonnel(person.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedPersonnel.includes(person.id)}
                    onCheckedChange={() => handleTogglePersonnel(person.id)}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        {person.type === 'judge' ? (
                          <Award className="h-4 w-4 text-amber-500" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-blue-500" />
                        )}
                        {person.name || 'Unnamed'}
                      </h4>
                      <Badge variant={person.type === 'judge' ? 'default' : 'secondary'}>
                        {person.role || 'Staff'}
                      </Badge>
                    </div>
                    {person.association && (
                      <p className="text-xs text-muted-foreground">Association: {person.association.toUpperCase()}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {person.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {person.email}
                        </span>
                      )}
                      {person.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {person.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </motion.div>
  );
};
