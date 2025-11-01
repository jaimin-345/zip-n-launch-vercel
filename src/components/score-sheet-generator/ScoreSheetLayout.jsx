import React from 'react';
import { motion } from 'framer-motion';
import DynamicManeuverText from './DynamicManeuverText';

const ManeuverBox = ({ number, text }) => (
  <div className="relative border-2 border-black flex flex-col h-full bg-white">
    <div className="absolute -top-3 -left-3 bg-white px-1 z-10">
      <span className="text-red-600 font-bold text-lg">{number}</span>
    </div>
    <div className="flex-grow p-2">
      {text && <DynamicManeuverText text={text} />}
    </div>
    <div className="border-t-2 border-black h-8 text-center font-semibold text-sm pt-1">
      Score
    </div>
  </div>
);

const ScoreSheetLayout = ({ steps = {}, patternInfo = {}, template = null }) => {
  const maxSteps = 15;
  const boxes = Array.from({ length: maxSteps }, (_, i) => i + 1);

  return (
    <motion.div
      key={template ? template.path : 'default'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-300 p-8 aspect-[8.5/11] w-full max-w-4xl mx-auto shadow-lg printable-area relative"
    >
      {template ? (
        <img-replace src={template.path} alt={`${patternInfo.association} ${patternInfo.className} Score Sheet`} className="absolute inset-0 w-full h-full object-contain" />
      ) : (
        <div className="bg-white w-full h-full" />
      )}
      
      <div className="absolute inset-0 p-8">
        <header className="text-center mb-4">
          <h1 className="text-3xl font-bold">{patternInfo.className || 'Class Name'}</h1>
          <h2 className="text-xl">{patternInfo.patternName || 'Pattern Name'}</h2>
        </header>

        <div className="p-4 grid grid-cols-3 grid-rows-5 gap-4" style={{ height: '80%' }}>
          {boxes.map(boxNumber => (
            <ManeuverBox key={boxNumber} number={boxNumber} text={steps[boxNumber] || ''} />
          ))}
        </div>

        <footer className="absolute bottom-8 left-8 right-8 flex justify-between text-xs">
          <p>Judge's Signature: _________________________</p>
          <p>Date: ______________</p>
        </footer>
      </div>
    </motion.div>
  );
};

export default ScoreSheetLayout;