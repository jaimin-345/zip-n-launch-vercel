import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { staffRoles, roleGroups, associationStaffing } from '@/lib/staffingData';

export const Step2_OfficialsStaff = ({ formData, setFormData }) => {
  const selectedAssociations = formData.selectedAssociations || [];
  const officialsData = formData.showDetails?.officials || {};

  // Get roles for each association
  const associationRoles = useMemo(() => {
    const roles = {};
    const assocList = selectedAssociations.length > 0 ? selectedAssociations : ['default'];
    
    assocList.forEach(assocId => {
      const staffingConfig = associationStaffing[assocId] || associationStaffing['default'];
      roles[assocId] = [...new Set([...(staffingConfig.core || []), ...(staffingConfig.specialized || [])])];
    });
    return roles;
  }, [selectedAssociations]);

  // Group roles by category
  const groupedRoles = useMemo(() => {
    const groups = {};
    Object.entries(roleGroups)
      .sort(([, a], [, b]) => a.order - b.order)
      .forEach(([key, value]) => {
        if (key !== 'custom') {
          groups[key] = { ...value, roles: [] };
        }
      });

    Object.keys(staffRoles).forEach(roleId => {
      const role = staffRoles[roleId];
      if (role.group && groups[role.group]) {
        groups[role.group].roles.push(roleId);
      }
    });
    return groups;
  }, []);

  // Get association display name
  const getAssociationName = (assocId) => {
    const config = associationStaffing[assocId];
    if (config) return config.name;
    return assocId.toUpperCase();
  };

  // Get staff members for a specific association and role
  const getStaffMembers = (assocId, roleId) => {
    return officialsData[assocId]?.[roleId] || [];
  };

  // Check if role should be shown for association
  const shouldShowRole = (assocId, roleId) => {
    const assocRoles = associationRoles[assocId] || [];
    return assocRoles.includes(roleId);
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

  if (selectedAssociations.length === 0) {
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
            Assign key personnel and manage their details. Roles are suggested based on your selected associations.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No associations selected.</p>
            <p className="text-sm">Please select associations in Step 1 first.</p>
          </div>
        </CardContent>
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
          Assign key personnel and manage their details. Roles are suggested based on your selected associations.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        {selectedAssociations.map((assocId) => (
          <Accordion key={assocId} type="single" collapsible defaultValue={assocId} className="w-full border rounded-lg bg-card">
            <AccordionItem value={assocId} className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <span className="text-base font-semibold">
                  {getAssociationName(assocId)} Staff
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-6">
                {Object.entries(groupedRoles).map(([groupKey, group]) => {
                  // Filter roles that should be shown for this association
                  const visibleRoles = group.roles.filter(roleId => shouldShowRole(assocId, roleId));
                  
                  if (visibleRoles.length === 0) return null;
                  
                  return (
                    <div key={groupKey} className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">{group.name}</h4>
                      <div className="space-y-2">
                        {visibleRoles.map(roleId => {
                          const role = staffRoles[roleId];
                          if (!role) return null;
                          
                          const RoleIcon = role.icon;
                          const members = getStaffMembers(assocId, roleId);
                          
                          return (
                            <div key={roleId} className="space-y-2">
                              {/* Role Header with Add Button */}
                              <div className="flex items-center justify-between py-2 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                  {RoleIcon && <RoleIcon className="h-4 w-4 text-muted-foreground" />}
                                  <span className="text-sm font-medium">{role.name}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  disabled
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add {role.name}
                                </Button>
                              </div>
                              
                              {/* Existing Members */}
                              {members.length > 0 && (
                                <div className="pl-6 space-y-2">
                                  {members.map((member, idx) => (
                                    <div 
                                      key={member.id || idx} 
                                      className="flex items-center justify-between p-3 rounded-md border bg-background"
                                    >
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{member.name || 'Unnamed'}</p>
                                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                                          {member.email && <span>{member.email}</span>}
                                          {member.phone && <span>{member.phone}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </CardContent>
    </motion.div>
  );
};
