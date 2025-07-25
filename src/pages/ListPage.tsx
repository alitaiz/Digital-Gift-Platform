import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGiftsContext } from '../App';
import { GiftCard, HeartIcon } from '../components/ui';
import { GiftSummary, CreatedGiftInfo } from '../types';

const ListPage = () => {
  const { getAllSlugs, deleteGift, getCreatedGifts, removeVisitedSlug, getGiftSummaries } = useGiftsContext();
  const [gifts, setGifts] = useState<GiftSummary[]>([]);
  const [createdGifts, setCreatedGifts] = useState<CreatedGiftInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGifts = useCallback(async () => {
    setLoading(true);
    setError('');
    const slugs = getAllSlugs();
    const created = getCreatedGifts();
    setCreatedGifts(created);

    if (slugs.length > 0) {
      const fetchedGifts = await getGiftSummaries(slugs);
      // Sort on the client side after fetching
      setGifts(fetchedGifts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else {
      setGifts([]);
    }
    setLoading(false);
  }, [getAllSlugs, getCreatedGifts, getGiftSummaries]);

  useEffect(() => {
    loadGifts();
  }, [loadGifts]);
  
  const handleDelete = async (slug: string) => {
    setError('');
    const ownedGift = createdGifts.find(cg => cg.slug === slug);

    if (ownedGift) {
      // User is the owner: permanent deletion
      if (window.confirm("Are you sure you want to permanently delete this gift? This will remove all data and photos forever and cannot be undone.")) {
        const result = await deleteGift(slug, ownedGift.editKey);
        if (result.success) {
          // Refresh the list from source of truth
          loadGifts();
        } else {
          setError(result.error || 'An unknown error occurred while deleting.');
        }
      }
    } else {
      // User is a visitor: remove from local list
      if (window.confirm("Are you sure you want to remove this gift from your list? This will not delete the original page.")) {
        removeVisitedSlug(slug);
        // Refresh the list from source of truth
        loadGifts();
      }
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream/70 pt-24 pb-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-brand-navy">Your Gifts</h1>
          <p className="text-center text-slate-600 mt-2">A list of gifts you have created or viewed on this device.</p>
          
          {error && (
            <div role="alert" className="mt-4 p-4 bg-red-50 border border-red-300 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    An Error Occurred
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
             <div className="flex justify-center items-center py-10">
                <HeartIcon className="animate-pulse w-10 h-10 text-brand-gold"/>
                <p className="ml-4 font-serif text-slate-600">Loading your gifts...</p>
             </div>
          ) : gifts.length > 0 ? (
            <div className="mt-8 space-y-4">
              {gifts.map(gift => {
                const isOwner = createdGifts.some(cg => cg.slug === gift.slug);
                return <GiftCard key={gift.slug} gift={gift} onDelete={handleDelete} isOwner={isOwner} />
              })}
            </div>
          ) : (
            <p className="text-center mt-8 text-slate-500">You haven't created or viewed any gifts on this device yet.</p>
          )}

          <div className="mt-8 text-center">
            <Link to="/create" className="bg-brand-gold text-white font-bold py-3 px-6 rounded-full hover:bg-opacity-90 transition-transform duration-300 inline-block transform hover:scale-105">
              🎁 Create a New Gift
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListPage;
