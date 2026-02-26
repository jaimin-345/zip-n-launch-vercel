import { supabase } from '@/lib/supabaseClient';

// Discipline prefix map for pattern numbering
const DISCIPLINE_PREFIXES = {
  'reining': 'RN',
  'trail': 'TR',
  'horsemanship': 'HM',
  'western riding': 'WR',
  'ranch riding': 'RR',
  'hunter under saddle': 'HUS',
  'western pleasure': 'WP',
  'showmanship': 'SM',
  'halter': 'HL',
  'barrel racing': 'BR',
  'pole bending': 'PB',
  'cutting': 'CT',
  'working cow horse': 'WCH',
  'ranch trail': 'RT',
  'ranch reining': 'RRN',
  'versatility ranch horse': 'VRH',
  'ranch versatility': 'RV',
};

/**
 * Get the discipline prefix for a given discipline name.
 * Falls back to first 2-3 characters of the discipline name.
 */
export function getDisciplinePrefix(discipline) {
  if (!discipline) return 'UN'; // Unknown
  const lower = discipline.toLowerCase().trim();
  if (DISCIPLINE_PREFIXES[lower]) return DISCIPLINE_PREFIXES[lower];
  // Fallback: use first 2-3 uppercase letters
  const words = discipline.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return discipline.substring(0, 2).toUpperCase();
}

/**
 * Generate the next pattern number for a given discipline.
 * Format: {PREFIX}-{YEAR}-{SEQ} (e.g., RN-2026-001)
 */
export async function generateNextPatternNumber(discipline) {
  const prefix = getDisciplinePrefix(discipline);
  const year = new Date().getFullYear();
  const numberPrefix = `${prefix}-${year}-`;

  // Query existing patterns with this prefix to find the max sequence
  const { data, error } = await supabase
    .from('patterns')
    .select('pattern_set_number')
    .like('pattern_set_number', `${numberPrefix}%`)
    .order('pattern_set_number', { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (!error && data && data.length > 0) {
    const lastNumber = data[0].pattern_set_number;
    const seqPart = lastNumber.split('-').pop();
    const parsed = parseInt(seqPart, 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }

  return `${numberPrefix}${String(nextSeq).padStart(3, '0')}`;
}

/**
 * Format a pattern number for display.
 * Returns the number as-is, or "Unassigned" if empty.
 */
export function formatPatternNumber(patternNumber) {
  if (!patternNumber) return 'Unassigned';
  return patternNumber;
}

/**
 * Assign a pattern number to a pattern in the database.
 */
export async function assignPatternNumber(patternId, patternNumber) {
  const { error } = await supabase
    .from('patterns')
    .update({ pattern_set_number: patternNumber })
    .eq('id', patternId);

  return { error };
}

export { DISCIPLINE_PREFIXES };
