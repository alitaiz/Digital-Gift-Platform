import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGiftsContext } from '../App';
import { Gift } from '../types';
import { Carousel } from '../components/Carousel';
import { HeartIcon, GiftIcon } from '../components/ui';

const GiftWrapOverlay = ({ onOpen }: { onOpen: () => void }) => (
    <div className="fixed inset-0 bg-brand-navy z-40 flex flex-col items-center justify-center text-center p-4 transition-opacity duration-500">
        <div className="animate-bounce">
            <GiftIcon className="w-24 h-24 text-brand-gold" />
        </div>
        <h2 className="mt-6 text-3xl font-serif text-white">A special gift, just for you!</h2>
        <button
            onClick={onOpen}
            className="mt-8 bg-brand-gold text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-opacity-90 transition-transform duration-300 transform hover:scale-105"
        >
            Click to Open
        </button>
    </div>
);


const GiftPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getGiftBySlug, loading, getCreatedGifts } = useGiftsContext();
  const navigate = useNavigate();
  const [gift, setGift] = useState<Omit<Gift, 'editKey'> | null>(null);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isUnwrapped, setIsUnwrapped] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchGift = async () => {
      if (slug) {
        const createdGifts = getCreatedGifts();
        const ownerInfo = createdGifts.find(m => m.slug === slug);
        if (isMounted) {
          setIsOwner(!!ownerInfo);
        }

        const foundGift = await getGiftBySlug(slug);
        if (isMounted) {
          if (foundGift) {
            setGift(foundGift);
          } else {
            setError(`Could not find a gift with code "${slug}".`);
            setTimeout(() => navigate(`/recover?notfound=true&slug=${slug}`), 2500);
          }
        }
      }
    };

    fetchGift();
    return () => { isMounted = false; };
  }, [slug, getGiftBySlug, navigate, getCreatedGifts]);

  const handleOpenGift = () => {
      setShowOverlay(false);
      setTimeout(() => setIsUnwrapped(true), 500); // Wait for fade out animation
  }

  if (loading && !gift) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-center p-4">
            <HeartIcon className="w-16 h-16 text-brand-gold animate-pulse" />
            <p className="mt-4 font-serif text-slate-600 text-xl">Finding your gift...</p>
        </div>
    );
  }
  
  if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-center p-4">
            <h2 className="text-2xl font-serif text-red-500">{error}</h2>
            <p className="mt-2 text-slate-600">You will be redirected to the recovery page shortly.</p>
        </div>
      )
  }

  if (!gift) {
    return null; 
  }
  
  if (!isUnwrapped && !isOwner) { // Owners don't see the unwrap animation when viewing their own gift
      return <GiftWrapOverlay onOpen={handleOpenGift} />;
  }

  const coverImage = gift.images && gift.images.length > 0 ? gift.images[0] : 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?q=80&w=1912&auto=format&fit=crop';

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-80 md:h-96 w-full flex items-center justify-center text-white text-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImage})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
        <div className="relative z-10 p-4 animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-bold font-serif drop-shadow-lg">{gift.recipientName}</h1>
          <p className="mt-4 text-xl font-serif italic drop-shadow-md">"{gift.greeting || 'A special something, just for you.'}"</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto max-w-3xl p-6 md:p-8 -mt-16 relative z-10">
        <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl animate-fade-in-up animation-delay-300">
          <div className="text-center mb-8">
            <HeartIcon className="w-8 h-8 mx-auto text-brand-gold" />
            <p className="mt-2 text-sm text-slate-500 font-serif">Gift Code: <span className="font-bold text-slate-700">{gift.slug}</span></p>
            {isOwner && (
              <Link to={`/edit/${gift.slug}`} className="mt-2 inline-block bg-gray-200 text-slate-700 text-xs font-bold py-1 px-3 rounded-full hover:bg-gray-300 transition-colors">
                  Edit Gift
              </Link>
            )}
          </div>

          <div className="prose prose-lg max-w-none text-slate-800 whitespace-pre-wrap font-serif text-center leading-relaxed">
            <p>{gift.message}</p>
          </div>

          {gift.images && gift.images.length > 0 && (
            <div className="mt-12">
              <h3 className="text-3xl font-serif font-bold text-center text-brand-navy mb-6">Shared Moments</h3>
              <Carousel images={gift.images} />
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center py-12 px-4 flex flex-col items-center space-y-4">
        <Link to="/create" className="bg-brand-gold text-white font-bold py-3 px-6 rounded-full hover:bg-opacity-90 transition-colors duration-300">
          Create Your Own Gift
        </Link>
      </div>
    </div>
  );
};

export default GiftPage;
