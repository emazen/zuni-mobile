// Script to fix Boğaziçi University type from private to public
// Run with: node scripts/fix-bogazici-university.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixBogaziciUniversity() {
  try {
    console.log('Searching for Boğaziçi University...');
    
    // Find Boğaziçi University with various name formats
    const universities = await prisma.university.findMany({
      where: {
        OR: [
          { name: { contains: 'Boğaziçi', mode: 'insensitive' } },
          { name: { contains: 'Bogazici', mode: 'insensitive' } },
          { shortName: { contains: 'Boğaziçi', mode: 'insensitive' } },
          { shortName: { contains: 'Bogazici', mode: 'insensitive' } },
        ],
      },
    });

    if (universities.length === 0) {
      console.log('No Boğaziçi University found in database.');
      return;
    }

    console.log(`Found ${universities.length} university(ies) matching Boğaziçi:`);
    universities.forEach(uni => {
      console.log(`  - ${uni.name} (${uni.shortName}): ${uni.type}`);
    });

    // Update all matching universities to public
    const result = await prisma.university.updateMany({
      where: {
        OR: [
          { name: { contains: 'Boğaziçi', mode: 'insensitive' } },
          { name: { contains: 'Bogazici', mode: 'insensitive' } },
          { shortName: { contains: 'Boğaziçi', mode: 'insensitive' } },
          { shortName: { contains: 'Bogazici', mode: 'insensitive' } },
        ],
      },
      data: {
        type: 'public',
      },
    });

    console.log(`\n✅ Updated ${result.count} university(ies) to type 'public' (devlet).`);
    
    // Verify the update
    const updated = await prisma.university.findMany({
      where: {
        OR: [
          { name: { contains: 'Boğaziçi', mode: 'insensitive' } },
          { name: { contains: 'Bogazici', mode: 'insensitive' } },
          { shortName: { contains: 'Boğaziçi', mode: 'insensitive' } },
          { shortName: { contains: 'Bogazici', mode: 'insensitive' } },
        ],
      },
    });

    console.log('\nUpdated universities:');
    updated.forEach(uni => {
      console.log(`  - ${uni.name} (${uni.shortName}): ${uni.type}`);
    });

  } catch (error) {
    console.error('Error updating university:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixBogaziciUniversity()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

