import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getAssociationLogo, getDefaultAssociationIcon } from '@/lib/associationsData';
import { addLogoToAssociations } from '@/lib/associationsData';
import { Shield } from 'lucide-react';

// 3-column layout per association (matches PBB's AQHACustomPatternCategory)
const COLUMN_LAYOUTS = {
  AQHA: {
    left: ['Showmanship at Halter', 'Horsemanship', 'Hunt Seat Equitation'],
    middle: ['Trail', 'In-Hand Trail', 'Ranch Trail', 'VRH-RHC Ranch Trail'],
    right: ['Hunter Hack', 'Working Hunter', 'Equitation Over Fences', 'Jumping', 'English Versatility', 'Western Versatility'],
  },
  APHA: {
    left: ['Showmanship at Halter', 'Horsemanship', 'Hunt Seat Equitation'],
    middle: ['Trail', 'In-Hand Trail', 'Ranch Trail', 'VRH-RHC Ranch Trail'],
    right: ['Hunter Hack', 'Working Hunter', 'Equitation Over Fences', 'Jumping', 'English Versatility', 'Western Versatility'],
  },
  ApHC: {
    left: ['Showmanship at Halter', 'Western Horsemanship', 'Bareback Horsemanship', 'Hunt Seat Equitation'],
    middle: ['Trail', 'Ranch Trail'],
    right: ['Equitation Over Fences', 'Working Hunter', 'Hunter Hack', 'Jumping'],
  },
  ABRA: {
    left: ['Showmanship at Halter', 'Western Horsemanship', 'Hunt Seat Equitation'],
    middle: ['Trail', 'Ranch Trail'],
    right: ['Hunter Hack', 'Working Hunter', 'Equitation Over Fences', 'Jumping'],
  },
  PtHA: {
    left: ['Showmanship at Halter', 'Western Horsemanship', 'Hunt Seat Equitation'],
    middle: ['Trail', 'In-Hand Trail', 'Ranch Trail'],
    right: ['Hunter Hack', 'Working Hunter', 'Equitation Over Fences', 'Jumping'],
  },
};

const DEFAULT_COLUMN_LAYOUT = {
  left: ['Showmanship at Halter', 'Horsemanship', 'Hunt Seat Equitation'],
  middle: ['Trail', 'Ranch Trail'],
  right: ['Hunter Hack', 'Working Hunter', 'Equitation Over Fences', 'Jumping'],
};

const DisciplineCheckbox = ({ disc, isSelected, onToggle }) => (
  <div className="flex items-center space-x-2">
    <Checkbox
      id={`disc-${disc.id}`}
      checked={isSelected}
      onCheckedChange={(checked) => onToggle(disc, checked)}
    />
    <Label htmlFor={`disc-${disc.id}`} className="font-normal cursor-pointer text-sm">
      {disc.name.replace(' at Halter', '')}
    </Label>
  </div>
);

const CustomPatternGrid = ({ disciplines, associationId, selectedKeys, onToggle }) => {
  const layout = COLUMN_LAYOUTS[associationId] || DEFAULT_COLUMN_LAYOUT;

  const getDisciplinesByNames = (names) =>
    names.map(name => disciplines.find(d => d.name === name)).filter(Boolean);

  const allPredefinedNames = [...layout.left, ...layout.middle, ...layout.right];
  const leftDisciplines = getDisciplinesByNames(layout.left);
  const middleDisciplines = getDisciplinesByNames(layout.middle);
  const rightDisciplines = getDisciplinesByNames(layout.right);
  const customDisciplines = disciplines.filter(d => !allPredefinedNames.includes(d.name));

  const renderDisc = (disc) => (
    <DisciplineCheckbox
      key={disc.id}
      disc={disc}
      isSelected={selectedKeys.has(`${disc.association_id}::${disc.name}`)}
      onToggle={onToggle}
    />
  );

  return (
    <div className="space-y-1.5">
      <h4 className="text-sm font-semibold text-muted-foreground px-1.5">Custom Pattern</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-1.5">
        <div className="space-y-2">{leftDisciplines.map(renderDisc)}</div>
        <div className="space-y-2">{middleDisciplines.map(renderDisc)}</div>
        <div className="space-y-2">{rightDisciplines.map(renderDisc)}</div>
      </div>
      {customDisciplines.length > 0 && (
        <div className="mt-3 px-1.5">
          <h5 className="text-xs font-medium text-muted-foreground mb-2">Custom Disciplines</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {customDisciplines.map(renderDisc)}
          </div>
        </div>
      )}
    </div>
  );
};

const GenericDisciplineGrid = ({ disciplines, selectedKeys, onToggle }) => (
  <div className="space-y-1.5">
    <h4 className="text-sm font-semibold text-muted-foreground px-1.5">Custom Pattern</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-1.5">
      {disciplines.map(disc => (
        <DisciplineCheckbox
          key={disc.id}
          disc={disc}
          isSelected={selectedKeys.has(`${disc.association_id}::${disc.name}`)}
          onToggle={onToggle}
        />
      ))}
    </div>
  </div>
);

const AssociationDisciplineGroup = ({ association, disciplines, selectedKeys, onToggle }) => {
  const enriched = useMemo(() => addLogoToAssociations([association])[0], [association]);
  const logoUrl = getAssociationLogo(enriched);
  const Icon = getDefaultAssociationIcon(enriched);
  const useThreeColumnLayout = ['AQHA', 'APHA', 'ApHC', 'ABRA', 'PtHA'].includes(association.id);

  // Only show custom pattern type disciplines
  const customDisciplines = disciplines.filter(d => d.pattern_type === 'custom');

  if (customDisciplines.length === 0) return null;

  return (
    <AccordionItem value={association.id} className="border rounded-lg overflow-hidden">
      <AccordionTrigger className="text-base font-semibold hover:no-underline px-3 py-2 bg-muted/50">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={`${association.name} logo`} className="h-8 object-contain" />
          ) : (
            <Icon className="h-8 w-8 text-muted-foreground" />
          )}
          <span>{association.name || association.id}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-3 space-y-3">
        {useThreeColumnLayout ? (
          <CustomPatternGrid
            disciplines={customDisciplines}
            associationId={association.id}
            selectedKeys={selectedKeys}
            onToggle={onToggle}
          />
        ) : (
          <GenericDisciplineGrid
            disciplines={customDisciplines}
            selectedKeys={selectedKeys}
            onToggle={onToggle}
          />
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

export const Step2_DisciplineAndClass = ({ formData, setFormData, disciplineLibrary, associationsData }) => {
  const selectedClasses = formData.selectedClasses || [];

  // Build a Set of selected discipline keys for quick lookup
  const selectedKeys = useMemo(() => new Set(selectedClasses), [selectedClasses]);

  // Get associations selected in Step 1
  const selectedAssocIds = useMemo(
    () => Object.keys(formData.associations || {}).filter(k => formData.associations[k]),
    [formData.associations]
  );

  // Group disciplines by association, filtered to selected associations
  const groupedByAssociation = useMemo(() => {
    const groups = [];
    for (const assocId of selectedAssocIds) {
      const association = (associationsData || []).find(a => a.id === assocId);
      if (!association) continue;
      const disciplines = (disciplineLibrary || []).filter(d => d.association_id === assocId);
      if (disciplines.length > 0) {
        groups.push({ association, disciplines });
      }
    }
    return groups;
  }, [selectedAssocIds, disciplineLibrary, associationsData]);

  // Default open accordion values (all selected associations)
  const defaultAccordionValues = useMemo(
    () => groupedByAssociation.map(g => g.association.id),
    [groupedByAssociation]
  );

  const handleDisciplineToggle = (disc, checked) => {
    const key = `${disc.association_id}::${disc.name}`;
    setFormData(prev => {
      const current = prev.selectedClasses || [];
      let updated;
      if (checked) {
        updated = [...current, key];
      } else {
        updated = current.filter(c => c !== key);
      }
      return {
        ...prev,
        selectedClasses: updated,
        selectedDiscipline: updated.length > 0 ? updated[0].split('::')[1] : '',
      };
    });
  };

  const handleRemoveSelection = (key) => {
    setFormData(prev => {
      const updated = (prev.selectedClasses || []).filter(c => c !== key);
      return {
        ...prev,
        selectedClasses: updated,
        selectedDiscipline: updated.length > 0 ? updated[0].split('::')[1] : '',
      };
    });
  };

  return (
    <motion.div
      key="step-2"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Step 2: Select Disciplines</CardTitle>
        <CardDescription className="text-sm">
          Select the disciplines this pattern set applies to. Only associations chosen in Step 1 are shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {groupedByAssociation.length === 0 ? (
          <div className="flex items-center justify-center h-40 rounded-md border border-dashed bg-muted/30">
            <p className="text-sm text-muted-foreground">
              No associations selected. Go back to Step 1 to select at least one association.
            </p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={defaultAccordionValues} className="space-y-2">
            {groupedByAssociation.map(({ association, disciplines }) => (
              <AssociationDisciplineGroup
                key={association.id}
                association={association}
                disciplines={disciplines}
                selectedKeys={selectedKeys}
                onToggle={handleDisciplineToggle}
              />
            ))}
          </Accordion>
        )}

        {/* Selected disciplines summary */}
        {selectedClasses.length > 0 && (
          <div className="pt-3 border-t">
            <Label className="text-xs text-muted-foreground mb-2 block">
              Selected Disciplines ({selectedClasses.length}):
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {selectedClasses.map(key => {
                const displayName = key.includes('::') ? key.split('::')[1] : key;
                const assocId = key.includes('::') ? key.split('::')[0] : '';
                return (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-destructive/20"
                    onClick={() => handleRemoveSelection(key)}
                  >
                    {assocId && <span className="font-semibold mr-1">{assocId}</span>}
                    {displayName.replace(' at Halter', '')} &times;
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </motion.div>
  );
};
