import { db } from "../server/db";
import { users } from "../shared/schema";

async function checkUsers() {
  console.log("🔍 Checking existing users in database...");

  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      status: users.status,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt
    }).from(users);

    console.log(`\n📊 Found ${allUsers.length} users:`);
    console.log("================================");

    if (allUsers.length === 0) {
      console.log("❌ No users found in database");
    } else {
      allUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email}`);
        console.log(`   Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Last Login: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}`);
        console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      });

      // Show admin users specifically
      const adminUsers = allUsers.filter(user => user.role === 'admin');
      console.log(`\n👑 Admin users: ${adminUsers.length}`);
      adminUsers.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.isActive ? 'Active' : 'Inactive'})`);
      });
    }

  } catch (error) {
    console.error("❌ Error checking users:", error);
  }

  process.exit(0);
}

checkUsers();