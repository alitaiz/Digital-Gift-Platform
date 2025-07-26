import { useState, useCallback } from 'react';
import { Gift, CreatedGiftInfo, GiftUpdatePayload, GiftSummary } from '../types';
import { API_BASE_URL } from '../config';

const LOCAL_CREATED_GIFTS_KEY = 'digital_gift_created_gifts';
const LOCAL_VISITED_SLUGS_KEY = 'digital_gift_visited_slugs';

// This hook now manages interactions with the remote API and local storage for ownership/access
export const useGifts = () => {
  const [loading, setLoading] = useState<boolean>(false);

  // --- Local storage management for OWNED gifts ---
  const getCreatedGifts = useCallback((): CreatedGiftInfo[] => {
    try {
      const stored = localStorage.getItem(LOCAL_CREATED_GIFTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);
  
  const addCreatedGift = useCallback((slug: string, editKey: string) => {
    const created = getCreatedGifts();
    if (!created.some(m => m.slug === slug)) {
      const newCreated = [...created, { slug, editKey }];
      localStorage.setItem(LOCAL_CREATED_GIFTS_KEY, JSON.stringify(newCreated));
    }
  }, [getCreatedGifts]);
  
  const removeCreatedGift = useCallback((slug: string) => {
     const created = getCreatedGifts();
     const updated = created.filter(m => m.slug !== slug);
     localStorage.setItem(LOCAL_CREATED_GIFTS_KEY, JSON.stringify(updated));
  }, [getCreatedGifts]);

  // --- Local storage management for VISITED gifts ---
  const getVisitedSlugs = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(LOCAL_VISITED_SLUGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const addVisitedSlug = useCallback((slug: string) => {
    const created = getCreatedGifts();
    if (created.some(m => m.slug === slug)) return; // Don't add if we own it

    const visited = getVisitedSlugs();
    if (!visited.includes(slug)) {
      localStorage.setItem(LOCAL_VISITED_SLUGS_KEY, JSON.stringify([...visited, slug]));
    }
  }, [getCreatedGifts, getVisitedSlugs]);

  const removeVisitedSlug = useCallback((slug: string) => {
    const visited = getVisitedSlugs();
    const updated = visited.filter(s => s !== slug);
    localStorage.setItem(LOCAL_VISITED_SLUGS_KEY, JSON.stringify(updated));
  }, [getVisitedSlugs]);

  // --- Combined slugs ---
  const getAllSlugs = useCallback((): string[] => {
    const created = getCreatedGifts().map(m => m.slug);
    const visited = getVisitedSlugs();
    return [...new Set([...created, ...visited])]; // Unique slugs
  }, [getCreatedGifts, getVisitedSlugs]);


  // --- API Functions ---
  const generateSlug = useCallback((name: string): string => {
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!baseSlug) {
        return `gift-${Date.now().toString().slice(-6)}`;
    }
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }, []);

  const addGift = useCallback(async (giftData: { recipientName: string; greeting: string; message: string; images: string[]; slug?: string; }): Promise<{ success: boolean; error?: string, slug?: string }> => {
    setLoading(true);
    try {
      const { recipientName, greeting, message, images, slug } = giftData;
      // Generate slug and editKey here
      const finalSlug = slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || generateSlug(recipientName);
      const editKey = crypto.randomUUID();

      const newGift: Gift = {
        recipientName,
        greeting,
        message,
        images,
        slug: finalSlug,
        createdAt: new Date().toISOString(),
        editKey,
      };

      const response = await fetch(`${API_BASE_URL}/api/gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGift),
      });

      if (response.ok) {
        addCreatedGift(newGift.slug, newGift.editKey);
        return { success: true, slug: newGift.slug };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || `Failed to create gift. Status: ${response.status}` };
      }
    } catch (error) {
      console.error("API call to addGift failed:", error);
      const message = error instanceof Error ? error.message : "An unknown network error occurred.";
      return { success: false, error: `Network Error: ${message}. Please check your connection and the browser console for details.` };
    } finally {
      setLoading(false);
    }
  }, [addCreatedGift, generateSlug]);
  
  const getGiftBySlug = useCallback(async (slug: string): Promise<Omit<Gift, 'editKey'> | undefined> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift/${slug}`);
      if (!response.ok) {
        return undefined;
      }
      const data: Omit<Gift, 'editKey'> = await response.json();
      addVisitedSlug(slug); // Add to visited list on successful fetch
      return data;
    } catch (error) {
      console.error("API call to getGiftBySlug failed:", error);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [addVisitedSlug]);

  const getGiftSummaries = useCallback(async (slugs: string[]): Promise<GiftSummary[]> => {
    if (slugs.length === 0) {
        return [];
    }
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/gifts/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slugs }),
        });

        if (!response.ok) {
            console.error("API call to getGiftSummaries failed:", response.statusText);
            return [];
        }
        
        const data: GiftSummary[] = await response.json();
        return data;
    } catch (error) {
        console.error("Network error during getGiftSummaries:", error);
        return [];
    } finally {
        setLoading(false);
    }
  }, []);

  const deleteGift = useCallback(async (slug: string, editKey: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift/${slug}`, {
        method: 'DELETE',
        headers: {
            'X-Edit-Key': editKey,
        }
      });

      if (response.ok) {
        removeCreatedGift(slug);
        removeVisitedSlug(slug); // Also remove from visited if it's there
        return { success: true };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `Failed to delete. Server responded with ${response.status}` };
    } catch (error) {
      console.error("API call to deleteGift failed:", error);
      const message = error instanceof Error ? error.message : "An unknown network error occurred.";
      return { success: false, error: `Network Error: ${message}. Please check your connection and the browser console for details.` };
    } finally {
      setLoading(false);
    }
  }, [removeCreatedGift, removeVisitedSlug]);
  
  const updateGift = useCallback(async (slug: string, editKey: string, data: GiftUpdatePayload): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/gift/${slug}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Edit-Key': editKey,
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            return { success: true };
        }
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || `Failed to update. Server responded with ${response.status}` };
    } catch (error) {
        console.error("API call to updateGift failed:", error);
        const message = error instanceof Error ? error.message : "An unknown network error occurred.";
        return { success: false, error: `Network Error: ${message}. Please check your connection and the browser console for details.` };
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    loading, 
    addGift, 
    getGiftBySlug,
    getGiftSummaries,
    deleteGift,
    updateGift,
    generateSlug,
    getAllSlugs,
    getCreatedGifts,
    removeVisitedSlug,
  };
};
