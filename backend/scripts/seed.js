import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tenant from '../src/models/Tenant.js';
import Page from '../src/models/Page.js';
import Navigation from '../src/models/Navigation.js';
import Theme from '../src/models/Theme.js';
import AdminUser from '../src/models/AdminUser.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

// Travel.ai Tenant Data
const travelTenant = {
  name: 'Travel.ai',
  domain: 'travel.ai',
  logo: 'https://via.placeholder.com/200x60/0066cc/ffffff?text=Travel.ai',
  theme: {
    colors: {
      primary: '#0066cc',
      secondary: '#00a8e8',
      text: '#1a1a1a',
      background: '#ffffff',
      accent: '#ff6b35'
    },
    typography: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      headingFont: 'Poppins, Inter, sans-serif',
      fontSize: '16px'
    }
  },
  settings: {
    language: 'en',
    timezone: 'UTC',
    currency: 'USD'
  }
};

// Travel.ai Pages
const travelPages = [
  {
    slug: 'home',
    title: 'Discover Your Next Adventure',
    isHome: true,
    content: `
      <h1>Welcome to Travel.ai</h1>
      <p>Your gateway to unforgettable journeys around the world. Discover hidden gems, plan your perfect trip, and create memories that last a lifetime.</p>
      <p>Whether you're seeking adventure, relaxation, or cultural experiences, we've got you covered with curated destinations and expert travel tips.</p>
    `,
    meta: {
      title: 'Travel.ai - Discover Your Next Adventure',
      description: 'Your gateway to unforgettable journeys. Discover hidden gems, plan your perfect trip, and create memories that last a lifetime.',
      keywords: ['travel', 'adventure', 'destinations', 'vacation', 'tourism', 'travel guide'],
      ogImage: 'https://via.placeholder.com/1200x630/0066cc/ffffff?text=Travel.ai'
    },
    uxLayout: {
      layout: 'StandardArticle',
      sections: [
        {
          type: 'hero',
          title: 'Discover Your Next Adventure',
          subtitle: 'Explore the world with confidence and create unforgettable memories',
          image: 'https://via.placeholder.com/1200x600/0066cc/ffffff?text=Travel+Adventure'
        },
        {
          type: 'paragraph',
          text: 'Your gateway to unforgettable journeys around the world. Discover hidden gems, plan your perfect trip, and create memories that last a lifetime.'
        },
        {
          type: 'grid',
          columns: 3,
          items: [
            {
              title: 'Exotic Destinations',
              text: 'Explore breathtaking locations from tropical beaches to mountain peaks.',
              image: 'https://via.placeholder.com/400x300/00a8e8/ffffff?text=Destinations'
            },
            {
              title: 'Travel Guides',
              text: 'Expert tips and insider knowledge to make your journey seamless.',
              image: 'https://via.placeholder.com/400x300/ff6b35/ffffff?text=Guides'
            },
            {
              title: 'Best Deals',
              text: 'Find the best prices on flights, hotels, and travel packages.',
              image: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Deals'
            }
          ]
        },
        {
          type: 'cta',
          text: 'Start Planning Your Trip',
          link: '/destinations',
          variant: 'primary'
        }
      ]
    }
  },
  {
    slug: 'destinations',
    title: 'Popular Destinations',
    isHome: false,
    content: `
      <h1>Popular Destinations</h1>
      <p>Explore our handpicked selection of the world's most beautiful and exciting destinations.</p>
      <p>From tropical paradises to historic cities, we've curated the best places to visit for every type of traveler.</p>
    `,
    meta: {
      title: 'Popular Destinations - Travel.ai',
      description: 'Explore our handpicked selection of the world\'s most beautiful destinations. From tropical paradises to historic cities.',
      keywords: ['destinations', 'travel destinations', 'places to visit', 'vacation spots', 'tourism'],
      ogImage: 'https://via.placeholder.com/1200x630/00a8e8/ffffff?text=Destinations'
    },
    uxLayout: {
      layout: 'ModernArticle',
      sections: [
        {
          type: 'hero',
          title: 'Popular Destinations',
          subtitle: 'Discover the world\'s most beautiful places'
        },
        {
          type: 'grid',
          columns: 2,
          items: [
            {
              title: 'Bali, Indonesia',
              text: 'Tropical paradise with stunning beaches, lush rice terraces, and vibrant culture. Perfect for relaxation and adventure.',
              image: 'https://via.placeholder.com/600x400/0066cc/ffffff?text=Bali'
            },
            {
              title: 'Santorini, Greece',
              text: 'Iconic white-washed buildings, breathtaking sunsets, and crystal-clear waters. A romantic destination like no other.',
              image: 'https://via.placeholder.com/600x400/00a8e8/ffffff?text=Santorini'
            },
            {
              title: 'Tokyo, Japan',
              text: 'A perfect blend of ancient traditions and cutting-edge technology. Experience the best of both worlds.',
              image: 'https://via.placeholder.com/600x400/ff6b35/ffffff?text=Tokyo'
            },
            {
              title: 'Paris, France',
              text: 'The City of Light offers world-class museums, iconic landmarks, and unparalleled cuisine.',
              image: 'https://via.placeholder.com/600x400/0066cc/ffffff?text=Paris'
            }
          ]
        },
        {
          type: 'cta',
          text: 'View All Destinations',
          link: '/contact',
          variant: 'secondary'
        }
      ]
    }
  },
  {
    slug: 'about',
    title: 'About Travel.ai',
    isHome: false,
    content: `
      <h1>About Travel.ai</h1>
      <p>We are passionate travelers dedicated to helping you discover the world's most amazing places.</p>
      <p>Our mission is to make travel planning easier, more enjoyable, and more accessible to everyone.</p>
      <h2>Our Story</h2>
      <p>Founded by a team of travel enthusiasts, Travel.ai was born from a simple idea: everyone deserves to experience the joy of travel.</p>
      <h2>What We Do</h2>
      <p>We provide comprehensive travel guides, destination recommendations, and expert tips to help you plan the perfect trip.</p>
    `,
    meta: {
      title: 'About Us - Travel.ai',
      description: 'Learn about Travel.ai - passionate travelers dedicated to helping you discover the world\'s most amazing places.',
      keywords: ['about', 'travel company', 'travel agency', 'travel guide'],
      ogImage: 'https://via.placeholder.com/1200x630/ff6b35/ffffff?text=About+Us'
    },
    uxLayout: {
      layout: 'StandardArticle',
      sections: [
        {
          type: 'hero',
          title: 'About Travel.ai',
          subtitle: 'Passionate travelers helping you discover the world'
        },
        {
          type: 'paragraph',
          text: 'We are passionate travelers dedicated to helping you discover the world\'s most amazing places. Our mission is to make travel planning easier, more enjoyable, and more accessible to everyone.'
        },
        {
          type: 'infoBox',
          title: 'Our Story',
          text: 'Founded by a team of travel enthusiasts, Travel.ai was born from a simple idea: everyone deserves to experience the joy of travel.',
          variant: 'info'
        },
        {
          type: 'featureList',
          items: [
            {
              title: 'Expert Travel Guides',
              description: 'Comprehensive guides written by experienced travelers and local experts.'
            },
            {
              title: 'Curated Destinations',
              description: 'Handpicked locations that offer unique experiences and unforgettable memories.'
            },
            {
              title: 'Best Deals',
              description: 'We help you find the best prices on flights, hotels, and travel packages.'
            },
            {
              title: '24/7 Support',
              description: 'Our team is always ready to help you plan your perfect trip.'
            }
          ]
        }
      ]
    }
  },
  {
    slug: 'travel-tips',
    title: 'Travel Tips & Guides',
    isHome: false,
    content: `
      <h1>Travel Tips & Guides</h1>
      <p>Expert advice to make your travels smoother, safer, and more enjoyable.</p>
      <p>From packing tips to cultural etiquette, we've got you covered.</p>
    `,
    meta: {
      title: 'Travel Tips & Guides - Travel.ai',
      description: 'Expert travel advice to make your journeys smoother, safer, and more enjoyable. From packing tips to cultural etiquette.',
      keywords: ['travel tips', 'travel guide', 'travel advice', 'travel planning', 'travel hacks'],
      ogImage: 'https://via.placeholder.com/1200x630/00a8e8/ffffff?text=Travel+Tips'
    },
    uxLayout: {
      layout: 'ModernArticle',
      sections: [
        {
          type: 'hero',
          title: 'Travel Tips & Guides',
          subtitle: 'Expert advice for smarter travel'
        },
        {
          type: 'grid',
          columns: 2,
          items: [
            {
              title: 'Packing Essentials',
              text: 'Learn what to pack for different destinations and climates. Our comprehensive packing lists ensure you never forget the essentials.',
              image: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Packing'
            },
            {
              title: 'Budget Travel',
              text: 'Discover how to travel on a budget without compromising on experiences. Tips for finding deals and saving money.',
              image: 'https://via.placeholder.com/400x300/00a8e8/ffffff?text=Budget'
            },
            {
              title: 'Safety Tips',
              text: 'Stay safe while traveling with our essential safety guidelines and travel insurance recommendations.',
              image: 'https://via.placeholder.com/400x300/ff6b35/ffffff?text=Safety'
            },
            {
              title: 'Cultural Etiquette',
              text: 'Respect local customs and traditions. Learn the do\'s and don\'ts for different cultures around the world.',
              image: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Culture'
            }
          ]
        }
      ]
    }
  },
  {
    slug: 'contact',
    title: 'Contact Us',
    isHome: false,
    content: `
      <h1>Get in Touch</h1>
      <p>Have questions about your next trip? We're here to help!</p>
      <p>Reach out to us through any of the following channels and we'll get back to you as soon as possible.</p>
    `,
    meta: {
      title: 'Contact Us - Travel.ai',
      description: 'Get in touch with Travel.ai. Have questions about your next trip? We\'re here to help!',
      keywords: ['contact', 'travel support', 'travel help', 'customer service'],
      ogImage: 'https://via.placeholder.com/1200x630/ff6b35/ffffff?text=Contact'
    },
    uxLayout: {
      layout: 'StandardArticle',
      sections: [
        {
          type: 'hero',
          title: 'Contact Us',
          subtitle: 'We\'re here to help you plan your perfect trip'
        },
        {
          type: 'paragraph',
          text: 'Have questions about your next trip? We\'re here to help! Reach out to us through any of the following channels and we\'ll get back to you as soon as possible.'
        },
        {
          type: 'grid',
          columns: 3,
          items: [
            {
              title: 'Email',
              text: 'hello@travel.ai',
              image: 'https://via.placeholder.com/300x200/0066cc/ffffff?text=Email'
            },
            {
              title: 'Phone',
              text: '+1 (555) 123-4567',
              image: 'https://via.placeholder.com/300x200/00a8e8/ffffff?text=Phone'
            },
            {
              title: 'Office',
              text: '123 Travel Street, Suite 100, New York, NY 10001',
              image: 'https://via.placeholder.com/300x200/ff6b35/ffffff?text=Office'
            }
          ]
        },
        {
          type: 'cta',
          text: 'Send Us a Message',
          link: 'mailto:hello@travel.ai',
          variant: 'primary'
        }
      ]
    }
  }
];

// Travel.ai Navigation
const travelNavigation = {
  menu: [
    { label: 'Home', slug: 'home' },
    { label: 'Destinations', slug: 'destinations' },
    { label: 'Travel Tips', slug: 'travel-tips' },
    { label: 'About', slug: 'about' },
    { label: 'Contact', slug: 'contact' }
  ],
  cta: {
    label: 'Plan Your Trip',
    url: '/destinations'
  }
};

async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data for travel.ai (optional - comment out if you want to keep other tenants)
    console.log('\n🗑️  Clearing existing travel.ai data...');
    const existingTenant = await Tenant.findOne({ domain: 'travel.ai' });
    if (existingTenant) {
      await Page.deleteMany({ tenantId: existingTenant._id });
      await Navigation.deleteOne({ tenantId: existingTenant._id });
      await Tenant.deleteOne({ domain: 'travel.ai' });
      console.log('✅ Existing travel.ai data cleared');
    }

    // Create Travel.ai Tenant
    console.log('\n🏢 Creating Travel.ai tenant...');
    const createdTenant = await Tenant.create(travelTenant);
    console.log(`✅ Created tenant: ${createdTenant.name} (${createdTenant.domain})`);

    // Create Pages for Travel.ai
    console.log('\n📄 Creating pages for Travel.ai...');
    const pagesWithTenant = travelPages.map(page => ({
      ...page,
      tenantId: createdTenant._id
    }));
    const createdPages = await Page.insertMany(pagesWithTenant);
    console.log(`✅ Created ${createdPages.length} pages:`);
    createdPages.forEach(page => {
      console.log(`  - ${page.slug} (${page.isHome ? 'Homepage' : 'Page'})`);
    });

    // Create Navigation for Travel.ai
    console.log('\n🧭 Creating navigation for Travel.ai...');
    const navigation = await Navigation.create({
      tenantId: createdTenant._id,
      logo: travelTenant.logo,
      menu: travelNavigation.menu,
      cta: travelNavigation.cta
    });
    console.log(`✅ Created navigation with ${navigation.menu.length} menu items`);

    // Create Admin User (if doesn't exist)
    console.log('\n👤 Checking admin user...');
    const existingAdmin = await AdminUser.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('  ⚠️  Admin user already exists, skipping...');
    } else {
      const admin = new AdminUser({
        email: 'admin@example.com',
        password: 'admin123', // Will be hashed automatically
        name: 'Admin User',
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Created admin user (email: admin@example.com, password: admin123)');
    }

    // Summary
    console.log('\n📊 Seed Summary:');
    console.log(`  Tenant: ${createdTenant.name} (${createdTenant.domain})`);
    console.log(`  Pages: ${createdPages.length}`);
    console.log(`  Navigation: ${navigation.menu.length} menu items`);
    console.log(`  Logo: ${createdTenant.logo ? 'Yes' : 'No'}`);
    console.log(`  Theme: Configured with travel colors`);
    console.log('\n✨ Travel.ai database seeded successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    console.log('\n🌐 Test Domain:');
    console.log(`  - ${createdTenant.domain} (${createdTenant.name})`);
    console.log('\n📄 Available Pages:');
    createdPages.forEach(page => {
      console.log(`  - /${page.slug === 'home' ? '' : page.slug} (${page.title})`);
    });
    console.log('\n💡 To test in Next.js frontend:');
    console.log(`  http://localhost:3000?domain=${createdTenant.domain}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run seed
seedDatabase()
  .then(() => {
    console.log('\n✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  });
