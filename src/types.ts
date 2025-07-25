export interface Gift {
  slug: string;
  recipientName: string;
  greeting: string;
  message: string;
  images: string[]; // Array of public image URLs from R2
  createdAt: string; // ISO date string
  editKey: string; // Secret key for editing/deleting
}

export interface GiftSummary {
  slug: string;
  recipientName: string;
  createdAt: string;
}

export interface CreatedGiftInfo {
  slug: string;
  editKey: string;
}

export interface GiftUpdatePayload {
  recipientName: string;
  greeting: string;
  message: string;
  images: string[];
}
