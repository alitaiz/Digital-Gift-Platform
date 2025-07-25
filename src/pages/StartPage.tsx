import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGiftsContext } from '../App';
import { HeartIcon } from '../components/ui';

const StartPage = () => {
  const { getAllSlugs } = useGiftsContext();
  const navigate = useNavigate();
  const [recoverCode, setRecoverCode] = useState('');
  const [allSlugs, setAllSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slugs = getAllSlugs();
    setAllSlugs(slugs);
    if (slugs.length === 1) {
      navigate(`/gift/${slugs[0]}`, { replace: true });
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoverCode.trim()) {
      navigate(`/gift/${recoverCode.trim()}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><HeartIcon className="animate-pulse w-12 h-12 text-brand-gold"/></div>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-brand-cream">
       <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 via-transparent to-brand-navy/10 opacity-50"></div>
      <div className="relative container mx-auto px-6 py-24 text-center">
        {allSlugs.length > 0 ? (
          <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-brand-navy">Welcome Back! ✨</h1>
            <p className="mt-4 text-slate-600">You can find the gifts you've created or received below.</p>
            <div className="mt-6">
                <Link to="/list" className="bg-brand-navy text-white font-semibold py-2 px-5 rounded-full hover:bg-opacity-80 transition-colors">View Your Gifts</Link>
            </div>
            <div className="mt-8">
              <Link to="/create" className="bg-brand-gold text-white font-bold py-3 px-6 rounded-full hover:bg-opacity-90 transition-transform duration-300 inline-block transform hover:scale-105">
                🎁 Create a New Gift
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-brand-navy">
              Send a digital gift to someone special 💌
            </h1>
            <p className="mt-6 text-lg text-slate-700">
              A unique and personal way to share a heartfelt message and cherished photos.
            </p>
            <Link to="/create" className="mt-10 inline-block bg-brand-gold text-white font-bold py-4 px-8 rounded-full hover:bg-opacity-90 transition-transform duration-300 text-lg transform hover:scale-105">
              Create a Gift Page
            </Link>
          </div>
        )}
         <div className="mt-12 max-w-md mx-auto">
            <form onSubmit={handleRecoverSubmit} className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
              <label htmlFor="recover-code" className="font-serif text-slate-700">Have a gift code?</label>
              <div className="mt-2 flex space-x-2">
                <input
                  id="recover-code"
                  type="text"
                  value={recoverCode}
                  onChange={(e) => setRecoverCode(e.target.value)}
                  placeholder="e.g., for-mom-1a2b"
                  className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-brand-gold focus:border-brand-gold"
                />
                <button type="submit" className="bg-brand-navy text-white p-2 rounded-full hover:bg-opacity-80 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
              </div>
            </form>
          </div>
      </div>
    </div>
  );
};

export default StartPage;
