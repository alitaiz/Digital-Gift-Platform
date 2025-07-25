import React, { createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { useGifts } from './hooks/useGifts';
import { Gift, CreatedGiftInfo, GiftUpdatePayload, GiftSummary } from './types';
import StartPage from './pages/StartPage';
import CreatePage from './pages/CreatePage';
import GiftPage from './pages/GiftPage';
import ListPage from './pages/ListPage';
import RecoverPage from './pages/RecoverPage';
import { GiftIcon } from './components/ui';


interface GiftsContextType {
  loading: boolean;
  addGift: (giftData: { recipientName: string; greeting: string; message: string; images: string[]; slug?: string; }) => Promise<{ success: boolean; error?: string; slug?: string }>;
  getGiftBySlug: (slug: string) => Promise<Omit<Gift, 'editKey'> | undefined>;
  getGiftSummaries: (slugs: string[]) => Promise<GiftSummary[]>;
  deleteGift: (slug: string, editKey: string) => Promise<{ success: boolean; error?: string }>;
  updateGift: (slug: string, editKey: string, data: GiftUpdatePayload) => Promise<{ success: boolean; error?: string; }>;
  generateSlug: (name: string) => string;
  getAllSlugs: () => string[];
  getCreatedGifts: () => CreatedGiftInfo[];
  removeVisitedSlug: (slug: string) => void;
}

const GiftsContext = createContext<GiftsContextType | undefined>(undefined);

export const useGiftsContext = () => {
  const context = useContext(GiftsContext);
  if (!context) {
    throw new Error('useGiftsContext must be used within a GiftsProvider');
  }
  return context;
};

const GiftsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const giftsData = useGifts();
  return (
    <GiftsContext.Provider value={giftsData}>
      {children}
    </GiftsContext.Provider>
  );
};

const Header = () => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    return (
        <header className={`fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${isHomePage ? 'bg-transparent' : 'bg-brand-cream/60 backdrop-blur-sm shadow-sm'}`}>
            <nav className="container mx-auto px-6 py-3 flex justify-center items-center">
                <Link to="/" className="flex items-center space-x-3 text-brand-dark group">
                    <GiftIcon className="w-7 h-7 text-brand-gold transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-serif text-2xl font-bold group-hover:text-brand-gold transition-colors">A Gift For You</span>
                </Link>
            </nav>
        </header>
    );
};

const AppLayout: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow">
                <Outlet />
            </main>
            <footer className="text-center py-4 text-brand-navy/70 text-sm">
                <p>A thoughtful gift, made with love. ❤️</p>
            </footer>
        </div>
    );
};

const NotFoundPage = () => (
    <div className="min-h-screen flex items-center justify-center text-center px-4 pt-20">
        <div>
            <h1 className="text-4xl font-bold font-serif text-brand-navy">404 - Page Not Found</h1>
            <p className="mt-4 text-lg text-slate-600">The gift page you are looking for does not exist.</p>
            <Link to="/" className="mt-8 inline-block bg-brand-gold text-white font-bold py-2 px-4 rounded-full hover:bg-opacity-80 transition-colors duration-300">
                Return Home
            </Link>
        </div>
    </div>
);

function App() {
  return (
    <GiftsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<StartPage />} />
            <Route path="create" element={<CreatePage />} />
            <Route path="edit/:slug" element={<CreatePage />} />
            <Route path="gift/:slug" element={<GiftPage />} />
            <Route path="list" element={<ListPage />} />
            <Route path="recover" element={<RecoverPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GiftsProvider>
  );
}

export default App;
