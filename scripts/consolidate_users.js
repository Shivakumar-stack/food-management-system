/**
 * Consolidate users to 150-200 by reassigning references to a smaller pool.
 * Strategy: Keep 50 donors, 50 volunteers, 50 NGOs, + admins.
 * Reassign all donation/volunteer/delivery/mealserver/inventorylog references
 * to this smaller pool.
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodbridge';
const KEEP_PER_ROLE = 50;

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // 1. Get current user counts by role
  const allUsers = await db.collection('users').find({}).toArray();
  const byRole = { donor: [], volunteer: [], ngo: [], admin: [] };
  allUsers.forEach(u => {
    const role = u.role || 'donor';
    if (byRole[role]) byRole[role].push(u);
    else byRole[role] = [u];
  });
  console.log('Current users by role:');
  Object.entries(byRole).forEach(([role, users]) => console.log(`  ${role}: ${users.length}`));

  // 2. Select users to keep: first N of each role + all admins
  const keepDonors = byRole.donor.slice(0, KEEP_PER_ROLE);
  const keepVolunteers = byRole.volunteer.slice(0, KEEP_PER_ROLE);
  const keepNgos = byRole.ngo.slice(0, KEEP_PER_ROLE);
  const keepAdmins = byRole.admin; // keep all admins

  const keepUsers = [...keepDonors, ...keepVolunteers, ...keepNgos, ...keepAdmins];
  const keepIds = new Set(keepUsers.map(u => u._id.toString()));

  console.log(`\nKeeping: ${keepDonors.length} donors, ${keepVolunteers.length} volunteers, ${keepNgos.length} NGOs, ${keepAdmins.length} admins = ${keepUsers.length} total`);

  const keepDonorIds = keepDonors.map(u => u._id);
  const keepVolunteerUserIds = keepVolunteers.map(u => u._id);
  const keepNgoIds = keepNgos.map(u => u._id);

  // 3. Reassign donations.donor_id to the kept donor pool
  const donations = await db.collection('donations').find({}).toArray();
  let fixed = 0;
  for (let i = 0; i < donations.length; i++) {
    const d = donations[i];
    if (!keepIds.has(d.donor_id?.toString())) {
      const newDonor = keepDonors[i % keepDonors.length];
      await db.collection('donations').updateOne(
        { _id: d._id },
        { $set: { donor_id: newDonor._id, donorName: newDonor.name || `${newDonor.firstName} ${newDonor.lastName}` } }
      );
      fixed++;
    }
  }
  console.log(`Reassigned ${fixed} donations to kept donor pool`);

  // 4. Reassign volunteers.user_id to kept volunteer users
  const volunteers = await db.collection('volunteers').find({}).toArray();
  fixed = 0;
  for (let i = 0; i < volunteers.length; i++) {
    const v = volunteers[i];
    if (!keepIds.has(v.user_id?.toString())) {
      const newUser = keepVolunteerUserIds[i % keepVolunteerUserIds.length];
      await db.collection('volunteers').updateOne(
        { _id: v._id },
        { $set: { user_id: newUser } }
      );
      fixed++;
    }
  }
  console.log(`Reassigned ${fixed} volunteers to kept volunteer user pool`);

  // 5. Reassign deliveries.ngo_id to kept NGO users
  const deliveries = await db.collection('deliveries').find({}).toArray();
  fixed = 0;
  for (let i = 0; i < deliveries.length; i++) {
    const d = deliveries[i];
    if (!keepIds.has(d.ngo_id?.toString())) {
      const newNgo = keepNgoIds[i % keepNgoIds.length];
      await db.collection('deliveries').updateOne(
        { _id: d._id },
        { $set: { ngo_id: newNgo } }
      );
      fixed++;
    }
  }
  console.log(`Reassigned ${fixed} deliveries.ngo_id to kept NGO pool`);

  // 6. Reassign mealservers.ngo_id to kept NGO users
  const mealservers = await db.collection('mealservers').find({}).toArray();
  fixed = 0;
  for (let i = 0; i < mealservers.length; i++) {
    const m = mealservers[i];
    if (!keepIds.has(m.ngo_id?.toString())) {
      const newNgo = keepNgoIds[i % keepNgoIds.length];
      await db.collection('mealservers').updateOne(
        { _id: m._id },
        { $set: { ngo_id: newNgo } }
      );
      fixed++;
    }
  }
  console.log(`Reassigned ${fixed} mealservers.ngo_id to kept NGO pool`);

  // 7. Reassign inventorylogs.loggedBy to kept NGO users
  const invLogs = await db.collection('inventorylogs').find({}).toArray();
  fixed = 0;
  for (let i = 0; i < invLogs.length; i++) {
    const inv = invLogs[i];
    if (inv.loggedBy && !keepIds.has(inv.loggedBy.toString())) {
      const newNgo = keepNgoIds[i % keepNgoIds.length];
      await db.collection('inventorylogs').updateOne(
        { _id: inv._id },
        { $set: { loggedBy: newNgo } }
      );
      fixed++;
    }
  }
  console.log(`Reassigned ${fixed} inventorylogs.loggedBy to kept pool`);

  // 8. Reassign pickups.volunteer and donor to kept pool
  const pickups = await db.collection('pickups').find({}).toArray();
  fixed = 0;
  for (const p of pickups) {
    const updates = {};
    if (p.volunteer && !keepIds.has(p.volunteer.toString())) {
      updates.volunteer = keepVolunteerUserIds[0];
    }
    if (p.donor && !keepIds.has(p.donor.toString())) {
      updates.donor = keepDonorIds[0];
    }
    if (p.donor_id && !keepIds.has(p.donor_id.toString())) {
      updates.donor_id = keepDonorIds[0];
    }
    if (Object.keys(updates).length > 0) {
      await db.collection('pickups').updateOne({ _id: p._id }, { $set: updates });
      fixed++;
    }
  }
  console.log(`Reassigned ${fixed} pickups to kept pool`);

  // 9. Reassign notifications.user
  const notifications = await db.collection('notifications').find({}).toArray();
  fixed = 0;
  for (const n of notifications) {
    if (n.user && !keepIds.has(n.user.toString())) {
      await db.collection('notifications').updateOne(
        { _id: n._id },
        { $set: { user: keepDonorIds[0] } }
      );
      fixed++;
    }
  }
  console.log(`Reassigned ${fixed} notifications.user to kept pool`);

  // 10. Delete all non-kept users
  const deleteResult = await db.collection('users').deleteMany({
    _id: { $nin: keepUsers.map(u => u._id) }
  });
  console.log(`\nDeleted ${deleteResult.deletedCount} excess users`);

  // 11. Final count
  const finalUserCount = await db.collection('users').countDocuments();
  console.log(`Final user count: ${finalUserCount}`);

  // 12. Quick validation
  console.log('\n=== FINAL VALIDATION ===');
  const userIds = new Set((await db.collection('users').find({}, { projection: { _id: 1 } }).toArray()).map(u => u._id.toString()));
  const volunteerIds = new Set((await db.collection('volunteers').find({}, { projection: { _id: 1 } }).toArray()).map(v => v._id.toString()));
  const donationIds = new Set((await db.collection('donations').find({}, { projection: { _id: 1 } }).toArray()).map(d => d._id.toString()));

  // donations → users
  let broken = 0;
  for (const d of await db.collection('donations').find({}, { projection: { donor_id: 1 } }).toArray()) {
    if (!userIds.has(d.donor_id?.toString())) broken++;
  }
  console.log(broken === 0 ? '  ✅ All donations → valid users' : `  ❌ ${broken} broken donation refs`);

  // deliveries → donations
  broken = 0;
  for (const d of await db.collection('deliveries').find({}, { projection: { donation_id: 1 } }).toArray()) {
    if (!donationIds.has(d.donation_id?.toString())) broken++;
  }
  console.log(broken === 0 ? '  ✅ All deliveries → valid donations' : `  ❌ ${broken} broken delivery refs`);

  // deliveries → volunteers
  broken = 0;
  for (const d of await db.collection('deliveries').find({}, { projection: { volunteer_id: 1 } }).toArray()) {
    if (!volunteerIds.has(d.volunteer_id?.toString())) broken++;
  }
  console.log(broken === 0 ? '  ✅ All deliveries → valid volunteers' : `  ❌ ${broken} broken delivery vol refs`);

  // volunteers → users
  broken = 0;
  for (const v of await db.collection('volunteers').find({}, { projection: { user_id: 1 } }).toArray()) {
    if (!userIds.has(v.user_id?.toString())) broken++;
  }
  console.log(broken === 0 ? '  ✅ All volunteers → valid users' : `  ❌ ${broken} broken volunteer refs`);

  // inventorylogs → donations
  broken = 0;
  for (const inv of await db.collection('inventorylogs').find({}, { projection: { donation_id: 1 } }).toArray()) {
    if (!donationIds.has(inv.donation_id?.toString())) broken++;
  }
  console.log(broken === 0 ? '  ✅ All inventorylogs → valid donations' : `  ❌ ${broken} broken invlog refs`);

  // Final counts
  console.log('\n=== FINAL COLLECTION COUNTS ===');
  const cols = ['users', 'donations', 'volunteers', 'deliveries', 'inventorylogs', 'mealservers', 'pickups', 'notifications'];
  for (const c of cols) {
    const count = await db.collection(c).countDocuments();
    console.log(`  ${c}: ${count}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
