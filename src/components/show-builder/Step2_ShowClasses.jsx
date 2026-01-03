import React from 'react';
import { motion } from 'framer-motion';
import { Step2_ClassesAndDivisions as PBB_Step2_Classes } from '@/components/pbb/Step2_ClassesAndDivisions';

export const Step2_ShowClasses = ({ formData, setFormData, disciplineLibrary, associationsData, onRefreshDisciplines }) => {
    return (
         <motion.div key="step2-show-classes" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <PBB_Step2_Classes
                formData={formData}
                setFormData={setFormData}
                disciplineLibrary={disciplineLibrary}
                associationsData={associationsData}
                onRefreshDisciplines={onRefreshDisciplines}
            />
         </motion.div>
    );
};