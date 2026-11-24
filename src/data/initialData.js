export const ADULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
export const KIDS_SIZES = ['2-4Y', '5-8Y', '9-12Y', '13-16Y'];
export const ALL_FILTER_SIZES = [...ADULT_SIZES, ...KIDS_SIZES];

export const DEFAULT_CHANNEL = {
  name: 'Vastra Studio',
  handle: '@vastrastudio.official',
  bio: 'Exclusive Ladies & Boys Fashion Channel • Daily Designer Drops • All Sizes Available',
  verified: true,
  followersCount: 14280,
  isFollowing: false,
  avatar: '/images/avatar.jpg',
  banner: '/images/banner.jpg',
  whatsapp: '',
  adminPin: '1234',
  superAdminPin: '9999',
};

export const DEFAULT_ADMIN_PERMISSIONS = {
  canUpload: true,
  canEdit: true,
  canDelete: false,
  canManageCollections: true,
};

export const DEFAULT_ADMINS = [
  {
    id: 'admin-default',
    name: 'Main Admin',
    roleLabel: 'Store Admin',
    pin: '1234',
    active: true,
    permissions: {
      canUpload: true,
      canEdit: true,
      canDelete: true,
      canManageCollections: true,
    },
    createdAt: Date.now(),
  },
];

export const DEFAULT_COLLECTIONS = [
  {
    id: 'col-festive',
    name: 'Festive Royal',
    category: 'both',
    cover: '/images/ladies-1.jpg',
  },
  {
    id: 'col-street',
    name: 'Street Style',
    category: 'boys',
    cover: '/images/boys-1.jpg',
  },
  {
    id: 'col-western',
    name: 'Chic Western',
    category: 'ladies',
    cover: '/images/ladies-2.jpg',
  },
  {
    id: 'col-party',
    name: 'Party Edit',
    category: 'ladies',
    cover: '/images/ladies-3.jpg',
  },
  {
    id: 'col-summer',
    name: 'Summer Breeze',
    category: 'both',
    cover: '/images/boys-4.jpg',
  },
];

const now = Date.now();

export const DEFAULT_ITEMS = [
  {
    id: 'item-1',
    image: '/images/ladies-1.jpg',
    category: 'ladies',
    collectionId: 'col-festive',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    allSizes: true,
    likes: 428,
    liked: false,
    createdAt: now - 1000 * 60 * 60 * 1,
  },
  {
    id: 'item-2',
    image: '/images/boys-1.jpg',
    category: 'boys',
    collectionId: 'col-street',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    allSizes: false,
    likes: 312,
    liked: false,
    createdAt: now - 1000 * 60 * 60 * 2,
  },
  {
    id: 'item-3',
    image: '/images/ladies-2.jpg',
    category: 'ladies',
    collectionId: 'col-western',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'],
    allSizes: true,
    likes: 519,
    liked: false,
    createdAt: now - 1000 * 60 * 60 * 3,
  },
  {
    id: 'item-4',
    image: '/images/boys-3.jpg',
    category: 'boys',
    collectionId: 'col-festive',
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL', '9-12Y', '13-16Y'],
    allSizes: true,
    likes: 386,
    liked: false,
    createdAt: now - 1000 * 60 * 60 * 4,
  },
  {
    id: 'item-5',
    image: '/images/ladies-3.jpg',
    category: 'ladies',
    collectionId: 'col-party',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    allSizes: false,
    likes: 641,
    liked: false,
    createdAt: now - 1000 * 60 * 60 * 5,
  },
  {
    id: 'item-6',
    image: '/images/boys-2.jpg',
    category: 'boys',
    collectionId: 'col-street',
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '13-16Y'],
    allSizes: false,
    likes: 274,
    liked: false,
    createdAt: now - 1000 * 60 * 60 * 6,
  },
  {
    id: 'item-7',
    image: '/images/ladies-4.jpg',
    category: 'ladies',
    collectionId: 'col-summer',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'],
    allSizes: true,
    likes: 358,
    liked: false,
    createdAt: now - 1000 * 60 * 60 * 7,
  },
  {
    id: 'item-8',
    image: '/images/boys-4.jpg',
    category: 'boys',
    collectionId: 'col-summer',
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    allSizes: true,
    likes: 295,
    liked: false,
    createdAt: now - 1000 * 60 * 60 * 8,
  },
];

export function formatCount(num) {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(num);
}
