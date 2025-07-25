
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGiftsContext } from '../App';

const RecoverPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getGiftBySlug } = useGiftsContext();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const notfound = searchParams.get('notfound');
    const slug = searchParams.get('slug');
    if (notfound) {
      if (slug) {
        setError(`We couldn't find a gift with the code "${slug}". Please check it or create a new one.`);
      } else {
        setError("We couldn't find that gift. Please check the code or create a new one.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Please enter a gift code.');
      return;
    }

    setIsLoading(true);
    const gift = await getGiftBySlug(trimmedCode);
    setIsLoading(false);

    if (gift) {
      navigate(`/gift/${trimmedCode}`);
    } else {
      setError(`Gift with code "${trimmedCode}" not found. Please check the code and try again.`);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center pt-20 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl text-center">
          <h1 className="text-2xl font-bold font-serif text-brand-navy">Find a Gift</h1>
          <p className="text-slate-600 mt-2">Enter the gift code to view a page.</p>
          <form onSubmit={handleSubmit} className="mt-6">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code, e.g., for-mom-1a2b"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-brand-gold focus:border-brand-gold"
              aria-label="Gift Code"
              disabled={isLoading}
            />
            {error && <p role="alert" className="text-red-500 text-sm mt-2">{error}</p>}
            <button type="submit" className="w-full mt-4 bg-brand-navy text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-80 transition-colors duration-300 disabled:bg-slate-400">
              {isLoading ? 'Searching...' : 'Find Gift Page'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecoverPage;
