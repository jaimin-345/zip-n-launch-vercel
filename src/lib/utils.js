import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function isWalkTrotDivision(divisionName) {
    if (!divisionName) return false;
    const lowerCaseName = divisionName.toLowerCase();
    return lowerCaseName.includes('walk-trot') || lowerCaseName.includes('walk/trot') || lowerCaseName.includes(' w/t ') || lowerCaseName.endsWith(' w/t') || lowerCaseName.startsWith('w/t ') || lowerCaseName.includes(' wt ') || lowerCaseName.endsWith(' wt') || lowerCaseName.startsWith('wt ');
}