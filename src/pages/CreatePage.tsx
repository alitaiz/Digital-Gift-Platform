import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGiftsContext } from '../App';
import { ImageUploader } from '../components/ImageUploader';
import { LoadingSpinner, Toast, SparkleIcon } from '../components/ui';
import { GiftUpdatePayload } from '../types';

const MAX_TOTAL_IMAGES = 3;

const CreatePage = () => {
  const { slug: editSlug } = useParams<{ slug: string }>();
  const isEditMode = !!editSlug;

  const { addGift, getGiftBySlug, updateGift, getCreatedGifts } = useGiftsContext();
  const navigate = useNavigate();

  const [recipientName, setRecipientName] = useState('');
  const [slug, setSlug] = useState('');
  const [greeting, setGreeting] = useState('');
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<string[]>([]); // New images from uploader
  const [existingImages, setExistingImages] = useState<string[]>([]); // For edit mode
  const [editKey, setEditKey] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState('');

  const maxNewImages = MAX_TOTAL_IMAGES - existingImages.length;

  useEffect(() => {
      if (isEditMode && editSlug) {
          const loadGiftForEdit = async () => {
              setIsLoading(true);
              const gift = await getGiftBySlug(editSlug);
              const created = getCreatedGifts();
              const ownerInfo = created.find(m => m.slug === editSlug);

              if (gift && ownerInfo) {
                  setRecipientName(gift.recipientName);
                  setGreeting(gift.greeting);
                  setMessage(gift.message);
                  setExistingImages(gift.images);
                  setSlug(gift.slug);
                  setEditKey(ownerInfo.editKey);
              } else {
                  setError("You don't have permission to edit this gift or it doesn't exist.");
                  setTimeout(() => navigate('/list'), 2000);
              }
              setIsLoading(false);
          };
          loadGiftForEdit();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editSlug, navigate]);


  const handleRewrite = async () => {
    if (!message.trim()) {
        setRewriteError('Please write a message first before using AI assist.');
        return;
    }
    setIsRewriting(true);
    setRewriteError('');
    setError('');

    try {
        const response = await fetch(`/api/rewrite-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'The AI assistant failed to respond. Please try again later.');
        }

        const { rewrittenText } = await response.json();
        setMessage(rewrittenText);

    } catch (err) {
        console.error("AI rewrite failed:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setRewriteError(errorMessage);
    } finally {
        setIsRewriting(false);
    }
  };
  
  const handleRemoveExistingImage = (urlToRemove: string) => {
    setExistingImages(current => current.filter(url => url !== urlToRemove));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!recipientName.trim()) {
      setError('Recipient\'s name is required.');
      return;
    }
    if (isUploadingImages) {
        setError('Please wait for images to finish uploading.');
        return;
    }
    setIsLoading(true);

    if (isEditMode) {
        if (!editSlug || !editKey) {
            setError('Could not update gift. Key information is missing.');
            setIsLoading(false);
            return;
        }
        const updatedData: GiftUpdatePayload = {
            recipientName,
            greeting,
            message,
            images: [...existingImages, ...images],
        };
        const result = await updateGift(editSlug, editKey, updatedData);
        if (result.success) {
            setShowToast(true);
            setTimeout(() => {
                navigate(`/gift/${editSlug}`);
            }, 2000);
        } else {
            setError(result.error || 'An unknown error occurred during update.');
            setIsLoading(false);
        }
    } else {
        const giftData = {
          recipientName,
          slug: slug.trim(),
          greeting,
          message,
          images,
        };

        const result = await addGift(giftData);
        
        if (result.success && result.slug) {
            setShowToast(true);
            setTimeout(() => {
                navigate(`/gift/${result.slug}`);
            }, 2000);
        } else {
            setError(result.error || 'An unknown error occurred. Please try again.');
            setIsLoading(false);
        }
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream/70 pt-24 pb-12">
      <Toast message={isEditMode ? `Gift for ${recipientName} updated!` : `Your gift for ${recipientName} is ready!`} show={showToast} onDismiss={() => setShowToast(false)} />
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-brand-navy">{isEditMode ? 'Edit Your Gift' : 'Create a Digital Gift'}</h1>
          <p className="text-center text-slate-600 mt-2">{isEditMode ? 'Update the details for this gift page.' : 'Fill in the details to create a beautiful gift page.'}</p>

          {isLoading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="recipientName" className="block text-sm font-medium text-brand-dark font-serif">Recipient's Name *</label>
                <input type="text" id="recipientName" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold" required />
              </div>
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-brand-dark font-serif">Custom Gift Code (Optional)</label>
                <input type="text" id="slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder={isEditMode ? '' : "e.g., for-best-friend (auto-generated if blank)"} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold disabled:bg-slate-100 disabled:text-slate-500" disabled={isEditMode} />
              </div>
              <div>
                <label htmlFor="greeting" className="block text-sm font-medium text-brand-dark font-serif">A Short Greeting (e.g., "Happy Birthday!", "Just for you!")</label>
                <input type="text" id="greeting" value={greeting} onChange={e => setGreeting(e.target.value)} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold" />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="message" className="block text-sm font-medium text-brand-dark font-serif">Your Personal Message</label>
                  <button 
                    type="button" 
                    onClick={handleRewrite}
                    disabled={isRewriting || !message.trim()}
                    className="flex items-center gap-1.5 text-sm text-brand-gold hover:text-brand-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium px-2 py-1 rounded-md hover:bg-brand-gold/10"
                    aria-label="Polish with AI"
                  >
                    <SparkleIcon className={`w-4 h-4 ${isRewriting ? 'animate-spin' : ''}`} />
                    <span>{isRewriting ? 'Thinking...' : 'AI Polish'}</span>
                  </button>
                </div>
                <textarea 
                  id="message" 
                  value={message} 
                  onChange={e => { setMessage(e.target.value); setRewriteError(''); }} 
                  rows={6} 
                  className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold" 
                  placeholder="Share a favorite memory, a heartfelt wish, or an inside joke..."></textarea>
                {rewriteError && <p className="text-red-500 text-xs mt-1">{rewriteError}</p>}
              </div>

              {isEditMode && existingImages.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-brand-dark font-serif">Current Photos (click to remove)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-2 p-2 border border-slate-200 rounded-md">
                        {existingImages.map((imgUrl) => (
                            <div key={imgUrl} className="relative group aspect-square">
                                <img src={imgUrl} alt={`Existing photo`} className="h-full w-full object-cover rounded-md shadow-sm" />
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveExistingImage(imgUrl)}
                                    className="absolute inset-0 w-full h-full bg-black/60 flex items-center justify-center text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity rounded-md cursor-pointer"
                                    aria-label="Remove image"
                                >
                                    &#x2715;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
              )}
              
              {maxNewImages > 0 ? (
                <ImageUploader
                  onImagesChange={setImages}
                  onUploadingChange={setIsUploadingImages}
                  maxImages={maxNewImages}
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-brand-dark font-serif">Gift Photos</label>
                  <div className="mt-1 bg-slate-100 p-4 rounded-md text-sm text-slate-600 text-center">
                    You have reached the maximum of {MAX_TOTAL_IMAGES} photos. Remove an existing photo to add a new one.
                  </div>
                </div>
              )}
              
              <div className="bg-blue-100 p-3 rounded-lg text-sm text-blue-800">
                <p><strong>Important:</strong> This gift page can only be permanently deleted or edited from <strong>this device</strong>. Please keep the gift code safe to share with the recipient.</p>
              </div>
              
              {error && <p className="text-red-500 text-center">{error}</p>}
              
              <button type="submit" className="w-full bg-brand-gold text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors duration-300 disabled:bg-slate-400">
                {isUploadingImages ? 'Optimizing & Uploading...' : (isEditMode ? 'Update Gift' : 'Create Gift Page')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePage;