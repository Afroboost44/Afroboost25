import { comprehensiveFAQs } from './seedData';
import { faqService } from './database';

export async function seedFAQs() {
  try {
    console.log('Starting FAQ seeding...');
    
    for (let i = 0; i < comprehensiveFAQs.length; i++) {
      const faq = comprehensiveFAQs[i];
      await faqService.create(faq);
      console.log(`Seeded FAQ ${i + 1}/${comprehensiveFAQs.length}: ${faq.question}`);
    }
    
    console.log('✅ FAQ seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error seeding FAQs:', error);
    return false;
  }
}

// If this script is run directly
if (typeof window === 'undefined') {
  seedFAQs().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
