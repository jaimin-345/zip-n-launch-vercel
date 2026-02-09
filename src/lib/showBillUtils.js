import { v4 as uuidv4 } from 'uuid';

// Extract judge names from formData.associationJudges
function extractJudgeNames(formData) {
  const names = new Set();
  const assocJudges = formData.associationJudges || {};
  for (const assocId of Object.keys(assocJudges)) {
    const info = assocJudges[assocId];
    if (info?.judges) {
      info.judges.forEach(j => {
        if (j?.name?.trim()) names.add(j.name.trim());
      });
    }
  }
  return Array.from(names);
}

// Extract all class items from formData disciplines
export function getAllClassItems(formData) {
  return (formData.disciplines || []).flatMap(discipline =>
    (discipline.divisionOrder || []).map(divisionId => {
      const [assocId, ...divisionParts] = divisionId.split('-');
      const divisionName = divisionParts.join('-');
      const customTitle = discipline.divisionPrintTitles?.[divisionId];
      const name = customTitle || (divisionName.startsWith('custom-') ? divisionName.substring(7) : divisionName);
      return {
        id: divisionId,
        name,
        disciplineId: discipline.id,
        disciplineName: discipline.name,
        assocId,
        discipline,
      };
    })
  );
}

// Get classes not yet placed in any showBill classBox
export function getUnplacedClasses(formData) {
  const allClasses = getAllClassItems(formData);
  if (!formData.showBill) return allClasses;

  const placedIds = new Set();
  for (const day of formData.showBill.days || []) {
    for (const arena of day.arenas || []) {
      for (const item of arena.items || []) {
        if (item.type === 'classBox' && item.classes) {
          item.classes.forEach(id => placedIds.add(id));
        }
      }
    }
  }
  return allClasses.filter(c => !placedIds.has(c.id));
}

// Create initial showBill from formData
export function initializeShowBill(formData) {
  const days = [];
  if (formData.startDate) {
    let current = new Date(formData.startDate + 'T00:00:00');
    const end = formData.endDate ? new Date(formData.endDate + 'T00:00:00') : current;
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      days.push({
        id: `day-${uuidv4()}`,
        date: dateStr,
        label: current.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        arenas: (formData.arenas || []).filter(a => a.name.trim() !== '').map(arena => ({
          id: arena.id,
          name: arena.name,
          items: [],
        })),
      });
      current.setDate(current.getDate() + 1);
    }
  }

  // If no days generated, create one default day
  if (days.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    days.push({
      id: `day-${uuidv4()}`,
      date: today,
      label: new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      arenas: (formData.arenas || []).filter(a => a.name.trim() !== '').map(arena => ({
        id: arena.id,
        name: arena.name,
        items: [],
      })),
    });
  }

  // If no arenas, add a default one
  if (days[0].arenas.length === 0) {
    const defaultArena = { id: `arena-${uuidv4()}`, name: 'Main Arena', items: [] };
    days.forEach(day => { day.arenas = [{ ...defaultArena, items: [] }]; });
  }

  return {
    header: {
      showName: formData.showName || '',
      dates: formData.startDate && formData.endDate
        ? `${new Date(formData.startDate + 'T00:00:00').toLocaleDateString()} - ${new Date(formData.endDate + 'T00:00:00').toLocaleDateString()}`
        : '',
      venue: formData.venueAddress || '',
      judges: extractJudgeNames(formData),
      customText: '',
    },
    days,
    nextClassNumber: 10001,
    settings: {
      showNumbers: true,
      showAssociations: true,
      numberingMode: 'global',
    },
  };
}

// Create a new show bill item
export function createShowBillItem(type, overrides = {}) {
  const defaults = {
    classBox: { type: 'classBox', id: uuidv4(), number: 0, title: '', classes: [] },
    break: { type: 'break', id: uuidv4(), title: 'Break', duration: '15 min' },
    drag: { type: 'drag', id: uuidv4(), title: 'Arena Drag' },
    sectionHeader: { type: 'sectionHeader', id: uuidv4(), title: 'Section Header' },
    custom: { type: 'custom', id: uuidv4(), title: 'Custom Event', content: '' },
  };
  return { ...(defaults[type] || defaults.custom), ...overrides };
}

// Renumber all classBox items sequentially
export function renumberShowBill(showBill) {
  if (!showBill) return showBill;
  const mode = showBill.settings?.numberingMode || 'global';
  const newShowBill = JSON.parse(JSON.stringify(showBill));
  let globalCounter = 1;

  for (const day of newShowBill.days) {
    let dayCounter = 1;
    for (const arena of day.arenas) {
      let arenaCounter = 1;
      for (const item of arena.items) {
        if (item.type === 'classBox') {
          if (mode === 'global') item.number = globalCounter++;
          else if (mode === 'per-day') item.number = dayCounter++;
          else if (mode === 'per-arena') item.number = arenaCounter++;
        }
      }
    }
  }
  newShowBill.nextClassNumber = globalCounter;
  return newShowBill;
}

// Find the arena containing an item
export function findItemLocation(showBill, itemId) {
  for (const day of showBill.days) {
    for (const arena of day.arenas) {
      const idx = arena.items.findIndex(i => i.id === itemId);
      if (idx !== -1) return { dayId: day.id, arenaId: arena.id, index: idx, item: arena.items[idx] };
    }
  }
  return null;
}

// Get the arena object by dayId and arenaId
function getArena(showBill, dayId, arenaId) {
  const day = showBill.days.find(d => d.id === dayId);
  if (!day) return null;
  return day.arenas.find(a => a.id === arenaId);
}

// Insert item at index
export function insertItemAtIndex(showBill, dayId, arenaId, index, newItem) {
  const sb = JSON.parse(JSON.stringify(showBill));
  const arena = getArena(sb, dayId, arenaId);
  if (!arena) return showBill;
  arena.items.splice(index, 0, newItem);
  return renumberShowBill(sb);
}

// Append item at end of arena
export function appendItem(showBill, dayId, arenaId, newItem) {
  const sb = JSON.parse(JSON.stringify(showBill));
  const arena = getArena(sb, dayId, arenaId);
  if (!arena) return showBill;
  arena.items.push(newItem);
  return renumberShowBill(sb);
}

// Remove an item
export function removeItem(showBill, dayId, arenaId, itemId) {
  const sb = JSON.parse(JSON.stringify(showBill));
  const arena = getArena(sb, dayId, arenaId);
  if (!arena) return showBill;
  arena.items = arena.items.filter(i => i.id !== itemId);
  return renumberShowBill(sb);
}

// Move item within same arena (reorder)
export function reorderItem(showBill, dayId, arenaId, oldIndex, newIndex) {
  const sb = JSON.parse(JSON.stringify(showBill));
  const arena = getArena(sb, dayId, arenaId);
  if (!arena) return showBill;
  const [moved] = arena.items.splice(oldIndex, 1);
  arena.items.splice(newIndex, 0, moved);
  return renumberShowBill(sb);
}

// Move item between arenas
export function moveItemBetweenArenas(showBill, srcDayId, srcArenaId, srcIndex, destDayId, destArenaId, destIndex) {
  const sb = JSON.parse(JSON.stringify(showBill));
  const srcArena = getArena(sb, srcDayId, srcArenaId);
  const destArena = getArena(sb, destDayId, destArenaId);
  if (!srcArena || !destArena) return showBill;
  const [moved] = srcArena.items.splice(srcIndex, 1);
  destArena.items.splice(destIndex, 0, moved);
  return renumberShowBill(sb);
}

// Add a class to an existing classBox
export function addClassToBox(showBill, dayId, arenaId, itemId, classId) {
  const sb = JSON.parse(JSON.stringify(showBill));
  const arena = getArena(sb, dayId, arenaId);
  if (!arena) return showBill;
  const item = arena.items.find(i => i.id === itemId);
  if (!item || item.type !== 'classBox') return showBill;
  if (!item.classes.includes(classId)) item.classes.push(classId);
  return sb;
}

// Remove a class from a classBox
export function removeClassFromBox(showBill, dayId, arenaId, itemId, classId) {
  const sb = JSON.parse(JSON.stringify(showBill));
  const arena = getArena(sb, dayId, arenaId);
  if (!arena) return showBill;
  const item = arena.items.find(i => i.id === itemId);
  if (!item || item.type !== 'classBox') return showBill;
  item.classes = item.classes.filter(id => id !== classId);
  return sb;
}

// Update a field on an item
export function updateItemField(showBill, dayId, arenaId, itemId, field, value) {
  const sb = JSON.parse(JSON.stringify(showBill));
  const arena = getArena(sb, dayId, arenaId);
  if (!arena) return showBill;
  const item = arena.items.find(i => i.id === itemId);
  if (!item) return showBill;
  item[field] = value;
  return sb;
}

// Update the show bill header
export function updateHeader(showBill, field, value) {
  const sb = JSON.parse(JSON.stringify(showBill));
  sb.header[field] = value;
  return sb;
}
