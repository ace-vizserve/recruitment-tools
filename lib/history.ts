export interface HistoryEntry {
  id: string; // Unique ID for deletion
  timestamp: number;
  orgName: string;
  jobId: string;
  jobTitle: string;
  encodedTitle: string;
  urls: {
    geg: string;
    indeed: string;
    myCareers: string;
  };
}

const STORAGE_KEY = 'mrf_links_history';

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse history", e);
    return [];
  }
}

export function saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
  const currentHistory = getHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  
  // Add to beginning
  const updatedHistory = [newEntry, ...currentHistory];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  return updatedHistory;
}

export function deleteHistoryEntry(id: string) {
  const currentHistory = getHistory();
  const updatedHistory = currentHistory.filter(entry => entry.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  return updatedHistory;
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}
